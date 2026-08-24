import { BadRequestException, Body, Controller, Get, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { AdminGuard } from './admin.guard';

const ACCESS_COOKIE = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 15 * 60 * 1000, // 15 minutes
  path: '/',
};

const REFRESH_COOKIE = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 jours
  path: '/',
};

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Throttle({ auth: { ttl: 60000, limit: 10 } })
  @Post('register')
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const { accessToken, refreshToken, user } = await this.authService.register(dto);
    res.cookie('jwt', accessToken, ACCESS_COOKIE);
    res.cookie('refresh_token', refreshToken, REFRESH_COOKIE);
    return { user };
  }

  @Throttle({ auth: { ttl: 60000, limit: 10 } })
  @Post('login')
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response, @Req() req: any) {
    const ip = req.headers['x-forwarded-for']?.split(',')[0] ?? req.ip;
    const { accessToken, refreshToken, user } = await this.authService.login(dto, ip);
    res.cookie('jwt', accessToken, ACCESS_COOKIE);
    res.cookie('refresh_token', refreshToken, REFRESH_COOKIE);
    return { user };
  }

  @Post('refresh')
  async refresh(@Req() req: any, @Res({ passthrough: true }) res: Response) {
    const { accessToken, refreshToken, user } = await this.authService.refresh(req.cookies?.refresh_token);
    res.cookie('jwt', accessToken, ACCESS_COOKIE);
    res.cookie('refresh_token', refreshToken, REFRESH_COOKIE);
    return { user };
  }

  @Get('verify-email')
  verifyEmail(@Query('token') token: string) {
    if (!token) throw new BadRequestException('Lien de vérification invalide ou expiré.');
    return this.authService.verifyEmail(token);
  }

  @Throttle({ auth: { ttl: 60000, limit: 3 } })
  @UseGuards(JwtAuthGuard)
  @Post('resend-verification')
  resendVerification(@Req() req: any) {
    return this.authService.resendVerification(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMe(@Req() req: any) {
    return this.authService.getMe(req.user.id);
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('jwt', { path: '/' });
    res.clearCookie('refresh_token', { path: '/' });
    return { message: 'Déconnecté' };
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('login-attempts')
  getLoginAttempts(@Query('limit') limit?: string) {
    return this.authService.getLoginAttempts(limit ? parseInt(limit) : 100);
  }
}
