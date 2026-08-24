import { Route, Gauge, Hourglass } from 'lucide-react';
import type { Booking, SlotAlert } from '@/types';

interface StatsRowProps {
  bookings: Booking[];
  activeAlerts: SlotAlert[];
}

function averageWaitDays(bookings: Booking[]): string {
  if (bookings.length < 2) return '—';
  const sorted = [...bookings].sort((a, b) => new Date(a.confirmed_at).getTime() - new Date(b.confirmed_at).getTime());
  const gaps: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const diffMs = new Date(sorted[i].confirmed_at).getTime() - new Date(sorted[i - 1].confirmed_at).getTime();
    gaps.push(diffMs / (1000 * 60 * 60 * 24));
  }
  const avg = gaps.reduce((a, b) => a + b, 0) / gaps.length;
  return `${Math.round(avg)} j`;
}

export function StatsRow({ bookings, activeAlerts }: StatsRowProps) {
  const confirmedBookings = bookings.filter((b) => b.status === 'CONFIRMEE');
  const heuresEffectuees = confirmedBookings.reduce((sum, b) => sum + (b.nb_heure ?? 0), 0);

  const stats = [
    { icon: Route, label: 'Heures effectuées', value: `${heuresEffectuees} h` },
    { icon: Gauge, label: 'Créneaux en attente', value: String(activeAlerts.length) },
    { icon: Hourglass, label: 'Attente moyenne', value: averageWaitDays(confirmedBookings) },
  ];

  return (
    <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {stats.map(({ icon: Icon, label, value }) => (
        <div key={label} className="relative overflow-hidden rounded-3xl border bg-card p-5">
          <div className="absolute -right-5 -top-5 h-16 w-16 rounded-full bg-primary/10" />
          <Icon className="relative mb-5 grid h-9 w-9 place-items-center rounded-full bg-primary/10 p-2 text-primary" />
          <p className="relative font-display text-2xl font-bold">{value}</p>
          <p className="relative mt-1 text-xs text-muted-foreground">{label}</p>
        </div>
      ))}
    </section>
  );
}
