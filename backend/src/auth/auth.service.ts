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

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) { }

  async register(registerDto: RegisterDto) {
    const { fullName, email, password } = registerDto;

    const existingUser = await this.prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (existingUser) {
      throw new BadRequestException('Email already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await this.prisma.user.create({
      data: {
        fullName,
        email,
        password: hashedPassword,
      },
    });

    const { password: _, ...result } = user;

    return {
      message: 'User registered successfully',
      user: result,
    };
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