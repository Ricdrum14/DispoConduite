import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { AppHeader } from '@/components/dispo/AppHeader';
import { StatusHero } from '@/components/dispo/StatusHero';
import { WeekRoad } from '@/components/dispo/WeekRoad';
import { OpportunityCard } from '@/components/dispo/OpportunityCard';
import { StatsRow } from '@/components/dispo/StatsRow';
import { PreferencePanel, type DraftPrefs } from '@/components/dispo/PreferencePanel';
import { SlidersHorizontal } from 'lucide-react';
import { useStychStatus, useTogglePolling } from '@/hooks/useStych';
import { useSearchProfiles, useCreateSearchProfile, useUpdateSearchProfile } from '@/hooks/useSearchProfiles';
import { useActiveSlotAlerts } from '@/hooks/useSlotAlerts';
import { useBookings, useConfirmBookingFromAlert } from '@/hooks/useBookings';

const DEFAULT_DRAFT: DraftPrefs = { days: [1, 3, 6], time_slots: ['MATIN'] };
const TIME_SLOT_LABELS: Record<string, string> = { MATIN: 'Matin', MIDI: 'Midi', APRES_MIDI: 'Après-midi', SOIR: 'Soir' };

export default function Dashboard() {
  const { data: status } = useStychStatus();
  const { data: profiles } = useSearchProfiles();
  const { data: activeAlerts } = useActiveSlotAlerts();
  const { data: bookings } = useBookings();

  const createProfile = useCreateSearchProfile();
  const updateProfile = useUpdateSearchProfile();
  const confirmBooking = useConfirmBookingFromAlert();
  const togglePolling = useTogglePolling();

  const [panelOpen, setPanelOpen] = useState(false);
  const [draft, setDraft] = useState<DraftPrefs>(DEFAULT_DRAFT);

  const activeProfile = useMemo(() => profiles?.find((p) => p.is_active) ?? profiles?.[0], [profiles]);

  // Ne resynchronise pas pendant que le panneau est ouvert — un refetch en
  // arrière-plan (ex: juste après un save qui invalide la query) écraserait
  // sinon silencieusement une modification en cours.
  useEffect(() => {
    if (activeProfile && !panelOpen) {
      setDraft({ days: activeProfile.days, time_slots: activeProfile.time_slots });
    }
  }, [activeProfile, panelOpen]);

  const savePrefs = async () => {
    try {
      if (activeProfile) {
        await updateProfile.mutateAsync({ id: activeProfile.id, ...draft });
      } else {
        await createProfile.mutateAsync({ name: 'Semaine normale', is_active: true, ...draft });
      }
      toast.success('Préférences enregistrées');
      setPanelOpen(false);
    } catch {
      toast.error('Impossible d\'enregistrer les préférences');
    }
  };

  const reserve = async (alertId: string) => {
    try {
      await confirmBooking.mutateAsync(alertId);
      // Stych a déjà renvoyé un succès HTTP pour une réservation qui n'a en
      // réalité pas abouti (cf. connecteur) — tant que ce comportement n'est
      // pas mieux compris, on ne prétend pas être sûr à 100%.
      toast.success('Confirmation envoyée — vérifie sur ton planning Stych que le cours y apparaît bien.', { duration: 8000 });
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Réservation impossible — le créneau est peut-être déjà pris.');
    }
  };

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-6xl px-4 pb-12 sm:px-6">
        <AppHeader agence={status?.agence} />
        <StatusHero
          active={!(status?.pollingPaused ?? false)}
          onToggle={() => togglePolling.mutate(!(status?.pollingPaused ?? false))}
          autoBookingEnabled={status?.autoBookingEnabled ?? false}
        />
        <div className="mt-5 grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
          <div className="space-y-5">
            {(activeAlerts ?? []).length === 0 ? (
              <OpportunityCard alert={null} reserving={false} onReserve={() => {}} />
            ) : (
              (activeAlerts ?? []).map((alert) => (
                <OpportunityCard
                  key={alert.id}
                  alert={alert}
                  reserving={confirmBooking.isPending && confirmBooking.variables === alert.id}
                  onReserve={() => reserve(alert.id)}
                />
              ))
            )}
            <StatsRow bookings={bookings ?? []} activeAlerts={activeAlerts ?? []} />
          </div>
          <div className="space-y-5">
            <WeekRoad selectedDayNumbers={activeProfile?.days ?? []} profileName={activeProfile?.name} />
            <section className="rounded-3xl border bg-card p-5 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-display font-bold">Préférences actives</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {(activeProfile?.time_slots ?? []).map((t) => TIME_SLOT_LABELS[t]).join(' · ') || 'Aucune plage'}
                  </p>
                </div>
                <button onClick={() => setPanelOpen(true)} className="inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-2.5 text-xs font-bold transition hover:bg-accent">
                  <SlidersHorizontal className="h-4 w-4" />Ajuster
                </button>
              </div>
            </section>
            <section className="rounded-3xl bg-secondary p-5 sm:p-6">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Statut Stych</p>
              <div className="mt-3 flex items-end justify-between">
                <p className="font-display text-xl font-bold">
                  {status?.sessionExpired ? 'Session expirée' : status?.connected ? 'Connecté' : 'Non connecté'}
                </p>
                {status?.sessionExpired && (
                  <Link to="/onboarding" className="text-xs font-bold text-primary underline">
                    Se reconnecter
                  </Link>
                )}
                {!status?.connected && !status?.sessionExpired && <p className="text-xs text-muted-foreground">Va dans Paramètres</p>}
              </div>
            </section>
          </div>
        </div>
      </div>
      <PreferencePanel
        open={panelOpen}
        prefs={draft}
        saving={createProfile.isPending || updateProfile.isPending}
        onChange={setDraft}
        onSave={savePrefs}
        onClose={() => setPanelOpen(false)}
      />
    </main>
  );
}
