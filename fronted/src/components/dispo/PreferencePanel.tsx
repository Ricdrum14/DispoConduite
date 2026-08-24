import { X } from 'lucide-react';
import { WEEK_DAYS } from './WeekRoad';
import type { TimeSlot } from '@/types';

const TIME_SLOTS: { value: TimeSlot; label: string }[] = [
  { value: 'MATIN', label: 'Matin' },
  { value: 'MIDI', label: 'Midi' },
  { value: 'APRES_MIDI', label: 'Après-midi' },
  { value: 'SOIR', label: 'Soir' },
];

export interface DraftPrefs {
  days: number[]; // 1=Lundi ... 7=Dimanche
  time_slots: TimeSlot[];
}

interface PreferencePanelProps {
  open: boolean;
  prefs: DraftPrefs;
  saving: boolean;
  onChange: (prefs: DraftPrefs) => void;
  onSave: () => void;
  onClose: () => void;
}

export function PreferencePanel({ open, prefs, saving, onChange, onSave, onClose }: PreferencePanelProps) {
  if (!open) return null;

  const toggleDay = (dayNumber: number) =>
    onChange({
      ...prefs,
      days: prefs.days.includes(dayNumber) ? prefs.days.filter((d) => d !== dayNumber) : [...prefs.days, dayNumber],
    });

  const toggleTime = (value: TimeSlot) =>
    onChange({
      ...prefs,
      time_slots: prefs.time_slots.includes(value)
        ? prefs.time_slots.filter((t) => t !== value)
        : [...prefs.time_slots, value],
    });

  return (
    <div className="fixed inset-0 z-[60] flex items-end bg-foreground/35 p-3 backdrop-blur-sm sm:items-center sm:justify-center">
      <section className="max-h-[85vh] w-full overflow-y-auto rounded-3xl bg-card p-6 shadow-2xl sm:max-w-lg">
        <div className="flex items-start justify-between">
          <div><h2 className="font-display text-2xl font-bold">Mes préférences</h2><p className="mt-1 text-sm text-muted-foreground">Touchez pour activer ou désactiver.</p></div>
          <button aria-label="Fermer" onClick={onClose} className="rounded-full border p-2"><X className="h-4 w-4" /></button>
        </div>
        <p className="mb-3 mt-7 text-xs font-bold uppercase tracking-widest text-muted-foreground">Jours récurrents</p>
        <div className="grid grid-cols-7 gap-1.5">
          {WEEK_DAYS.map((day, i) => (
            <button key={day} onClick={() => toggleDay(i + 1)} className={`rounded-xl py-3 text-xs font-bold transition ${prefs.days.includes(i + 1) ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>{day}</button>
          ))}
        </div>
        <p className="mb-3 mt-6 text-xs font-bold uppercase tracking-widest text-muted-foreground">Moments préférés</p>
        <div className="grid grid-cols-2 gap-2">
          {TIME_SLOTS.map(({ value, label }) => (
            <button key={value} onClick={() => toggleTime(value)} className={`rounded-xl border px-4 py-3 text-sm font-semibold transition ${prefs.time_slots.includes(value) ? 'border-primary bg-primary/10 text-foreground' : 'text-muted-foreground'}`}>{label}</button>
          ))}
        </div>
        <button onClick={onSave} disabled={saving} className="mt-7 w-full rounded-2xl bg-foreground py-3.5 text-sm font-bold text-background disabled:opacity-60">
          {saving ? 'Enregistrement…' : 'Enregistrer mes préférences'}
        </button>
      </section>
    </div>
  );
}
