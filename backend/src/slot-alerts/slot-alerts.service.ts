import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SlotAlertsService {
  constructor(private readonly prisma: PrismaService) {}

  findAllForUser(userId: string) {
    return this.prisma.slotAlert.findMany({
      where: { user_id: userId },
      orderBy: { detected_at: 'desc' },
      take: 50,
    });
  }

  async findLatestActiveForUser(userId: string) {
    await this.expireStale(userId);
    return this.prisma.slotAlert.findFirst({
      where: { user_id: userId, status: { in: ['NOUVEAU', 'NOTIFIE'] } },
      orderBy: { detected_at: 'desc' },
    });
  }

  /** Tous les créneaux actuellement disponibles (non réservés/expirés/manqués) — panneau de notifications. */
  async findActiveForUser(userId: string) {
    await this.expireStale(userId);
    return this.prisma.slotAlert.findMany({
      where: { user_id: userId, status: { in: ['NOUVEAU', 'NOTIFIE'] } },
      orderBy: { course_date: 'asc' },
    });
  }

  /** Un cours dont la date est passée n'est plus réservable — on ne veut jamais l'afficher comme "actif" indéfiniment. */
  private async expireStale(userId: string): Promise<void> {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    await this.prisma.slotAlert.updateMany({
      where: { user_id: userId, status: { in: ['NOUVEAU', 'NOTIFIE'] }, course_date: { lt: startOfToday } },
      data: { status: 'EXPIRE' },
    });
  }
}
