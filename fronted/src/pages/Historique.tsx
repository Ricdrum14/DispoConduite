import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CalendarCheck } from 'lucide-react';
import { useBookings } from '@/hooks/useBookings';
import { formatHeure } from '@/lib/utils';

export default function Historique() {
  const { data: bookings, isLoading } = useBookings();

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="font-display text-2xl font-bold mb-5">Historique des leçons</h1>

      {isLoading && <p className="text-sm text-muted-foreground">Chargement…</p>}

      {!isLoading && (bookings ?? []).length === 0 && (
        <div className="rounded-3xl border bg-card p-8 text-center text-muted-foreground">
          <CalendarCheck className="h-8 w-8 mx-auto mb-3 text-primary" />
          Aucune leçon réservée pour l'instant.
        </div>
      )}

      <div className="space-y-3">
        {(bookings ?? []).map((booking) => (
          <div key={booking.id} className="rounded-2xl border bg-card p-4 flex items-center justify-between">
            <div>
              <p className="font-semibold capitalize">{format(new Date(booking.course_date), 'EEEE d MMMM', { locale: fr })}</p>
              <p className="text-sm text-muted-foreground">
                {formatHeure(booking.heure_debut)} — {formatHeure(booking.heure_fin)}
                {booking.lieu_name ? ` · ${booking.lieu_name}` : ''}
                {booking.moniteur_name ? ` · ${booking.moniteur_name}` : ''}
              </p>
            </div>
            <span className="text-xs font-semibold rounded-full bg-secondary px-3 py-1">{booking.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
