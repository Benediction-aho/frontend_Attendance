import { useQuery } from '@tanstack/react-query';
import { api, qs } from '../../../lib/api';
import type { DayRow } from '../../../lib/attendance';

export interface DayResponse {
  date: string;
  server_time: string;
  data: DayRow[];
}

export function useDay(date: string, enabled = true) {
  return useQuery({
    enabled,
    queryKey: ['admin', 'attendance', 'day', date],
    queryFn: () => api.get<DayResponse>(`/admin/attendance/day${qs({ date })}`),
    refetchInterval: 60_000,
  });
}

export const fullName = (u: { first_name: string; last_name: string }) =>
  `${u.first_name} ${u.last_name}`;
