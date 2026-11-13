import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, qs } from '../../lib/api';
import type {
  AdminDailyRow,
  AdminSubmissionDetail,
  AdminWeeklyList,
  ClientEntry,
  DailyReport,
  EmployeeSummary,
  ServiceSuggestion,
  ServiceTotal,
  SubmissionStatus,
  Task,
  WeeklySubmission,
  WeeklySummary,
} from '../../lib/reports';

export const TASKS_KEY = ['me', 'tasks'] as const;
export const CLIENTS_KEY = ['me', 'clients'] as const;
export const REPORTS_KEY = ['me', 'reports'] as const;
export const SUBMISSION_KEY = ['me', 'reports', 'submission'] as const;

/** Temporary file links expire: refresh lists holding them regularly. */
const LINK_REFRESH_MS = 4 * 60_000;

export function useTasks() {
  return useQuery({
    queryKey: TASKS_KEY,
    queryFn: () => api.get<{ work_date: string; data: Task[] }>('/me/tasks'),
  });
}

export function useClients() {
  return useQuery({
    queryKey: CLIENTS_KEY,
    queryFn: () =>
      api.get<{ work_date: string; data: ClientEntry[]; services: ServiceTotal[] }>('/me/clients'),
  });
}

export function useServiceSuggestions(q: string, enabled: boolean) {
  return useQuery({
    queryKey: ['clients', 'services', q],
    queryFn: () => api.get<{ data: ServiceSuggestion[] }>(`/clients/services${qs({ q })}`),
    enabled,
    staleTime: 60_000,
    select: (r) => r.data,
  });
}

/** Invalidates everything derived from tasks and clients (reports are recomputed server-side). */
function useInvalidateWork() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: TASKS_KEY });
    void qc.invalidateQueries({ queryKey: CLIENTS_KEY });
    void qc.invalidateQueries({ queryKey: REPORTS_KEY });
    void qc.invalidateQueries({ queryKey: ['clients', 'services'] });
  };
}

export function useTaskMutations() {
  const done = useInvalidateWork();
  const add = useMutation({
    mutationFn: (v: { title: string; done: boolean }) => api.post<{ data: Task }>('/me/tasks', v),
    onSuccess: done,
  });
  const qc = useQueryClient();
  type TaskList = { work_date: string; data: Task[] };
  const update = useMutation({
    mutationFn: ({ id, ...v }: { id: number; title?: string; done?: boolean }) =>
      api.patch<{ data: Task }>(`/me/tasks/${id}`, v),
    // The tick shows at once; the server's answer (completion time) replaces it.
    onMutate: async ({ id, title, done: isDone }) => {
      await qc.cancelQueries({ queryKey: TASKS_KEY });
      const prev = qc.getQueryData<TaskList>(TASKS_KEY);
      if (prev)
        qc.setQueryData<TaskList>(TASKS_KEY, {
          ...prev,
          data: prev.data.map((t) =>
            t.id !== id
              ? t
              : {
                  ...t,
                  ...(title !== undefined ? { title } : {}),
                  ...(isDone !== undefined ? { status: isDone ? 'done' : 'planned' } : {}),
                },
          ),
        });
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(TASKS_KEY, ctx.prev);
    },
    onSettled: done,
  });
  const remove = useMutation({
    mutationFn: (id: number) => api.del(`/me/tasks/${id}`),
    onSuccess: done,
  });
  return { add, update, remove };
}

export interface ClientInput {
  name: string;
  service: string;
  quantity: number;
}

export function useClientMutations() {
  const done = useInvalidateWork();
  const add = useMutation({
    mutationFn: (v: ClientInput) => api.post<{ data: ClientEntry }>('/me/clients', v),
    onSuccess: done,
  });
  const update = useMutation({
    mutationFn: ({ id, ...v }: ClientInput & { id: number }) =>
      api.patch<{ data: ClientEntry }>(`/me/clients/${id}`, v),
    onSuccess: done,
  });
  const remove = useMutation({
    mutationFn: (id: number) => api.del(`/me/clients/${id}`),
    onSuccess: done,
  });
  return { add, update, remove };
}

export function useDailyReport(date: string | undefined) {
  return useQuery({
    queryKey: [...REPORTS_KEY, 'daily', date ?? 'today'],
    queryFn: () => api.get<{ data: DailyReport }>(`/me/reports/daily${qs({ date })}`),
    select: (r) => r.data,
  });
}

export function useWeeklySummary(date: string | undefined) {
  return useQuery({
    queryKey: [...REPORTS_KEY, 'weekly', date ?? 'today'],
    queryFn: () => api.get<{ data: WeeklySummary }>(`/me/reports/weekly${qs({ date })}`),
    select: (r) => r.data,
  });
}

export function useSubmissionStatus() {
  return useQuery({
    queryKey: SUBMISSION_KEY,
    queryFn: () => api.get<{ data: SubmissionStatus }>('/me/reports/weekly/submission'),
    select: (r) => r.data,
    refetchInterval: LINK_REFRESH_MS,
  });
}

export function useUploadReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => {
      const fd = new FormData();
      fd.append('file', file);
      return api.post<{ data: WeeklySubmission }>('/me/reports/weekly/submission', fd);
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: SUBMISSION_KEY }),
  });
}

/* Admin views */

export function useAdminDaily(date: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ['admin', 'reports', 'daily', date ?? 'today'],
    queryFn: () =>
      api.get<{ work_date: string; data: AdminDailyRow[] }>(`/admin/reports/daily${qs({ date })}`),
    enabled,
  });
}

export function useAdminWeekly(date: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ['admin', 'reports', 'weekly', date ?? 'today'],
    queryFn: () => api.get<AdminWeeklyList>(`/admin/reports/weekly${qs({ date })}`),
    enabled,
    refetchInterval: LINK_REFRESH_MS,
  });
}

export function useAdminSubmission(id: string | undefined) {
  return useQuery({
    queryKey: ['admin', 'reports', 'submission', id],
    queryFn: () =>
      api.get<{ data: AdminSubmissionDetail }>(`/admin/reports/weekly/submissions/${id}`),
    enabled: Boolean(id),
    select: (r) => r.data,
    refetchInterval: LINK_REFRESH_MS,
  });
}

export function useAdminUserWeekly(id: string | undefined, date: string | undefined) {
  return useQuery({
    queryKey: ['admin', 'reports', 'user-weekly', id, date ?? 'today'],
    queryFn: () =>
      api.get<{ user: EmployeeSummary; data: WeeklySummary }>(
        `/admin/users/${id}/reports/weekly${qs({ date })}`,
      ),
    enabled: Boolean(id),
  });
}
