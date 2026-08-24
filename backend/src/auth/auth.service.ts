import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { EmailService } from '../email/email.service';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

const MAX_ATTEMPTS = 5;
const BLOCK_DURATION_MS = 24 * 60 * 60 * 1000; // 24h

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException('Un compte existe déjà avec cet email');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 12);
    const verificationToken = randomBytes(32).toString('hex');

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        full_name: dto.full_name,
        password: hashedPassword,
        verification_token: verificationToken,
      },
    });

    this.emailService.sendVerificationEmail(user.email, verificationToken).catch(() => {});

    return this.buildTokenAndUser(user);
  }

  async login(dto: LoginDto, ip?: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user || !user.password) {
      await this.logAttempt(dto.email, ip, false, 'Compte inexistant');
      throw new UnauthorizedException('Email ou mot de passe incorrect');
    }

    if (user.blocked_until && user.blocked_until > new Date()) {
      const minutesLeft = Math.ceil((user.blocked_until.getTime() - Date.now()) / 60000);
      await this.logAttempt(dto.email, ip, false, 'Compte bloqué');
      throw new UnauthorizedException(
        `Compte temporairement bloqué. Réessayez dans ${minutesLeft} minute${minutesLeft > 1 ? 's' : ''}.`,
      );
    }

    const isValid = await bcrypt.compare(dto.password, user.password);

    if (!isValid) {
      const attempts = user.failed_login_attempts + 1;
      const isNowBlocked = attempts >= MAX_ATTEMPTS;

      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          failed_login_attempts: attempts,
          ...(isNowBlocked && { blocked_until: new Date(Date.now() + BLOCK_DURATION_MS) }),
        },
      });

      const reason = isNowBlocked
        ? `Compte bloqué après ${MAX_ATTEMPTS} tentatives`
        : `Mot de passe incorrect (tentative ${attempts}/${MAX_ATTEMPTS})`;
      await this.logAttempt(dto.email, ip, false, reason);

      if (isNowBlocked) {
        throw new UnauthorizedException(
          `Compte bloqué après ${MAX_ATTEMPTS} tentatives échouées. Réessayez dans 24 heures.`,
        );
      }

      const remaining = MAX_ATTEMPTS - attempts;
      throw new UnauthorizedException(
        `Email ou mot de passe incorrect. ${remaining} tentative${remaining > 1 ? 's' : ''} restante${remaining > 1 ? 's' : ''}.`,
      );
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { failed_login_attempts: 0, blocked_until: null },
    });

    await this.logAttempt(dto.email, ip, true, null);

    return this.buildTokenAndUser(user);
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    return this.formatUser(user);
  }

  async verifyEmail(token: string) {
    const user = await this.prisma.user.findFirst({ where: { verification_token: token } });
    if (!user) throw new BadRequestException('Lien de vérification invalide ou expiré.');
    await this.prisma.user.update({
      where: { id: user.id },
      data: { email_verified: true, verification_token: null },
    });
    return { message: 'Email vérifié avec succès.' };
  }

  async resendVerification(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    if (user.email_verified) throw new BadRequestException('Email déjà vérifié.');
    const token = randomBytes(32).toString('hex');
    await this.prisma.user.update({ where: { id: userId }, data: { verification_token: token } });
    await this.emailService.sendVerificationEmail(user.email, token);
    return { message: 'Email de vérification renvoyé.' };
  }

  async getLoginAttempts(limit = 100) {
    return this.prisma.loginAttempt.findMany({
      orderBy: { created_at: 'desc' },
      take: limit,
    });
  }

  private async logAttempt(email: string, ip: string | undefined, success: boolean, reason: string | null) {
    await this.prisma.loginAttempt.create({
      data: {
        id: Math.random().toString(36).slice(2) + Date.now().toString(36),
        email,
        ip_address: ip ?? null,
        success,
        reason,
      },
    });
  }

  async refresh(refreshToken: string) {
    try {
      const payload = this.jwtService.verify<{ sub: string; email: string; type?: string }>(refreshToken);
      if (payload.type !== 'refresh') throw new Error();
      const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
      if (!user) throw new Error();
      if (user.blocked_until && user.blocked_until > new Date()) throw new Error();
      return this.buildTokenAndUser(user);
    } catch {
      throw new UnauthorizedException('Session expirée, veuillez vous reconnecter.');
    }
  }

  private buildTokenAndUser(user: {
    id: string;
    email: string;
    full_name?: string | null;
    role: string | null;
    email_verified?: boolean;
    stych_connected_at?: Date | null;
  }) {
    const payload = { sub: user.id, email: user.email };
    const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });
    const refreshToken = this.jwtService.sign({ ...payload, type: 'refresh' }, { expiresIn: '30d' });
    return { accessToken, refreshToken, user: this.formatUser(user) };
  }

  private formatUser(user: {
    id: string;
    email: string;
    full_name?: string | null;
    role?: string | null;
    email_verified?: boolean;
    stych_connected_at?: Date | null;
  }) {
    return {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      email_verified: user.email_verified ?? false,
      stych_connected: !!user.stych_connected_at,
    };
  }
}
