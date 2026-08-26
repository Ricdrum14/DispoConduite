import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { LogOut, ShieldCheck, ShieldX, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useStychStatus, useDisconnectStych, useToggleAutoBooking } from '@/hooks/useStych';

export default function Settings() {
  const { user, logout } = useAuth();
  const { data: status } = useStychStatus();
  const disconnectStych = useDisconnectStych();
  const toggleAutoBooking = useToggleAutoBooking();
  const navigate = useNavigate();

  const disconnect = async () => {
    try {
      await disconnectStych.mutateAsync();
      toast.success('Compte Stych déconnecté');
      navigate('/onboarding');
    } catch {
      toast.error('Impossible de déconnecter le compte Stych — réessaie.');
    }
  };

  const toggleAuto = async () => {
    const next = !(status?.autoBookingEnabled ?? false);
    try {
      await toggleAutoBooking.mutateAsync(next);
      toast.success(next ? 'Réservation automatique activée' : 'Réservation automatique désactivée');
    } catch {
      toast.error('Impossible de changer ce réglage — réessaie.');
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 space-y-5">
      <h1 className="font-display text-2xl font-bold">Paramètres</h1>

      <section className="rounded-3xl border bg-card p-5 sm:p-6">
        <p className="font-display font-bold mb-1">Compte</p>
        <p className="text-sm text-muted-foreground">{user?.email}</p>
      </section>

      <section className="rounded-3xl border bg-card p-5 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <p className="font-display font-bold">Connexion Stych</p>
          {status?.connected ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
              <ShieldCheck className="h-4 w-4" /> Connecté
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-destructive">
              <ShieldX className="h-4 w-4" /> {status?.sessionExpired ? 'Session expirée' : 'Non connecté'}
            </span>
          )}
        </div>
        {status?.sessionExpired && (
          <p className="text-sm text-muted-foreground mb-4">
            Ta connexion Stych a expiré, la veille est en pause — reconnecte-toi pour la relancer.
          </p>
        )}
        {status?.connected && (
          <>
            <p className="text-sm text-muted-foreground mb-4">Agence : {status.agence ?? '—'}</p>
            <Button variant="outline" onClick={disconnect} disabled={disconnectStych.isPending}>
              Déconnecter mon compte Stych
            </Button>
          </>
        )}
        {!status?.connected && (
          <Button onClick={() => navigate('/onboarding')}>
            {status?.sessionExpired ? 'Reconnecter mon compte Stych' : 'Connecter mon compte Stych'}
          </Button>
        )}
      </section>

      {status?.connected && (
        <section className="rounded-3xl border bg-card p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-display font-bold flex items-center gap-1.5">
                <Zap className="h-4 w-4 text-primary" /> Réservation automatique
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Quand activé, DispoConduite réserve directement les créneaux qui correspondent à tes préférences,
                sans attendre que tu confirmes chaque fois.
              </p>
            </div>
            <Button
              variant={status?.autoBookingEnabled ? 'default' : 'outline'}
              size="sm"
              onClick={toggleAuto}
              disabled={toggleAutoBooking.isPending}
              className="shrink-0"
            >
              {status?.autoBookingEnabled ? 'Activée' : 'Désactivée'}
            </Button>
          </div>
        </section>
      )}

      <Button variant="destructive" onClick={logout} className="gap-2">
        <LogOut className="h-4 w-4" /> Se déconnecter
      </Button>
    </div>
  );
}
