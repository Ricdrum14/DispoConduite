import { useEffect, useRef, useState } from 'react';
import { CarFront, Bell, Clock3, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useActiveSlotAlerts } from '@/hooks/useSlotAlerts';
import { formatHeure } from '@/lib/utils';

interface AppHeaderProps {
  agence?: string | null;
}

export function AppHeader({ agence }: AppHeaderProps) {
  const { data: alerts } = useActiveSlotAlerts();
  const hasAlerts = (alerts?.length ?? 0) > 0;

  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  return (
    <header className="flex items-center justify-between py-5">
      <div className="flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
          <CarFront className="h-5 w-5" />
        </div>
        <div>
          <p className="font-display text-xl font-bold leading-none">DispoConduite</p>
          <p className="mt-1 text-xs text-muted-foreground">Stych{agence ? ` · ${agence}` : ''}</p>
        </div>
      </div>

      <div className="relative" ref={panelRef}>
        <button
          aria-label="Notifications"
          onClick={() => setOpen((v) => !v)}
          className="relative grid h-10 w-10 place-items-center rounded-full border bg-card transition hover:-translate-y-0.5"
        >
          <Bell className="h-4 w-4" />
          {hasAlerts && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary ring-2 ring-card" />}
        </button>

        {open && (
          <div className="absolute right-0 top-12 z-20 w-80 rounded-2xl border bg-card p-4 shadow-xl">
            <p className="mb-3 font-display text-sm font-bold">Nouveaux créneaux disponibles</p>
            {!hasAlerts && <p className="text-sm text-muted-foreground">Aucun créneau disponible pour le moment.</p>}
            <div className="max-h-80 space-y-2 overflow-y-auto">
              {alerts?.map((alert) => (
                <div key={alert.id} className="rounded-xl bg-secondary p-3">
                  <p className="text-sm font-semibold capitalize">
                    {format(new Date(alert.course_date), 'EEEE d MMMM', { locale: fr })}
                  </p>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock3 className="h-3.5 w-3.5" />
                    {formatHeure(alert.heure_debut)} — {formatHeure(alert.heure_fin)}
                  </p>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" />
                    {alert.lieu_name ?? 'Stych Strasbourg'}
                    {alert.moniteur_name ? ` · ${alert.moniteur_name}` : ''}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
