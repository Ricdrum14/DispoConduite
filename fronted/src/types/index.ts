export type TimeSlot = 'MATIN' | 'MIDI' | 'APRES_MIDI' | 'SOIR';
export type CourseType = 'LECON_CONDUITE' | 'PLACE_EXAMEN';
export type SlotAlertStatus = 'NOUVEAU' | 'NOTIFIE' | 'RESERVE' | 'MANQUE' | 'EXPIRE';
export type BookingStatus = 'CONFIRMEE' | 'ANNULEE' | 'TERMINEE';

export interface SearchProfile {
  id: string;
  name: string;
  is_active: boolean;
  days: number[];
  time_slots: TimeSlot[];
  course_type: CourseType;
  moniteur_id?: string | null;
  duration_minutes?: number | null;
  created_at: string;
  updated_at: string;
}

export interface SlotAlert {
  id: string;
  status: SlotAlertStatus;
  moniteur_name?: string | null;
  lieu_name?: string | null;
  course_date: string;
  heure_debut: string;
  heure_fin: string;
  nb_credit?: number | null;
  nb_heure?: number | null;
  detected_at: string;
  notified_at?: string | null;
}

export interface Booking {
  id: string;
  status: BookingStatus;
  moniteur_name?: string | null;
  lieu_name?: string | null;
  course_date: string;
  heure_debut: string;
  heure_fin: string;
  nb_credit?: number | null;
  nb_heure?: number | null;
  confirmed_at: string;
}

export interface StychStatus {
  connected: boolean;
  connectedAt: string | null;
  sessionExpired: boolean;
  agence: string | null;
  pollingPaused: boolean;
}
