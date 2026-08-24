import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import type { StychStatus } from '@/types';

export function useStychStatus() {
  return useQuery({
    queryKey: ['stych-status'],
    queryFn: () => api.get<StychStatus>('/stych/status').then(r => r.data),
  });
}

export function useConnectStych() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { sessionCookie: string; csrfToken: string; agence?: string }) =>
      api.post('/stych/connect', data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['stych-status'] }),
  });
}

export function useDisconnectStych() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.delete('/stych/connect').then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['stych-status'] }),
  });
}

// "Vérifier maintenant" — rafraîchissement manuel en plus du cycle de veille automatique.
export function useCheckStychSlotsNow() {
  return useMutation({
    mutationFn: () => api.get('/stych/slots').then(r => r.data),
  });
}

export function useTogglePolling() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (paused: boolean) => api.post(`/stych/${paused ? 'pause' : 'resume'}`).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['stych-status'] }),
  });
}
