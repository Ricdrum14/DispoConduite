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
const LOGIN_URL = '/connexion/0/record3';

/**
 * Construit un cookie à partir de zéro depuis les en-têtes `Set-Cookie`
 * d'une réponse (pas de fusion avec un cookie existant, contrairement à
 * mergeSetCookie) — utilisé juste après un login scripté, où on part
 * d'une session anonyme.
 */
function buildCookieFromSetCookie(setCookieHeaders: string[]): string {
  return setCookieHeaders
    .map((raw) => raw.split(';', 1)[0].trim())
    .filter((pair) => pair.includes('='))
    .join('; ');
}

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
        this.logger.warn(`Session expirée (HTTP ${err.response?.status}) pour l'utilisateur ${session.userId} sur ${url}`);
        throw new StychSessionExpiredError();
      }
      throw err;
    }
  }

  private async persistRenewedCookie(session: StychSession, setCookieHeaders?: string[]): Promise<void> {
    if (!setCookieHeaders || setCookieHeaders.length === 0) {
      this.logger.debug(`Pas de Set-Cookie renvoyé par Stych pour l'utilisateur ${session.userId}`);
      return;
    }
    const merged = mergeSetCookie(session.sessionCookie, setCookieHeaders);
    if (merged === session.sessionCookie) {
      this.logger.debug(`Set-Cookie reçu mais identique au cookie stocké pour l'utilisateur ${session.userId}`);
      return;
    }

    session.sessionCookie = merged;
    await this.prisma.user.update({
      where: { id: session.userId },
      data: { stych_session_cookie: merged },
    });
    this.logger.log(`Cookie Stych renouvelé pour l'utilisateur ${session.userId}`);
  }

  /**
   * Login scripté (email + mot de passe) — remplace la copie manuelle du
   * cookie de session depuis DevTools.
   *
   * Un simple POST isolé vers /connexion/0/record3 renvoie bien un
   * PHPSESSID mais PAS de cookie remember_me, et la session obtenue échoue
   * sur le moindre appel API ensuite — vérifié empiriquement le 2026-09-04.
   * Stych n'authentifie vraiment la session que si on rejoue la continuité
   * de cookie d'un navigateur réel : charger /connexion (PHPSESSID
   * initial), interroger /check-auth avec ce même PHPSESSID (déclenché
   * normalement en tapant l'email), PUIS soumettre le login — les 3 appels
   * doivent partager le même cookie. Une fois ça fait, le token_csrf figé
   * (STYCH_CSRF_TOKEN, voir StychService.tryAutoRelogin) fonctionne
   * directement sur la session ainsi obtenue, confirmant qu'il n'est pas
   * lié à une session précise.
   *
   * `remember_me` envoyé deux fois dans le formulaire (0 puis 1 — hidden +
   * checkbox, PHP garde la dernière valeur) pour forcer le cookie
   * remember_me longue durée (~181 jours) en plus du PHPSESSID (~30h). Ce
   * formulaire ne fournit pas token_csrf : il doit être scrapé séparément
   * d'une page authentifiée, ou figé côté config comme fait ici.
   *
   * Détection d'échec : un login réussi renvoie toujours un cookie
   * remember_me en plus du PHPSESSID (vérifié 2026-09-04) ; son absence est
   * traitée comme un rejet (mauvais mot de passe, ou anti-bot).
   */
  async login(email: string, password: string): Promise<string> {
    const headers = {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      Origin: STYCH_BASE_URL,
      Referer: `${STYCH_BASE_URL}/connexion`,
      'X-Requested-With': 'XMLHttpRequest',
      Accept: 'application/json, text/javascript, */*; q=0.01',
      'User-Agent':
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    };

    const initial = await axios.get(`${STYCH_BASE_URL}/connexion`, { timeout: 15000 });
    let cookie = buildCookieFromSetCookie(initial.headers['set-cookie'] ?? []);

    const checkAuthResponse = await axios.post(`${STYCH_BASE_URL}/check-auth`, new URLSearchParams({ email }), {
      headers: { ...headers, Cookie: cookie },
      timeout: 15000,
    });
    if (checkAuthResponse.headers['set-cookie']) {
      cookie = buildCookieFromSetCookie(checkAuthResponse.headers['set-cookie']);
    }

    const loginBody = new URLSearchParams();
    loginBody.set('email', email);
    loginBody.set('mdp', password);
    loginBody.set('mdp_forgotten', '0');
    loginBody.append('remember_me', '0');
    loginBody.append('remember_me', '1');
    loginBody.set('submit', 'Connexion');

    const loginResponse = await axios.post(`${STYCH_BASE_URL}${LOGIN_URL}`, loginBody, {
      headers: { ...headers, Cookie: cookie },
      timeout: 15000,
    });

    const setCookie = loginResponse.headers['set-cookie'];
    if (!setCookie || !setCookie.some((c) => c.startsWith('remember_me='))) {
      throw new Error('Login Stych: session non authentifiée (pas de remember_me reçu) — identifiants probablement refusés.');
    }

    return buildCookieFromSetCookie(setCookie);
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
      this.logger.warn(`Réponse non-JSON de Stych (session probablement expirée) pour l'utilisateur ${session.userId}`);
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
