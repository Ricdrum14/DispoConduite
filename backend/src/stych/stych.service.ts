import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { StychClientService } from './stych-client.service';
import { ConnectStychDto } from './dto/connect-stych.dto';
import { StychSession, StychSlot } from './types/stych-api.types';
import { StychSessionExpiredError } from './errors/stych-session-expired.error';
import { TimeSlot } from '../../generated/prisma/client/enums';

// Créneau de 45min (0.75h) par défaut chez Stych — cf. annexe technique.
const DEFAULT_ID_TYPE_COURS_CONDUITE = 2;

@Injectable()
export class StychService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stychClient: StychClientService,
    private readonly config: ConfigService,
  ) {}

  async connect(userId: string, dto: ConnectStychDto) {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        stych_session_cookie: dto.sessionCookie,
        stych_csrf_token: dto.csrfToken,
        stych_connected_at: new Date(),
        stych_session_expired_at: null,
        ...(dto.agence && { stych_agence: dto.agence }),
      },
    });
    return { connected: true };
  }

  async disconnect(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { stych_session_cookie: null, stych_csrf_token: null, stych_connected_at: null, stych_session_expired_at: null },
    });
    return { connected: false };
  }

  /**
   * Relogin scripté automatique (email + mot de passe + token_csrf figé,
   * tous trois en variables d'environnement — V0 mono-utilisateur, voir
   * cahier des charges) — appelé par la veille juste avant d'abandonner sur
   * une session expirée, pour éviter d'attendre une reconnexion manuelle.
   * Le token_csrf est observé stable dans le temps (pas scrapé dynamiquement
   * pour l'instant) ; si Stych le fait un jour changer, cette valeur figée
   * cessera de fonctionner et il faudra implémenter le scraping HTML.
   * Retourne false (sans lever) si les identifiants ne sont pas configurés
   * ou si Stych refuse le login, pour laisser l'appelant retomber sur le
   * flux existant de reconnexion manuelle.
   */
  async tryAutoRelogin(userId: string): Promise<boolean> {
    const email = this.config.get<string>('STYCH_EMAIL');
    const password = this.config.get<string>('STYCH_PASSWORD');
    const csrfToken = this.config.get<string>('STYCH_CSRF_TOKEN');
    if (!email || !password || !csrfToken) return false;

    try {
      const sessionCookie = await this.stychClient.login(email, password);
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          stych_session_cookie: sessionCookie,
          stych_csrf_token: csrfToken,
          stych_connected_at: new Date(),
          stych_session_expired_at: null,
        },
      });
      return true;
    } catch {
      return false;
    }
  }

  /** Appelé par la veille quand Stych rejette le cookie/token stocké — sort l'utilisateur du cycle de polling jusqu'à reconnexion manuelle. */
  async markSessionExpired(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        stych_session_cookie: null,
        stych_csrf_token: null,
        stych_connected_at: null,
        stych_session_expired_at: new Date(),
      },
    });
  }

  async getStatus(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    return {
      connected: !!user.stych_connected_at,
      connectedAt: user.stych_connected_at,
      sessionExpired: !!user.stych_session_expired_at,
      agence: user.stych_agence,
      pollingPaused: user.stych_polling_paused,
      autoBookingEnabled: user.auto_booking_enabled,
    };
  }

  async setPollingPaused(userId: string, paused: boolean) {
    await this.prisma.user.update({ where: { id: userId }, data: { stych_polling_paused: paused } });
    return { pollingPaused: paused };
  }

  async setAutoBooking(userId: string, enabled: boolean) {
    await this.prisma.user.update({ where: { id: userId }, data: { auto_booking_enabled: enabled } });
    return { autoBookingEnabled: enabled };
  }

  /** Récupère les créneaux Stych bruts pour un utilisateur connecté (usage manuel/debug). */
  async fetchSlotsForUser(userId: string): Promise<StychSlot[]> {
    const session = await this.getSessionOrThrow(userId);
    const { slots } = await this.withSessionExpiryRecovery(userId, () => this.stychClient.fetchAvailableSlots(session));
    return slots;
  }

  async confirmBookingForUser(userId: string, slot: StychSlot) {
    const session = await this.getSessionOrThrow(userId);

    return this.withSessionExpiryRecovery(userId, async () => {
      const stillAvailable = await this.stychClient.checkSlotStillAvailable(
        session,
        slot,
        DEFAULT_ID_TYPE_COURS_CONDUITE,
      );
      if (!stillAvailable) {
        throw new BadRequestException("Ce créneau vient d'être pris par quelqu'un d'autre.");
      }

      const result = await this.stychClient.confirmBooking(session, slot, DEFAULT_ID_TYPE_COURS_CONDUITE);

      // Stych peut répondre 200 avec un statut d'échec (ex: créneau pris entre
      // temps par un autre élève) sans lever d'exception HTTP — on ne doit
      // jamais enregistrer une réservation côté app sans confirmation réelle.
      if ((result as { statut?: string } | null)?.statut !== 'OK') {
        throw new BadRequestException(
          "La réservation a été refusée par Stych — le créneau est peut-être déjà pris.",
        );
      }

      return result;
    });
  }

  /**
   * Convertit une session Stych expirée détectée pendant un appel interactif
   * (pas le polling, qui a sa propre gestion avec email) en réponse propre
   * côté utilisateur, et sort le compte du cycle de veille dans la foulée —
   * sans ça "Vérifier maintenant" et "Réserver" plantaient en 500 brut au
   * lieu de dire clairement "reconnecte-toi".
   */
  private async withSessionExpiryRecovery<T>(userId: string, fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (err) {
      if (err instanceof StychSessionExpiredError) {
        await this.markSessionExpired(userId);
        throw new UnauthorizedException('Ta session Stych a expiré — reconnecte-toi.');
      }
      throw err;
    }
  }

  async getSessionOrThrow(userId: string): Promise<StychSession> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (!user.stych_session_cookie || !user.stych_csrf_token) {
      throw new UnauthorizedException('Compte Stych non connecté — renseigne ton cookie de session dans les paramètres.');
    }
    return { userId, sessionCookie: user.stych_session_cookie, csrfToken: user.stych_csrf_token };
  }

  /** Mappe l'heure de début Stych ("08:30") vers un TimeSlot façon prototype. */
  static timeSlotForHour(heureDebut: string): TimeSlot {
    const hour = Number(heureDebut.split(':')[0]);
    if (hour < 12) return TimeSlot.MATIN;
    if (hour < 14) return TimeSlot.MIDI;
    if (hour < 18) return TimeSlot.APRES_MIDI;
    return TimeSlot.SOIR;
  }

  /** Filtre les créneaux Stych bruts selon un SearchProfile (jours + moments préférés). */
  static matchesProfile(
    slot: StychSlot,
    profile: { days: number[]; time_slots: TimeSlot[]; moniteur_id?: string | null },
  ): boolean {
    const dayMatches = profile.days.length === 0 || profile.days.includes(Number(slot.id_jour));
    const timeMatches =
      profile.time_slots.length === 0 || profile.time_slots.includes(StychService.timeSlotForHour(slot.heure_debut));
    const moniteurMatches = !profile.moniteur_id || profile.moniteur_id === slot.id_user;
    return dayMatches && timeMatches && moniteurMatches;
  }
}
