import { useState } from 'react';
import { toast } from 'sonner';
import { MailWarning } from 'lucide-react';
import { LogoMark } from '@/components/shared/LogoMark';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/api/client';

/**
 * Écran bloquant (pas juste un bandeau) tant que l'email n'est pas vérifié —
 * l'app ne laisse plus passer vers l'onboarding/dashboard sans ça (cf.
 * cahier des charges : vérification avant connexion, comme les autres apps).
 */
export default function VerifyEmailPending() {
  const { user, logout } = useAuth();
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  const resend = async () => {
    setSending(true);
    try {
      await api.post('/auth/resend-verification');
      setSent(true);
      toast.success('Email envoyé !');
    } catch {
      toast.error("Impossible d'envoyer l'email — réessaie dans une minute.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="bg-card rounded-3xl shadow-xl p-8 max-w-sm w-full text-center">
        <div className="flex justify-center mb-5">
          <LogoMark size={72} />
        </div>
        <MailWarning className="w-10 h-10 text-amber-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold mb-2">Vérifie ton email</h2>
        <p className="text-muted-foreground text-sm mb-6">
          On a envoyé un lien de vérification à <span className="font-semibold">{user?.email}</span>. Clique dessus
          pour activer ton compte et continuer.
        </p>
        <Button onClick={resend} disabled={sending || sent} className="w-full mb-3">
          {sent ? 'Email envoyé ✓' : sending ? 'Envoi…' : "Renvoyer l'email"}
        </Button>
        <button type="button" onClick={logout} className="text-sm text-muted-foreground underline underline-offset-2 hover:no-underline">
          Se déconnecter
        </button>
      </div>
    </div>
  );
}
