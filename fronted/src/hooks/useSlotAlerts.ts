import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import type { SlotAlert } from '@/types';

export function useSlotAlerts() {
  return useQuery({
    queryKey: ['slot-alerts'],
    queryFn: () => api.get<SlotAlert[]>('/slot-alerts').then(r => r.data),
    // Rafraîchi souvent : une alerte notifiée mérite d'apparaître vite (cahier des charges §8).
    refetchInterval: 30_000,
  });
}

export function useLatestSlotAlert() {
  return useQuery({
    queryKey: ['slot-alerts', 'latest'],
    queryFn: () => api.get<SlotAlert | null>('/slot-alerts/latest').then(r => r.data),
    refetchInterval: 30_000,
  });
}

// Tous les créneaux actuellement disponibles — alimente le panneau de la cloche.
export function useActiveSlotAlerts() {
  return useQuery({
    queryKey: ['slot-alerts', 'active'],
    queryFn: () => api.get<SlotAlert[]>('/slot-alerts/active').then(r => r.data),
    refetchInterval: 30_000,
  });
}
