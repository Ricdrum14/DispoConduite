import { Pause, Radar } from 'lucide-react';

interface StatusHeroProps {
  active: boolean;
  onToggle: () => void;
}

export function StatusHero({ active, onToggle }: StatusHeroProps) {
  return (
    <section className="relative overflow-hidden rounded-3xl bg-foreground p-6 text-background shadow-2xl shadow-foreground/10 sm:p-8">
      <div className="absolute -right-12 -top-12 h-44 w-44 rounded-full border-[26px] border-primary/25" />
      <div className="absolute right-24 top-8 h-28 w-28 rounded-full border-[14px] border-primary/20" />
      <div className="absolute right-4 bottom-4 h-20 w-20 rounded-full bg-primary/15" />
      <svg viewBox="0 0 100 100" className="absolute right-1/2 top-1/2 h-40 w-40 -translate-y-1/2 translate-x-1/4 opacity-[0.13] sm:h-48 sm:w-48" fill="none" stroke="hsl(var(--primary))" strokeWidth="5" strokeLinecap="round">
        <circle cx="50" cy="50" r="34" />
        <path d="M50 16 V44" /><path d="M16 50 H44" /><path d="M50 84 V56" />
        <circle cx="50" cy="50" r="9" fill="hsl(var(--primary))" stroke="none" />
      </svg>
      <div className="relative flex flex-col justify-between gap-7 sm:flex-row sm:items-end">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-background/10 px-3 py-1.5 text-xs font-semibold">
            <span className={`h-2 w-2 rounded-full ${active ? 'bg-primary animate-pulse' : 'bg-muted-foreground'}`} />
            {active ? 'Veille active' : 'Veille en pause'}
          </span>
          <h1 className="mt-5 max-w-lg font-display text-3xl font-bold tracking-tight sm:text-4xl">Votre prochain créneau est peut-être déjà en route.</h1>
          <p className="mt-3 max-w-md text-sm leading-6 text-background/65">On surveille les disponibilités selon votre semaine normale, sans rafraîchir l'application.</p>
        </div>
        <button onClick={onToggle} className="inline-flex w-fit items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-bold text-primary-foreground transition hover:scale-[1.02]">
          {active ? <Pause className="h-4 w-4" /> : <Radar className="h-4 w-4" />}
          {active ? 'Mettre en pause' : 'Relancer la veille'}
        </button>
      </div>
    </section>
  );
}
