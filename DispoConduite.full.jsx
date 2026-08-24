/* ============================================================================
 * DISPO CONDUITE — Fichier consolidé (V0 prototype réaliste)
 * ============================================================================
 *
 * Ce fichier regroupe TOUT le code frontend réalisé pour la V0, dans un seul
 * fichier autoportant pour que tu puisses le récupérer et le gérer de ton côté.
 *
 * En production sur Base44, ce code est normalement éclaté en composants séparés
 * (src/components/dispo/* + src/pages/Home.jsx). Ici tout est inline pour faciliter
 * la lecture et la copie.
 *
 * ----------------------------------------------------------------------------
 * ARCHITECTURE PROPOSÉE POUR LE BACKEND (branchement Stych réel)
 * ----------------------------------------------------------------------------
 *
 * Structure de fichiers :
 *
 *   base44/
 *   ├── shared/
 *   │   └── stychClient.js        ← Connecteur Stych (auth, fetch, check, confirm)
 *   ├── entities/
 *   │   ├── SearchProfile.jsonc   ← Préférences (jours, tranches, moniteur, durée, priorité)
 *   │   ├── SlotAlert.jsonc       ← Créneaux détectés (statut: nouveau/notifié/réservé/manqué)
 *   │   └── Booking.jsonc         ← Réservations confirmées
 *   ├── functions/
 *   │   ├── pollStychSlots/       ← Scan + matching + création d'alertes
 *   │   └── reserveStychSlot/     ← Check dispo + confirm réservation
 *   └── workflows/
 *       └── stychPoller.jsonc    ← Tâche planifiée toutes les 10 min
 *
 * Flux :
 *   1. Workflow (toutes les 10 min) → appelle pollStychSlots
 *   2. pollStychSlots → stychClient.fetchSlots(cookie) → match contre SearchProfile
 *      → crée SlotAlert (statut "nouveau")
 *   3. Frontend voit l'alerte → bouton "Réserver" → reserveStychSlot
 *      → stychClient.checkThenConfirm() → crée Booking
 *   4. Dashboard lit Booking + SlotAlert pour les stats
 *
 * Sécurité : le cookie Stych stocké via set_secrets (jamais exposé au frontend).
 *
 * ----------------------------------------------------------------------------
 * CONNECTEUR STYCH — Endpoints identifiés (à implémenter dans stychClient.js)
 * ----------------------------------------------------------------------------
 *
 * Authentification :
 *   - Session utilisateur classique (cookie de session après connexion stych.fr)
 *   - Jeton CSRF (token_csrf) obligatoire, injecté dans le HTML de chaque page.
 *     Le bot doit d'abord récupérer une page authentifiée pour en extraire le token.
 *
 * Endpoints :
 *
 *   POST https://www.stych.fr/elearning/planning-conduite/get-planning-proposition
 *     Form Data : token_csrf, calledFromFilter (0=tous, 1=filtré),
 *                 ids_lac?, ids_ut_moniteur?, aryDuration?, aryIdDay?, timesPref?
 *     Recommandation : calledFromFilter=0 pour tout récupérer, matching côté bot.
 *     Réponse : { statut, rowsProposition[], rowsMoniteur[], rowsPointDeCours[],
 *                nbCreditAvailable, nbCreditSelected, idTypeCoursSearched,
 *                typeCoursSearched, planningTimer, readOnly }
 *     Signal de détection : rowsProposition.length > 0
 *
 *   POST https://www.stych.fr/elearning/planning-conduite/is-cours-available
 *     Vérification avant réservation (anti-conflit).
 *     Params : id_type_cours_conduite, rowsPropositionSelected
 *
 *   POST https://www.stych.fr/elearning/planning-conduite/confirm-planning-proposition
 *     Réservation finale. Mêmes paramètres que is-cours-available.
 *
 *   Autres endpoints utiles :
 *     /elearning/planning-conduite/get-preference-planning          (lire préférences)
 *     /elearning/planning-conduite/record-preference-planning       (enregistrer)
 *     /elearning/planning-conduite/get-point-de-cours-preference    (lieux favoris)
 *     /elearning/planning-conduite/add-point-de-cours               (ajouter lieu)
 *     /elearning/planning-conduite/record-point-de-cours-preference (dispos par jour)
 *     /elearning/planning-conduite/find-point-de-cours              (lieu + proche)
 *
 * Structure d'un élément de rowsProposition :
 *   { id_user, moniteur, id_lac, ids_lac_possible[], info_date, id_jour,
 *     heure_debut, heure_fin, heure_debut_fr, heure_fin_fr, nb_credit, nb_heure }
 *
 * Point de vigilance : mécanisme planningTimer (compte à rebours). Comportement
 * après expiration à vérifier en conditions réelles.
 *
 * ----------------------------------------------------------------------------
 * DESIGN TOKENS (src/index.css) — à reporter dans ton projet
 * ----------------------------------------------------------------------------
 *
 *   :root {
 *     --background: 36 33% 97%;
 *     --foreground: 215 28% 14%;
 *     --primary: 12 91% 61%;        ← orange corail vif
 *     --secondary: 35 30% 92%;
 *     --accent: 12 89% 94%;
 *     --border: 34 18% 85%;
 *     --radius: 1rem;
 *     --font-heading: 'Manrope', ui-sans-serif, sans-serif;
 *     --font-body: 'DM Sans', ui-sans-serif, sans-serif;
 *     --font-display: 'Manrope', ui-sans-serif, sans-serif;
 *   }
 *
 *   @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Manrope:wght@600;700;800&display=swap');
 *
 * ============================================================================
 */

import React, { useEffect, useState } from 'react';
import {
  CarFront, Bell, Radar, Pause, ArrowRight, Check, Clock3, MapPin,
  X, SlidersHorizontal, Gauge, Hourglass, Route,
} from 'lucide-react';

/* ──────────────────────────────────────────────────────────────────────── */
/*  AppHeader                                                                 */
/* ──────────────────────────────────────────────────────────────────────── */

function AppHeader() {
  return (
    <header className="flex items-center justify-between py-5">
      <div className="flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
          <CarFront className="h-5 w-5" />
        </div>
        <div>
          <p className="font-display text-xl font-bold leading-none">DispoConduite</p>
          <p className="mt-1 text-xs text-muted-foreground">Stych · Strasbourg</p>
        </div>
      </div>
      <button aria-label="Notifications" className="relative grid h-10 w-10 place-items-center rounded-full border bg-card transition hover:-translate-y-0.5">
        <Bell className="h-4 w-4" />
        <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary ring-2 ring-card" />
      </button>
    </header>
  );
}

/* ──────────────────────────────────────────────────────────────────────── */
/*  StatusHero — hero sombre avec cercles orange + volant stylisé            */
/* ──────────────────────────────────────────────────────────────────────── */

function StatusHero({ active, onToggle }) {
  return (
    <section className="relative overflow-hidden rounded-3xl bg-foreground p-6 text-background shadow-2xl shadow-foreground/10 sm:p-8">
      {/* Cercles orange décoratifs à droite */}
      <div className="absolute -right-12 -top-12 h-44 w-44 rounded-full border-[26px] border-primary/25" />
      <div className="absolute right-24 top-8 h-28 w-28 rounded-full border-[14px] border-primary/20" />
      <div className="absolute right-4 bottom-4 h-20 w-20 rounded-full bg-primary/15" />
      {/* Volant stylisé */}
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

/* ──────────────────────────────────────────────────────────────────────── */
/*  WeekRoad — timeline horizontale des jours surveillés                     */
/* ──────────────────────────────────────────────────────────────────────── */

const WEEK_DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

function WeekRoad({ selectedDays }) {
  return (
    <section className="rounded-3xl border bg-card p-5 sm:p-6">
      <div className="mb-7 flex items-center justify-between">
        <div><p className="font-display font-bold">Votre route de la semaine</p><p className="mt-1 text-xs text-muted-foreground">Jours surveillés en priorité</p></div>
        <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold">Semaine normale</span>
      </div>
      <div className="relative flex justify-between">
        <div className="absolute left-4 right-4 top-3 h-0.5 bg-border" />
        {WEEK_DAYS.map((day) => {
          const active = selectedDays.includes(day);
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

/* ──────────────────────────────────────────────────────────────────────── */
/*  OpportunityCard — carte de créneau détecté / réservé                      */
/* ──────────────────────────────────────────────────────────────────────── */

function OpportunityCard({ reserved, onReserve }) {
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
        <div><p className="text-xs text-muted-foreground">Mercredi 12 août</p><p className="mt-1 flex items-center gap-1.5 font-bold"><Clock3 className="h-4 w-4 text-primary" />10h00 — 11h00</p></div>
        <div><p className="text-xs text-muted-foreground">Point de rendez-vous</p><p className="mt-1 flex items-center gap-1.5 font-bold"><MapPin className="h-4 w-4 text-primary" />Stych Strasbourg</p></div>
      </div>
      {!reserved && <button onClick={onReserve} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-foreground px-5 py-3.5 text-sm font-bold text-background transition hover:gap-3">Réserver ce créneau <ArrowRight className="h-4 w-4" /></button>}
      {reserved && <p className="text-sm font-medium text-muted-foreground">Confirmation enregistrée · rappel activé avant la leçon</p>}
    </section>
  );
}

/* ──────────────────────────────────────────────────────────────────────── */
/*  PreferencePanel — modal de préférences (jours + tranches horaires)        */
/* ──────────────────────────────────────────────────────────────────────── */

const TIME_SLOTS = ['Matin', 'Midi', 'Après-midi', 'Soir'];

function PreferencePanel({ open, prefs, onChange, onClose }) {
  if (!open) return null;
  const toggle = (key, value) => onChange({
    ...prefs,
    [key]: prefs[key].includes(value) ? prefs[key].filter((item) => item !== value) : [...prefs[key], value],
  });
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-foreground/35 p-3 backdrop-blur-sm sm:items-center sm:justify-center">
      <section className="w-full rounded-3xl bg-card p-6 shadow-2xl sm:max-w-lg">
        <div className="flex items-start justify-between">
          <div><h2 className="font-display text-2xl font-bold">Mes préférences</h2><p className="mt-1 text-sm text-muted-foreground">Touchez pour activer ou désactiver.</p></div>
          <button aria-label="Fermer" onClick={onClose} className="rounded-full border p-2"><X className="h-4 w-4" /></button>
        </div>
        <p className="mb-3 mt-7 text-xs font-bold uppercase tracking-widest text-muted-foreground">Jours récurrents</p>
        <div className="grid grid-cols-7 gap-1.5">
          {WEEK_DAYS.map((day) => (
            <button key={day} onClick={() => toggle('days', day)} className={`rounded-xl py-3 text-xs font-bold transition ${prefs.days.includes(day) ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>{day}</button>
          ))}
        </div>
        <p className="mb-3 mt-6 text-xs font-bold uppercase tracking-widest text-muted-foreground">Moments préférés</p>
        <div className="grid grid-cols-2 gap-2">
          {TIME_SLOTS.map((time) => (
            <button key={time} onClick={() => toggle('times', time)} className={`rounded-xl border px-4 py-3 text-sm font-semibold transition ${prefs.times.includes(time) ? 'border-primary bg-primary/10 text-foreground' : 'text-muted-foreground'}`}>{time}</button>
          ))}
        </div>
        <button onClick={onClose} className="mt-7 w-full rounded-2xl bg-foreground py-3.5 text-sm font-bold text-background">Enregistrer mes préférences</button>
      </section>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────── */
/*  StatsRow — cartes de statistiques (heures, attente)                       */
/* ──────────────────────────────────────────────────────────────────────── */

const STATS = [
  { icon: Route, label: 'Heures effectuées', value: '18 h' },
  { icon: Gauge, label: 'Heures restantes', value: '12 h' },
  { icon: Hourglass, label: 'Attente moyenne', value: '4 j' },
];

function StatsRow() {
  return (
    <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {STATS.map(({ icon: Icon, label, value }) => (
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

/* ──────────────────────────────────────────────────────────────────────── */
/*  Home — page principale assemblant tous les composants                      */
/* ──────────────────────────────────────────────────────────────────────── */

const DEFAULT_PREFS = { days: ['Lun', 'Mer', 'Sam'], times: ['Matin'] };

export default function DispoConduiteFull() {
  const [active, setActive] = useState(true);
  const [reserved, setReserved] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [prefs, setPrefs] = useState(() => JSON.parse(localStorage.getItem('dispo-prefs') || 'null') || DEFAULT_PREFS);

  useEffect(() => { localStorage.setItem('dispo-prefs', JSON.stringify(prefs)); }, [prefs]);

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-6xl px-4 pb-12 sm:px-6">
        <AppHeader />
        <StatusHero active={active} onToggle={() => setActive(!active)} />
        <div className="mt-5 grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
          <div className="space-y-5">
            <OpportunityCard reserved={reserved} onReserve={() => setReserved(true)} />
            <StatsRow />
          </div>
          <div className="space-y-5">
            <WeekRoad selectedDays={prefs.days} />
            <section className="rounded-3xl border bg-card p-5 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-display font-bold">Préférences actives</p>
                  <p className="mt-1 text-xs text-muted-foreground">{prefs.times.join(' · ') || 'Aucune plage'} · 1 leçon / semaine</p>
                </div>
                <button onClick={() => setPanelOpen(true)} className="inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-2.5 text-xs font-bold transition hover:bg-accent">
                  <SlidersHorizontal className="h-4 w-4" />Ajuster
                </button>
              </div>
            </section>
            <section className="rounded-3xl bg-secondary p-5 sm:p-6">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Dernière vérification</p>
              <div className="mt-3 flex items-end justify-between">
                <p className="font-display text-xl font-bold">À l'instant</p>
                <p className="text-xs text-muted-foreground">Prochaine dans 8 min</p>
              </div>
            </section>
          </div>
        </div>
      </div>
      <PreferencePanel open={panelOpen} prefs={prefs} onChange={setPrefs} onClose={() => setPanelOpen(false)} />
    </main>
  );
}

/* ============================================================================
 *  ROUTAGE — à reporter dans src/App.jsx
 * ----------------------------------------------------------------------------
 *  import DispoConduiteFull from '@/DispoConduite.full';
 *  <Route path="/" element={<DispoConduiteFull />} />
 * ============================================================================
 */