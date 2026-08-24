export const WEEK_DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

// id_jour Stych : 1=Lundi ... 7=Dimanche
export function dayLabelForIndex(dayNumber: number): string {
  return WEEK_DAYS[dayNumber - 1] ?? '';
}

interface WeekRoadProps {
  selectedDayNumbers: number[];
  profileName?: string;
}

export function WeekRoad({ selectedDayNumbers, profileName }: WeekRoadProps) {
  return (
    <section className="rounded-3xl border bg-card p-5 sm:p-6">
      <div className="mb-7 flex items-center justify-between">
        <div><p className="font-display font-bold">Votre route de la semaine</p><p className="mt-1 text-xs text-muted-foreground">Jours surveillés en priorité</p></div>
        <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold">{profileName ?? 'Semaine normale'}</span>
      </div>
      <div className="relative flex justify-between">
        <div className="absolute left-4 right-4 top-3 h-0.5 bg-border" />
        {WEEK_DAYS.map((day, i) => {
          const active = selectedDayNumbers.includes(i + 1);
          return (
            <div key={day} className="relative z-10 flex flex-col items-center gap-3">
              <span className={`h-6 w-6 rounded-full border-4 transition ${active ? 'border-primary bg-primary shadow-md shadow-primary/30' : 'border-card bg-border'}`} />
              <span className={`text-[11px] font-semibold ${active ? 'text-foreground' : 'text-muted-foreground'}`}>{day}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
