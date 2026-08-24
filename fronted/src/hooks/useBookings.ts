import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import type { Booking } from '@/types';

export function useBookings() {
  return useQuery({
    queryKey: ['bookings'],
    queryFn: () => api.get<Booking[]>('/bookings').then(r => r.data),
  });
}

export function useConfirmBookingFromAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (slotAlertId: string) =>
      api.post<Booking>(`/bookings/from-alert/${slotAlertId}`).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bookings'] });
      qc.invalidateQueries({ queryKey: ['slot-alerts'] });
    },
  });
}
