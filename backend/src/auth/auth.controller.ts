import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { Get, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from './guards/jwt-auth/jwt-auth.guard';
import { GetUser } from './decorators/get-user.decorator';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { VerifyEmailDto } from "./dto/verify-email.dto";
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    @Post('register')
    register(@Body() registerDto: RegisterDto) {
        return this.authService.register(registerDto);
    }

    @Post('verify-email')
    verifyEmail(
        @Body() verifyEmailDto: VerifyEmailDto,
    ) {
        return this.authService.verifyEmail(
            verifyEmailDto.email,
            verifyEmailDto.otp,
        );
    }

    @Post('resend-otp')
    resendOtp(@Body('email') email: string) {
        return this.authService.resendOtp(email);
    }

    @Post('forgot-password')
    forgotPassword(@Body() dto: ForgotPasswordDto) {
        return this.authService.forgotPassword(dto.email);
    }

    @Post('verify-reset-otp')
    verifyResetOtp(@Body() dto: VerifyEmailDto) {
        return this.authService.verifyResetOtp(dto.email, dto.otp);
    }

    @Post('reset-password')
    resetPassword(@Body() dto: ResetPasswordDto) {
        return this.authService.resetPassword(dto.email, dto.otp, dto.newPassword);
    }
    @Post('login')
    login(@Body() loginDto: LoginDto) {
        return this.authService.login(loginDto);
    }

    @Get('profile')
    @UseGuards(JwtAuthGuard)
    getProfile(@GetUser() user: any) {
        return user;
    }

    @Post('refresh')
    refresh(@Body() dto: RefreshTokenDto) {
        return this.authService.refreshTokens(dto.refreshToken);
    }

    @Post('logout')
    @UseGuards(JwtAuthGuard)
    logout(@GetUser() user: any) {
        return this.authService.logout(user.userId);
    }
}