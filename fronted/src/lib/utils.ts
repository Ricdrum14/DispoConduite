import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Stych renvoie les heures avec les secondes ("09:15:00") — jamais utile à afficher.
export function formatHeure(heure: string): string {
  return heure.slice(0, 5);
}
