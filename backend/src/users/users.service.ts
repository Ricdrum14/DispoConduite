import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { UpdateMeDto } from './dto/update-me.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  // Ne jamais renvoyer password / stych_session_cookie / stych_csrf_token /
  // verification_token — même à un admin, ce sont des secrets (dont un
  // cookie de session Stych en clair, équivalent à un accès au compte élève).
  async findAll() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        full_name: true,
        role: true,
        email_verified: true,
        failed_login_attempts: true,
        blocked_until: true,
        created_at: true,
        stych_connected_at: true,
        stych_session_expired_at: true,
        stych_agence: true,
        stych_polling_paused: true,
      },
    });
  }

  async updateMe(userId: string, dto: UpdateMeDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();

    const data: any = {};

    // Changer d'email retire la vérification en cours — l'ancienne adresse
    // était peut-être la seule qu'on ait jamais réellement confirmée.
    if (dto.email && dto.email !== user.email) {
      const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
      if (existing) throw new ConflictException('Un compte existe déjà avec cet email');
      data.email = dto.email;
      data.email_verified = false;
      data.verification_token = randomBytes(32).toString('hex');
    }

    if (dto.new_password) {
      if (!dto.current_password) {
        throw new BadRequestException('Le mot de passe actuel est requis');
      }
      const valid = await bcrypt.compare(dto.current_password, user.password ?? '');
      if (!valid) {
        throw new BadRequestException('Mot de passe actuel incorrect');
      }
      data.password = await bcrypt.hash(dto.new_password, 12);
    }

    const updated = await this.prisma.user.update({ where: { id: userId }, data });

    if (data.verification_token) {
      await this.emailService.sendVerificationEmail(updated.email, data.verification_token);
    }

    const { password: _pw, ...safeUser } = updated;
    return safeUser;
  }
}
