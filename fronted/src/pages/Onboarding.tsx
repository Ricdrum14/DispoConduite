import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowRight, ExternalLink } from 'lucide-react';
import { Logo } from '@/components/shared/LogoMark';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useConnectStych } from '@/hooks/useStych';
import { useAuth } from '@/hooks/useAuth';

/**
 * Onboarding V0 (cahier des charges §5.1 et §7) : Stych n'expose pas de flux
 * de login scripté connu, donc l'élève récupère lui-même son cookie de
 * session + son token_csrf via l'onglet Réseau du navigateur sur stych.fr,
 * après s'être connecté normalement une fois.
 */
export default function Onboarding() {
  const [sessionCookie, setSessionCookie] = useState('');
  const [csrfToken, setCsrfToken] = useState('');
  const [agence, setAgence] = useState('Strasbourg');
  const navigate = useNavigate();
  const connectStych = useConnectStych();
  const { user, setUser } = useAuth();

  const submit = async () => {
    if (!sessionCookie || !csrfToken) {
      toast.error('Cookie de session et token CSRF requis');
      return;
    }
    try {
      await connectStych.mutateAsync({ sessionCookie, csrfToken, agence });
      if (user) setUser({ ...user, stych_connected: true });
      toast.success('Compte Stych connecté !');
      navigate('/dashboard');
    } catch {
      toast.error('Connexion à Stych impossible — vérifie les valeurs copiées');
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        <div className="flex flex-col items-center mb-8 gap-3">
          <Logo iconSize={44} />
          <p className="text-muted-foreground text-sm text-center max-w-sm">
            Connecte ton compte élève Stych pour que la veille puisse surveiller tes créneaux.
          </p>
        </div>

        <div className="bg-card rounded-3xl shadow-xl shadow-primary/10 border border-primary/10 p-6 space-y-5">
          <div className="rounded-2xl bg-accent p-4 text-sm text-accent-foreground leading-relaxed">
            <p className="font-semibold mb-1">Comment récupérer ces valeurs ?</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Connecte-toi normalement sur stych.fr</li>
              <li>Ouvre les outils développeur (F12) → onglet Réseau/Network</li>
              <li>Recharge la page de ton planning de conduite</li>
              <li>Repère une requête vers <code className="text-xs">planning-conduite</code> et copie le cookie de session (en-tête <code className="text-xs">Cookie</code>) et le <code className="text-xs">token_csrf</code> envoyé</li>
            </ol>
          </div>

          <div className="space-y-2">
            <Label htmlFor="agence">Agence Stych</Label>
            <Input id="agence" value={agence} onChange={(e) => setAgence(e.target.value)} placeholder="Strasbourg" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sessionCookie">Cookie de session</Label>
            <Input
              id="sessionCookie"
              value={sessionCookie}
              onChange={(e) => setSessionCookie(e.target.value)}
              placeholder="PHPSESSID=..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="csrfToken">Token CSRF</Label>
            <Input id="csrfToken" value={csrfToken} onChange={(e) => setCsrfToken(e.target.value)} placeholder="token_csrf" />
          </div>

          <Button onClick={submit} disabled={connectStych.isPending} className="w-full py-6 text-base gap-2">
            {connectStych.isPending ? 'Connexion…' : 'Connecter mon compte Stych'}
            <ArrowRight className="w-4 h-4" />
          </Button>

          <a
            href="https://www.stych.fr"
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            Ouvrir stych.fr dans un nouvel onglet <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
}
