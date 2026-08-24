import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';
import { StychPlanningPropositionResponse, StychSession, StychSlot } from './types/stych-api.types';
import { StychSessionExpiredError } from './errors/stych-session-expired.error';

/**
 * Fusionne les cookies renvoyés par Stych (`Set-Cookie`) dans le cookie
 * stocké — remplace juste les clés renouvelées (typiquement PHPSESSID),
 * garde le reste (dont remember_me) intact.
 */
function mergeSetCookie(original: string, setCookieHeaders: string[]): string {
  const updates = new Map<string, string>();
  for (const raw of setCookieHeaders) {
    const pair = raw.split(';', 1)[0];
    const idx = pair.indexOf('=');
    if (idx === -1) continue;
    updates.set(pair.slice(0, idx).trim(), pair.slice(idx + 1).trim());
  }
  if (updates.size === 0) return original;

  const seen = new Set<string>();
  const merged = original.split(';').map((part) => {
    const idx = part.indexOf('=');
    if (idx === -1) return part;
    const name = part.slice(0, idx).trim();
    if (updates.has(name)) {
      seen.add(name);
      return `${name}=${updates.get(name)}`;
    }
    return part;
  });
  for (const [name, value] of updates) {
    if (!seen.has(name)) merged.push(`${name}=${value}`);
  }
  return merged.join('; ');
}

const STYCH_BASE_URL = 'https://www.stych.fr';
const GET_PLANNING_PROPOSITION = '/elearning/planning-conduite/get-planning-proposition';
const IS_COURS_AVAILABLE = '/elearning/planning-conduite/is-cours-available';
const CONFIRM_PLANNING_PROPOSITION = '/elearning/planning-conduite/confirm-planning-proposition';

/**
 * Connecteur Stych — encapsule les appels à l'API interne (non officielle)
 * documentée dans l'annexe technique du cahier des charges. Isolé ici pour
 * que le reste du backend n'ait jamais à connaître le fonctionnement de
 * Stych directement : si Stych change son site, seul ce fichier doit bouger.
 *
 * L'authentification Stych se fait par cookie de session + jeton CSRF
 * (obtenus manuellement pour l'instant, voir StychService.connect) — jamais
 * par mot de passe stocké en clair.
 */
@Injectable()
export class StychClientService {
  private readonly logger = new Logger(StychClientService.name);

  constructor(private readonly prisma: PrismaService) {}

  private client(session: StychSession) {
    return axios.create({
      baseURL: STYCH_BASE_URL,
      headers: {
        Cookie: session.sessionCookie,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      timeout: 15000,
    });
  }

  /**
   * POST authentifié partagé par les 3 endpoints Stych — centralise la
   * détection de session expirée (401/403) pour que fetchAvailableSlots,
   * checkSlotStillAvailable et confirmBooking bénéficient tous du même
   * traitement, au lieu de ne l'avoir que sur un seul appel.
   *
   * Stych renvoie un `Set-Cookie` avec un PHPSESSID renouvelé à chaque
   * requête (comme un navigateur qui reste connecté tant qu'il navigue) —
   * on le réenregistre systématiquement pour ne plus jamais laisser le
   * cookie stocké devenir périmé tout seul entre deux cycles de veille.
   */
  private async post<T>(session: StychSession, url: string, body: URLSearchParams): Promise<T> {
    try {
      const response = await this.client(session).post<T>(url, body);
      await this.persistRenewedCookie(session, response.headers['set-cookie']);
      return response.data;
    } catch (err) {
      if (axios.isAxiosError(err) && (err.response?.status === 401 || err.response?.status === 403)) {
        throw new StychSessionExpiredError();
      }
      throw err;
    }
  }

  private async persistRenewedCookie(session: StychSession, setCookieHeaders?: string[]): Promise<void> {
    if (!setCookieHeaders || setCookieHeaders.length === 0) return;
    const merged = mergeSetCookie(session.sessionCookie, setCookieHeaders);
    if (merged === session.sessionCookie) return;

    session.sessionCookie = merged;
    await this.prisma.user.update({
      where: { id: session.userId },
      data: { stych_session_cookie: merged },
    });
  }

  /**
   * Récupère tous les créneaux disponibles, sans filtre (calledFromFilter=0),
   * pour laisser le matching se faire côté bot plutôt que de répliquer les
   * filtres Stych — recommandation du cahier des charges.
   */
  async fetchAvailableSlots(session: StychSession): Promise<{ slots: StychSlot[]; pointsDeCours: unknown[] }> {
    const body = new URLSearchParams({
      token_csrf: session.csrfToken,
      calledFromFilter: '0',
    });

    const data = await this.post<StychPlanningPropositionResponse>(session, GET_PLANNING_PROPOSITION, body);

    // Signal fiable d'expiration : Stych répond en HTML (page de login) au
    // lieu du JSON attendu quand la session n'est plus valide. On ne traite
    // PAS un `statut !== 'OK'` seul comme une expiration — ce champ peut
    // légitimement prendre d'autres valeurs (ex: recherche sans résultat)
    // sans que la session soit morte ; un faux positif ici déconnecte
    // silencieusement un compte encore valide (vécu en prod le 2026-08-16).
    if (typeof data !== 'object' || data === null) {
      throw new StychSessionExpiredError();
    }

    if (data.statut !== 'OK') {
      this.logger.warn(`Réponse Stych inattendue: statut=${data.statut}`);
    }

    return { slots: data.rowsProposition ?? [], pointsDeCours: (data.rowsPointDeCours as unknown[]) ?? [] };
  }

  /**
   * Construit le corps partagé par is-cours-available et
   * confirm-planning-proposition — format confirmé sur un vrai échange
   * capturé le 2026-08-17 : `rowsPropositionSelected` est un TABLEAU
   * (notation PHP `[0][champ]`), pas une chaîne JSON, et ne contient que
   * 5 champs précis dont `id_ut_moniteur` (pas `id_user` comme dans
   * StychSlot renvoyé par get-planning-proposition).
   */
  private buildSelectedSlotBody(session: StychSession, idTypeCoursConduite: number, slot: StychSlot): URLSearchParams {
    const body = new URLSearchParams();
    body.set('id_type_cours_conduite', String(idTypeCoursConduite));
    body.set('rowsPropositionSelected[0][id_ut_moniteur]', slot.id_user);
    body.set('rowsPropositionSelected[0][info_date]', slot.info_date);
    body.set('rowsPropositionSelected[0][heure_debut]', slot.heure_debut);
    body.set('rowsPropositionSelected[0][heure_fin]', slot.heure_fin);
    body.set('rowsPropositionSelected[0][id_lac]', slot.id_lac);
    body.set('token_csrf', session.csrfToken);
    return body;
  }

  /**
   * À appeler juste avant de réserver pour confirmer que le créneau est
   * toujours libre (anti-conflit avec d'autres élèves).
   */
  async checkSlotStillAvailable(session: StychSession, slot: StychSlot, idTypeCoursConduite: number): Promise<boolean> {
    const body = this.buildSelectedSlotBody(session, idTypeCoursConduite, slot);

    const data = await this.post<{ statut?: string; [key: string]: unknown }>(session, IS_COURS_AVAILABLE, body);
    const available = data?.statut === 'OK';

    if (!available) {
      this.logger.warn(`is-cours-available a refusé le créneau — réponse brute: ${JSON.stringify(data)}`);
    }

    return available;
  }

  /**
   * Réservation finale du créneau.
   */
  async confirmBooking(session: StychSession, slot: StychSlot, idTypeCoursConduite: number): Promise<unknown> {
    const body = this.buildSelectedSlotBody(session, idTypeCoursConduite, slot);

    return this.post<unknown>(session, CONFIRM_PLANNING_PROPOSITION, body);
  }
}
