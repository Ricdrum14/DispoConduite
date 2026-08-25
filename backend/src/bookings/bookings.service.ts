import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ensureOwnership } from '../common/ensure-ownership';
import { StychService } from '../stych/stych.service';
import { StychSlot } from '../stych/types/stych-api.types';

@Injectable()
export class BookingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stychService: StychService,
  ) {}

  findAllForUser(userId: string) {
    return this.prisma.booking.findMany({
      where: { user_id: userId },
      orderBy: { course_date: 'desc' },
    });
  }

  /**
   * Confirmation semi-automatique (MVP) : l'utilisateur tape "Réserver" sur
   * une alerte détectée par le poller, on revérifie la dispo côté Stych puis
   * on confirme — cf. cahier des charges §6 "proposition + confirmation manuelle".
   */
  async confirmFromAlert(userId: string, slotAlertId: string) {
    const alert = ensureOwnership(
      await this.prisma.slotAlert.findUnique({ where: { id: slotAlertId } }),
      userId,
      'Créneau introuvable',
    );

    const slot: StychSlot = (alert.raw_payload as unknown as StychSlot) ?? {
      id_user: alert.stych_moniteur_id ?? '',
      moniteur: alert.moniteur_name ?? '',
      id_lac: alert.stych_lac_id ?? '',
      info_date: alert.course_date.toISOString(),
      id_jour: '',
      heure_debut: alert.heure_debut,
      heure_fin: alert.heure_fin,
      nb_credit: alert.nb_credit ?? 0,
      nb_heure: alert.nb_heure ?? 0,
    };

    await this.stychService.confirmBookingForUser(userId, slot);

    return this.prisma.$transaction(async (tx) => {
      await tx.slotAlert.update({ where: { id: alert.id }, data: { status: 'RESERVE' } });
      return tx.booking.create({
        data: {
          user_id: userId,
          slot_alert_id: alert.id,
          moniteur_name: alert.moniteur_name,
          lieu_name: alert.lieu_name,
          course_date: alert.course_date,
          heure_debut: alert.heure_debut,
          heure_fin: alert.heure_fin,
          nb_credit: alert.nb_credit,
          nb_heure: alert.nb_heure,
        },
      });
    });
  }

  /**
   * Marque une réservation comme annulée — pour le cas où l'élève a supprimé
   * le cours depuis Stych directement (pas de webhook Stych pour nous le
   * dire, cf. le risque "confirmation de réservation non fiable"). Passe le
   * statut à ANNULEE plutôt que de supprimer la ligne, pour garder une trace ;
   * les "heures effectuées" ne comptent que les réservations CONFIRMEE.
   */
  async cancel(userId: string, bookingId: string) {
    const booking = ensureOwnership(
      await this.prisma.booking.findUnique({ where: { id: bookingId } }),
      userId,
      'Réservation introuvable',
    );

    return this.prisma.booking.update({
      where: { id: booking.id },
      data: { status: 'ANNULEE' },
    });
  }
}
