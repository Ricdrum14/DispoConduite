import { ArrowRight, Check, Clock3, MapPin, Radar, User } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { formatHeure } from '@/lib/utils';
import type { SlotAlert } from '@/types';

interface OpportunityCardProps {
  alert: SlotAlert | null | undefined;
  reserving: boolean;
  onReserve: () => void;
}

export function OpportunityCard({ alert, reserving, onReserve }: OpportunityCardProps) {
  if (!alert) {
    return (
      <section className="rounded-3xl border bg-card p-5 sm:p-6">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Radar className="h-5 w-5 animate-pulse text-primary" />
          <div>
            <p className="font-display font-bold text-foreground">En veille</p>
            <p className="mt-0.5 text-sm">Aucun créneau détecté pour le moment — on continue de surveiller.</p>
          </div>
        </div>
      </section>
    );
  }

  const reserved = alert.status === 'RESERVE';
  const dateLabel = format(new Date(alert.course_date), "EEEE d MMMM", { locale: fr });

  return (
    <section className={`rounded-3xl border p-5 transition-all sm:p-6 ${reserved ? 'border-secondary bg-secondary/50' : 'border-primary/30 bg-primary/10 shadow-xl shadow-primary/10'}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-[0.18em] text-primary">{reserved ? 'Créneau réservé' : 'Nouveau match'}</span>
          <h2 className="mt-2 font-display text-2xl font-bold">{reserved ? "C'est dans votre agenda !" : 'Un créneau vient de se libérer'}</h2>
        </div>
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-primary/15 blur-md" />
          <div className={`relative grid h-11 w-11 shrink-0 place-items-center rounded-full ${reserved ? 'bg-secondary text-secondary-foreground' : 'bg-primary text-primary-foreground'}`}>
            <Check className="h-5 w-5" />
          </div>
        </div>
      </div>
      <div className="my-5 grid grid-cols-2 gap-3 rounded-2xl bg-card/80 p-4">
        <div>
          <p className="text-xs text-muted-foreground capitalize">{dateLabel}</p>
          <p className="mt-1 flex items-center gap-1.5 font-bold"><Clock3 className="h-4 w-4 text-primary" />{formatHeure(alert.heure_debut)} — {formatHeure(alert.heure_fin)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Point de rendez-vous</p>
          <p className="mt-1 flex items-center gap-1.5 font-bold"><MapPin className="h-4 w-4 text-primary" />{alert.lieu_name ?? 'Stych Strasbourg'}</p>
        </div>
        {alert.moniteur_name && (
          <div className="col-span-2">
            <p className="text-xs text-muted-foreground">Moniteur</p>
            <p className="mt-1 flex items-center gap-1.5 font-bold"><User className="h-4 w-4 text-primary" />{alert.moniteur_name}</p>
          </div>
        )}
      </div>
      {!reserved && (
        <button
          onClick={onReserve}
          disabled={reserving}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-foreground px-5 py-3.5 text-sm font-bold text-background transition hover:gap-3 disabled:opacity-60"
        >
          {reserving ? 'Réservation en cours…' : 'Réserver ce créneau'} <ArrowRight className="h-4 w-4" />
        </button>
      )}
      {reserved && (
        <p className="text-sm font-medium text-muted-foreground">
          Demande de confirmation envoyée à Stych · vérifie sur ton planning Stych que le cours y apparaît bien
        </p>
      )}
    </section>
  );
}
