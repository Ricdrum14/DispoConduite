import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { StychService } from '../stych/stych.service';
import { StychClientService } from '../stych/stych-client.service';
import { EmailService } from '../email/email.service';
import { StychSlot } from '../stych/types/stych-api.types';
import { StychSessionExpiredError } from '../stych/errors/stych-session-expired.error';
import { resolveLieuName } from '../stych/lieu-resolver';

/**
 * Implémente le workflow "stychPoller" du cahier des charges : toutes les
 * N minutes (5-15 min recommandées, cf. §7 "interroger, pas déranger"), pour
 * chaque utilisateur connecté à Stych, on récupère les créneaux dispo et on
 * les compare à son SearchProfile actif. Un nouveau créneau matché déclenche
 * une SlotAlert + une notification, prête pour confirmation en un tap
 * (mode semi-automatique du MVP, cf. §6).
 */
@Injectable()
export class PollingService implements OnModuleInit {
  private readonly logger = new Logger(PollingService.name);
  private readonly INTERVAL_NAME = 'stych-poll';

  constructor(
    private readonly config: ConfigService,
    private readonly scheduler: SchedulerRegistry,
    private readonly prisma: PrismaService,
    private readonly stychService: StychService,
    private readonly stychClient: StychClientService,
    private readonly emailService: EmailService,
  ) {}

  onModuleInit() {
    const minutes = this.config.get<number>('STYCH_POLL_INTERVAL_MINUTES') ?? 10;
    const interval = setInterval(() => {
      this.pollAllUsers().catch((err) => this.logger.error('Cycle de veille échoué', err));
    }, minutes * 60 * 1000);
    this.scheduler.addInterval(this.INTERVAL_NAME, interval);
    this.logger.log(`Veille Stych programmée toutes les ${minutes} min`);
  }

  /**
   * Vérification immédiate pour un seul utilisateur — appelée juste après
   * une reconnexion Stych, pour ne pas faire attendre jusqu'à 10 min le
   * prochain passage du cycle programmé (qui tourne sur une horloge fixe
   * calée sur le démarrage du serveur, pas sur l'instant de connexion).
   */
  async pollUserNow(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { search_profiles: { where: { is_active: true } } },
    });
    if (!user || !user.stych_session_cookie || user.stych_polling_paused) return;
    await this.pollUser(user.id, user.search_profiles);
  }

  async pollAllUsers() {
    const users = await this.prisma.user.findMany({
      where: { stych_session_cookie: { not: null }, stych_polling_paused: false },
      include: { search_profiles: { where: { is_active: true } } },
    });

    for (const user of users) {
      // pollUser gère déjà ses propres erreurs, mais si SA gestion d'erreur
      // échoue à son tour (ex: blip DB pile en écrivant le PollingLog), on ne
      // veut surtout pas que ça saute hors de la boucle et saute tous les
      // utilisateurs suivants pour ce cycle — chaque utilisateur doit être
      // totalement isolé des autres.
      await this.pollUser(user.id, user.search_profiles).catch((err) =>
        this.logger.error(`Échec inattendu (hors try/catch interne) pour l'utilisateur ${user.id}`, err),
      );
    }
  }

  private async pollUser(userId: string, activeProfiles: { id: string; days: number[]; time_slots: any[]; moniteur_id: string | null }[]) {
    try {
      const session = await this.stychService.getSessionOrThrow(userId);
      const { slots, pointsDeCours } = await this.stychClient.fetchAvailableSlots(session);

      await this.markGoneAlerts(userId, slots);

      let created = 0;
      for (const profile of activeProfiles) {
        const matching = slots.filter((slot) => StychService.matchesProfile(slot, profile));
        for (const slot of matching) {
          const isNew = await this.createAlertIfNew(userId, profile.id, slot, pointsDeCours);
          if (isNew) created += 1;
        }
      }

      await this.prisma.pollingLog.create({
        data: { user_id: userId, slots_found: slots.length, success: true },
      });

      if (created > 0) {
        this.logger.log(`${created} nouvelle(s) alerte(s) pour l'utilisateur ${userId}`);
      }
    } catch (err: any) {
      await this.prisma.pollingLog.create({
        data: { user_id: userId, slots_found: 0, success: false, error_message: String(err?.message ?? err) },
      });

      if (err instanceof StychSessionExpiredError) {
        await this.stychService.markSessionExpired(userId);
        const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
        await this.emailService.sendSessionExpiredEmail(user.email);
        this.logger.warn(`Session Stych expirée pour l'utilisateur ${userId} — reconnexion nécessaire`);
        return;
      }

      this.logger.warn(`Veille échouée pour l'utilisateur ${userId}: ${err?.message ?? err}`);
    }
  }

  /**
   * Symétrique de createAlertIfNew : si une alerte encore "active" en base
   * (NOUVEAU/NOTIFIE) ne figure plus dans le dernier scan Stych, le créneau
   * a disparu (pris par un autre élève, ou retiré) — sans ça l'alerte
   * restait affichée comme réservable indéfiniment tant que sa date n'était
   * pas passée.
   */
  private async markGoneAlerts(userId: string, freshSlots: StychSlot[]): Promise<void> {
    const liveSignatures = new Set(freshSlots.map((s) => `${s.id_user}|${s.info_date}|${s.heure_debut}`));

    const activeAlerts = await this.prisma.slotAlert.findMany({
      where: { user_id: userId, status: { in: ['NOUVEAU', 'NOTIFIE'] } },
    });

    const goneIds = activeAlerts
      .filter((a) => !liveSignatures.has(`${a.stych_moniteur_id}|${a.course_date.toISOString().slice(0, 10)}|${a.heure_debut}`))
      .map((a) => a.id);

    if (goneIds.length === 0) return;

    await this.prisma.slotAlert.updateMany({
      where: { id: { in: goneIds } },
      data: { status: 'MANQUE' },
    });
    this.logger.log(`${goneIds.length} alerte(s) marquée(s) manquée(s) pour l'utilisateur ${userId} (créneau plus disponible)`);
  }

  /** Évite les doublons : une alerte identique (moniteur+date+heure) déjà active n'est pas recréée. */
  private async createAlertIfNew(
    userId: string,
    searchProfileId: string,
    slot: StychSlot,
    pointsDeCours: unknown[],
  ): Promise<boolean> {
    const courseDate = new Date(slot.info_date);

    const existing = await this.prisma.slotAlert.findFirst({
      where: {
        user_id: userId,
        stych_moniteur_id: slot.id_user,
        course_date: courseDate,
        heure_debut: slot.heure_debut,
        status: { in: ['NOUVEAU', 'NOTIFIE'] },
      },
    });
    if (existing) return false;

    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });

    const alert = await this.prisma.slotAlert.create({
      data: {
        user_id: userId,
        search_profile_id: searchProfileId,
        stych_moniteur_id: slot.id_user,
        moniteur_name: slot.moniteur,
        stych_lac_id: slot.id_lac,
        lieu_name: resolveLieuName(pointsDeCours, slot.id_lac),
        course_date: courseDate,
        heure_debut: slot.heure_debut,
        heure_fin: slot.heure_fin,
        nb_credit: Number(slot.nb_credit),
        nb_heure: Number(slot.nb_heure),
        raw_payload: slot as any,
        status: 'NOTIFIE',
        notified_at: new Date(),
      },
    });

    await this.emailService.sendSlotFoundEmail(user.email, {
      moniteur_name: alert.moniteur_name,
      lieu_name: alert.lieu_name,
      course_date: alert.course_date,
      heure_debut: alert.heure_debut,
      heure_fin: alert.heure_fin,
    });

    return true;
  }
}
