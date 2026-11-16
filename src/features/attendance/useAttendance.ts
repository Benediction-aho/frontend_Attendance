import { useQuery } from '@tanstack/react-query';
import { api, qs } from '../../lib/api';
import type { Attendance, Holiday, Leave, Today, WorkScheduleInfo } from '../../lib/attendance';
import { syncFromServerTimestamp } from '../../lib/serverTime';
import type { PageMeta } from '../../lib/types';

export const TODAY_KEY = ['attendance', 'today'] as const;

export async function fetchToday(): Promise<Today> {
  const sentAt = Date.now();
  const t = await api.get<Today>('/attendance/today');
  // Half the round trip approximates when the server read its clock.
  const receivedAt = Date.now();
  if (typeof t.server_timestamp_ms === 'number')
    syncFromServerTimestamp(t.server_timestamp_ms, sentAt + (receivedAt - sentAt) / 2);
  else if (t.server_time) syncFromServerTimestamp(t.server_time, receivedAt);
  return t;
}

export function useToday(enabled = true) {
  return useQuery({
    queryKey: TODAY_KEY,
    queryFn: fetchToday,
    enabled,
    // Always asked again when the screen opens: a cached day is shown meanwhile, but the
    // check-in actions wait for the server's answer (TodayPage).
    staleTime: 0,
    // The day changes at midnight and admins can act on it: refresh regularly.
    refetchInterval: 60_000,
  });
}

export function useHistory(path: string, from?: string, to?: string, page = 1) {
  return useQuery({
    queryKey: ['attendance', 'history', path, from, to, page],
    queryFn: () =>
      api.get<{ data: Attendance[]; meta: PageMeta }>(
        `${path}${qs({ from, to, page, per_page: 31 })}`,
      ),
  });
}

export const SCHEDULE_KEY = ['me', 'work-schedule'] as const;

export const fetchSchedule = () => api.get<WorkScheduleInfo>('/me/work-schedule');

export function useMySchedule(enabled = true) {
  return useQuery({
    queryKey: SCHEDULE_KEY,
    queryFn: fetchSchedule,
    enabled,
    staleTime: 5 * 60_000,
  });
}

export function useMyLeaves(enabled = true) {
  return useQuery({
    queryKey: ['me', 'leaves'],
    queryFn: async () => (await api.get<{ data: Leave[] }>('/me/leaves')).data,
    enabled,
  });
}

export function useHolidays(year: number) {
  return useQuery({
    queryKey: ['holidays', year],
    staleTime: 60 * 60_000,
    queryFn: async () => (await api.get<{ data: Holiday[] }>(`/holidays${qs({ year })}`)).data,
  });
}
