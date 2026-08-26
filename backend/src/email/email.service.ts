import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private readonly resend: Resend | null;
  private readonly frontendUrl: string;
  // Domaine d'expédition — doit être un domaine vérifié dans Resend (voir
  // les enregistrements DNS resend._domainkey / send.<domaine>), pas
  // forcément le même que celui du frontend.
  private readonly fromDomain: string;
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly config: ConfigService) {
    const apiKey = config.get<string>('RESEND_API_KEY');
    // Resend jette au constructeur si la clé est vide — en dev sans clé
    // configurée, on désactive l'envoi plutôt que de faire planter le boot.
    this.resend = apiKey ? new Resend(apiKey) : null;
    if (!this.resend) {
      this.logger.warn('RESEND_API_KEY absente — les emails ne seront pas envoyés (juste loggués).');
    }
    this.frontendUrl = config.get<string>('FRONTEND_URL') ?? 'http://localhost:5173';
    this.fromDomain = config.get<string>('EMAIL_FROM_DOMAIN') ?? 'dispoconduite.fr';
  }

  async sendVerificationEmail(to: string, token: string): Promise<void> {
    const link = `${this.frontendUrl}/verify-email?token=${token}`;
    if (!this.resend) {
      this.logger.log(`[email désactivé] Vérification pour ${to} : ${link}`);
      return;
    }
    try {
      await this.resend.emails.send({
        from: `DispoConduite <noreply@${this.fromDomain}>`,
        to,
        subject: 'Vérifiez votre adresse email — DispoConduite',
        html: this.verificationTemplate(link),
      });
    } catch (err) {
      this.logger.error('Echec envoi email de vérification', err);
    }
  }

  // Notification "créneau détecté" — cahier des charges §6/§8 : doit partir
  // en quelques secondes après détection, en plus de la carte in-app.
  async sendSlotFoundEmail(
    to: string,
    slot: { moniteur_name?: string | null; lieu_name?: string | null; course_date: Date; heure_debut: string; heure_fin: string },
  ): Promise<void> {
    const dateLabel = slot.course_date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
    if (!this.resend) {
      this.logger.log(`[email désactivé] Créneau détecté pour ${to} : ${dateLabel} ${slot.heure_debut}-${slot.heure_fin}`);
      return;
    }
    try {
      await this.resend.emails.send({
        from: `DispoConduite <alertes@${this.fromDomain}>`,
        to,
        subject: 'Un créneau vient de se libérer 🚗',
        html: this.slotFoundTemplate(dateLabel, slot, this.frontendUrl),
      });
    } catch (err) {
      this.logger.error('Echec envoi email de notification créneau', err);
    }
  }

  // Mode réservation automatique : contrairement à sendSlotFoundEmail, le
  // cours est déjà réservé au moment de l'envoi — pas de "confirme vite".
  async sendAutoBookedEmail(
    to: string,
    slot: { moniteur_name?: string | null; lieu_name?: string | null; course_date: Date; heure_debut: string; heure_fin: string },
  ): Promise<void> {
    const dateLabel = slot.course_date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
    if (!this.resend) {
      this.logger.log(`[email désactivé] Réservation auto pour ${to} : ${dateLabel} ${slot.heure_debut}-${slot.heure_fin}`);
      return;
    }
    try {
      await this.resend.emails.send({
        from: `DispoConduite <alertes@${this.fromDomain}>`,
        to,
        subject: 'Créneau réservé automatiquement ✅',
        html: this.autoBookedTemplate(dateLabel, slot, this.frontendUrl),
      });
    } catch (err) {
      this.logger.error('Echec envoi email de réservation automatique', err);
    }
  }

  // Envoyée une seule fois par expiration (cf. StychService.markSessionExpired
  // qui sort l'utilisateur du cycle de polling tant qu'il n'a pas reconnecté).
  async sendSessionExpiredEmail(to: string): Promise<void> {
    const link = `${this.frontendUrl}/onboarding`;
    if (!this.resend) {
      this.logger.log(`[email désactivé] Session Stych expirée pour ${to} : ${link}`);
      return;
    }
    try {
      await this.resend.emails.send({
        from: `DispoConduite <alertes@${this.fromDomain}>`,
        to,
        subject: 'Ta connexion Stych a expiré — reconnecte-toi',
        html: this.sessionExpiredTemplate(link),
      });
    } catch (err) {
      this.logger.error('Echec envoi email de session expirée', err);
    }
  }

  private sessionExpiredTemplate(link: string): string {
    return `<!DOCTYPE html>
<html lang="fr">
<body style="margin:0;padding:40px 20px;background:#F7F1E9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:24px;padding:40px;box-shadow:0 4px 24px rgba(240,86,42,0.08);">
    <h1 style="margin:0 0 8px;font-size:22px;color:#0f172a;">La veille est en pause ⏸️</h1>
    <p style="margin:0 0 28px;color:#64748b;font-size:15px;">
      Ta connexion à ton compte élève Stych a expiré, on ne peut donc plus surveiller tes créneaux.
      Reconnecte-toi pour relancer la veille.
    </p>
    <a href="${link}"
       style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#F0562A,#F0891A);color:#fff;text-decoration:none;border-radius:14px;font-weight:600;font-size:15px;">
      Reconnecter mon compte Stych
    </a>
  </div>
</body>
</html>`;
  }

  private verificationTemplate(link: string): string {
    return `<!DOCTYPE html>
<html lang="fr">
<body style="margin:0;padding:40px 20px;background:#F7F1E9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:24px;padding:40px;box-shadow:0 4px 24px rgba(240,86,42,0.08);">
    <h1 style="margin:0 0 8px;font-size:22px;color:#0f172a;">Bienvenue sur DispoConduite 🚗</h1>
    <p style="margin:0 0 28px;color:#64748b;font-size:15px;">
      Cliquez sur le bouton ci-dessous pour vérifier votre adresse email et activer votre compte.
    </p>
    <a href="${link}"
       style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#F0562A,#F0891A);color:#fff;text-decoration:none;border-radius:14px;font-weight:600;font-size:15px;">
      Vérifier mon email
    </a>
    <p style="margin:28px 0 0;color:#94a3b8;font-size:12px;line-height:1.6;">
      Ce lien est valide 24 heures. Si vous n'avez pas créé de compte DispoConduite, ignorez simplement cet email.
    </p>
  </div>
</body>
</html>`;
  }

  private autoBookedTemplate(
    dateLabel: string,
    slot: { moniteur_name?: string | null; lieu_name?: string | null; heure_debut: string; heure_fin: string },
    frontendUrl: string,
  ): string {
    return `<!DOCTYPE html>
<html lang="fr">
<body style="margin:0;padding:40px 20px;background:#F7F1E9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:24px;padding:40px;box-shadow:0 4px 24px rgba(240,86,42,0.08);">
    <h1 style="margin:0 0 8px;font-size:22px;color:#0f172a;">Créneau réservé automatiquement ✅</h1>
    <p style="margin:0 0 4px;color:#0f172a;font-size:16px;font-weight:600;text-transform:capitalize;">${dateLabel}</p>
    <p style="margin:0 0 20px;color:#64748b;font-size:15px;">
      ${slot.heure_debut} — ${slot.heure_fin}${slot.lieu_name ? ` · ${slot.lieu_name}` : ''}${slot.moniteur_name ? ` · ${slot.moniteur_name}` : ''}
    </p>
    <a href="${frontendUrl}/historique"
       style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#F0562A,#F0891A);color:#fff;text-decoration:none;border-radius:14px;font-weight:600;font-size:15px;">
      Voir dans l'historique
    </a>
    <p style="margin:28px 0 0;color:#94a3b8;font-size:12px;line-height:1.6;">
      Réservé automatiquement d'après tes préférences — vérifie sur ton planning Stych que le cours y apparaît bien.
    </p>
  </div>
</body>
</html>`;
  }

  private slotFoundTemplate(
    dateLabel: string,
    slot: { moniteur_name?: string | null; lieu_name?: string | null; heure_debut: string; heure_fin: string },
    frontendUrl: string,
  ): string {
    return `<!DOCTYPE html>
<html lang="fr">
<body style="margin:0;padding:40px 20px;background:#F7F1E9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:24px;padding:40px;box-shadow:0 4px 24px rgba(240,86,42,0.08);">
    <h1 style="margin:0 0 8px;font-size:22px;color:#0f172a;">Un créneau vient de se libérer 🚗</h1>
    <p style="margin:0 0 4px;color:#0f172a;font-size:16px;font-weight:600;text-transform:capitalize;">${dateLabel}</p>
    <p style="margin:0 0 20px;color:#64748b;font-size:15px;">
      ${slot.heure_debut} — ${slot.heure_fin}${slot.lieu_name ? ` · ${slot.lieu_name}` : ''}${slot.moniteur_name ? ` · ${slot.moniteur_name}` : ''}
    </p>
    <a href="${frontendUrl}/dashboard"
       style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#F0562A,#F0891A);color:#fff;text-decoration:none;border-radius:14px;font-weight:600;font-size:15px;">
      Voir et réserver
    </a>
    <p style="margin:28px 0 0;color:#94a3b8;font-size:12px;line-height:1.6;">
      Les créneaux Stych partent vite — pense à confirmer rapidement.
    </p>
  </div>
</body>
</html>`;
  }
}
