import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { Get, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from './guards/jwt-auth/jwt-auth.guard';
import { GetUser } from './decorators/get-user.decorator';
import { RefreshTokenDto } from './dto/refresh-token.dto';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    @Post('register')
    register(@Body() registerDto: RegisterDto) {
        return this.authService.register(registerDto);
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