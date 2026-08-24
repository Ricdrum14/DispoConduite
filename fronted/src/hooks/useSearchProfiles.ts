import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import type { SearchProfile } from '@/types';

export function useSearchProfiles() {
  return useQuery({
    queryKey: ['search-profiles'],
    queryFn: () => api.get<SearchProfile[]>('/search-profiles').then(r => r.data),
  });
}

export function useCreateSearchProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<SearchProfile>) => api.post('/search-profiles', data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['search-profiles'] }),
  });
}

export function useUpdateSearchProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<SearchProfile> & { id: string }) =>
      api.patch(`/search-profiles/${id}`, data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['search-profiles'] }),
  });
}

export function useDeleteSearchProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/search-profiles/${id}`).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['search-profiles'] }),
  });
}
