import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import {ForbiddenException} from '@nestjs/common/exceptions/forbidden.exception';
import {MailService} from "../mail/mail.service";

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private mailService: MailService,
  ) { }

  async register(registerDto: RegisterDto) {
    const { fullName, email, password } = registerDto;

    const existingUser = await this.prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (existingUser) {
      if (existingUser.isVerified) {
        throw new BadRequestException('Email already exists');
      }
      // Unverified — resend OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      await this.prisma.user.update({
        where: { email },
        data: {
          fullName,
          password: await bcrypt.hash(password, 10),
          emailOtp: otp,
          emailOtpExpiresAt: new Date(Date.now() + 5 * 60 * 1000),
        },
      });
      await this.mailService.sendOtpEmail(email, otp);
      return { message: 'Verification code resent to your email' };
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    const user = await this.prisma.user.create({
      data: {
        fullName,
        email,
        password: hashedPassword,
        emailOtp: otp,
        emailOtpExpiresAt: new Date(Date.now() + 5 * 60 * 1000),
      },
    });

    await this.mailService.sendOtpEmail(user.email, otp);

    const { password: _, ...result } = user;

    return {
      message: 'User registered successfully',
      user: result,
    };
    
  }
  async verifyEmail(email: string, otp: string) {
  const user = await this.prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (!user) {
    throw new BadRequestException('User not found');
  }

  if (user.isVerified) {
    throw new BadRequestException('Email already verified');
  }

  if (!user.emailOtpExpiresAt || user.emailOtpExpiresAt < new Date()) {
    throw new BadRequestException('OTP has expired. Please request a new one.');
  }

  if (user.emailOtp !== otp) {
    throw new BadRequestException('Invalid OTP');
  }

  await this.prisma.user.update({
    where: {
      email,
    },
    data: {
      isVerified: true,
      emailOtp: null,
      emailOtpExpiresAt: null,
    },
  });

  return {
    message: 'Email verified successfully',
  };
}

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.isVerified) {
      // Don't reveal whether email exists
      return { message: 'If that email exists, a reset code has been sent.' };
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await this.prisma.user.update({
      where: { email },
      data: {
        emailOtp: otp,
        emailOtpExpiresAt: new Date(Date.now() + 5 * 60 * 1000),
      },
    });
    await this.mailService.sendResetOtpEmail(email, otp);
    return { message: 'If that email exists, a reset code has been sent.' };
  }

  async verifyResetOtp(email: string, otp: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new BadRequestException('User not found');

    if (!user.emailOtpExpiresAt || user.emailOtpExpiresAt < new Date()) {
      throw new BadRequestException('OTP has expired. Please request a new one.');
    }
    if (user.emailOtp !== otp) {
      throw new BadRequestException('Invalid OTP');
    }

    return { message: 'OTP verified' };
  }

  async resetPassword(email: string, otp: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new BadRequestException('User not found');

    if (!user.emailOtpExpiresAt || user.emailOtpExpiresAt < new Date()) {
      throw new BadRequestException('OTP has expired. Please request a new one.');
    }
    if (user.emailOtp !== otp) {
      throw new BadRequestException('Invalid OTP');
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { email },
      data: {
        password: hashed,
        emailOtp: null,
        emailOtpExpiresAt: null,
      },
    });
    return { message: 'Password reset successfully' };
  }

  async resendOtp(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) {
      throw new BadRequestException('User not found');
    }
    if (user.isVerified) {
      throw new BadRequestException('Email already verified');
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await this.prisma.user.update({
      where: { email },
      data: {
        emailOtp: otp,
        emailOtpExpiresAt: new Date(Date.now() + 5 * 60 * 1000),
      },
    });
    await this.mailService.sendOtpEmail(email, otp);
    return { message: 'Verification code sent to your email' };
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    const user = await this.prisma.user.findUnique({
      where: {
        email,
      },
    });


    if (!user) {
      throw new BadRequestException('Invalid email or password');
    }

    if (user.isBlocked) {
      throw new ForbiddenException(
        'Your account has been blocked by the administrator.',
      );
    }
    if (!user.isVerified) {
  throw new BadRequestException(
    'Please verify your email before logging in.',
  );
}
    const isPasswordValid = await bcrypt.compare(
      password,
      user.password,
    );

    if (!isPasswordValid) {
      throw new BadRequestException('Invalid email or password');
    }

    const tokens = await this.generateTokens(
      user.id,
      user.email,
      user.role,
    );

    await this.updateRefreshTokenId(
      user.id,
      tokens.refreshTokenId,
    );

    return {
      message: 'Login successful',
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
      },
    };
  }

  private async generateTokens(
    userId: string,
    email: string,
    role: string,
  ) {
    const refreshTokenId = uuidv4();

    const accessPayload = {
      sub: userId,
      email,
      role,
    };

    const refreshPayload = {
      sub: userId,
      email,
      role,
      jti: refreshTokenId,
    };

    const accessToken = this.jwtService.sign(accessPayload, {
      secret: process.env.JWT_SECRET!,
      expiresIn: '15m',
    });

    const refreshToken = this.jwtService.sign(refreshPayload, {
      secret: process.env.JWT_REFRESH_SECRET!,
      expiresIn: '7d',
    });

    return {
      accessToken,
      refreshToken,
      refreshTokenId,
    };
  }

  private async updateRefreshTokenId(
    userId: string,
    refreshTokenId: string,
  ) {
    await this.prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        refreshTokenId: refreshTokenId,
      },
    });
  }

  async refreshTokens(refreshToken: string) {
    try {
      console.log('\n========== REFRESH ==========');
      console.log('Incoming Token');
      console.log(refreshToken);

      const payload = this.jwtService.verify(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET!,
      });

      const user = await this.prisma.user.findUnique({
        where: {
          id: payload.sub,
        },
      });

      console.log('\nStore Refresh Token ID');
      console.log(user?.refreshTokenId);

      if (!user || !user.refreshTokenId) {
        throw new BadRequestException('Access Denied');
      }
      if (payload.jti !== user?.refreshTokenId) {
        throw new BadRequestException('Access Denied');
      }
      const tokens = await this.generateTokens(
        user.id,
        user.email,
        user.role,
      );

      console.log('\nOld Token');
      console.log(refreshToken);

      console.log('\nNew Token');
      console.log(tokens.refreshToken);

      console.log(
        '\nAre Same?',
        refreshToken === tokens.refreshToken,
      );

      await this.updateRefreshTokenId(
        user.id,
        tokens.refreshTokenId,
      );

      const verifyUser = await this.prisma.user.findUnique({
        where: {
          id: user.id,
        },
        select: {
          refreshTokenId: true,
        },
      });

      console.log('\nDB After Update');
      console.log(verifyUser?.refreshTokenId);

      console.log('========== END ==========\n');

      return tokens;
    } catch (error) {
      console.error('\nREFRESH ERROR');
      console.error(error);
      throw error;
    }
  }

  async logout(userId: string) {
    await this.prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        refreshTokenId: null,
      },
    });

    return {
      message: 'Logged out successfully',
    };
  }
}