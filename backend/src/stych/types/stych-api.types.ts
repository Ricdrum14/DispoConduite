// Formes déduites de l'annexe technique du cahier des charges
// (inspection réseau de stych.fr — voir cahier-des-charges-bot-dispo-conduite.md).

export interface StychSlot {
  id_user: string; // id du moniteur
  moniteur: string; // nom du moniteur affiché
  id_lac: string; // id du lieu de cours
  ids_lac_possible?: string[];
  info_date: string; // date du cours
  id_jour: string; // jour de la semaine (1-7)
  heure_debut: string; // "17:30"
  heure_fin: string; // "19:00"
  heure_debut_fr?: string;
  heure_fin_fr?: string;
  nb_credit: string | number;
  nb_heure: string | number; // 0.75 = 45min, 1.5 = 90min
}

export interface StychPlanningPropositionResponse {
  statut: string;
  rowsProposition: StychSlot[];
  rowsMoniteur?: unknown[];
  rowsPointDeCours?: unknown[];
  nbCreditAvailable?: number;
  nbCreditSelected?: number;
  idTypeCoursSearched?: number;
  typeCoursSearched?: string;
  planningTimer?: number;
  readOnly?: number;
}

// Contexte de session nécessaire pour appeler l'API Stych au nom d'un utilisateur.
// `userId` permet au connecteur de réenregistrer le cookie renouvelé par
// Stych à chaque appel (voir StychClientService.post) sans que les couches
// au-dessus aient à s'en soucier.
export interface StychSession {
  userId: string;
  sessionCookie: string;
  csrfToken: string;
}
