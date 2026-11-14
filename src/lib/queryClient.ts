import { QueryClient } from '@tanstack/react-query';
import { ApiError, onWriteSuccess } from './api';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // The API client already retries transient errors with backoff.
      retry: (count, error) => error instanceof ApiError && error.transient && count < 1,
      refetchOnWindowFocus: true,
      staleTime: 15_000,
    },
    mutations: { retry: false },
  },
});

/**
 * Dashboards aggregate check-ins, tasks, clients, reports and approvals: any successful
 * write may change their figures, so they are refreshed right away (UX6-01 / UX6-02).
 */
export const DASHBOARD_KEYS = [
  ['me', 'dashboard'],
  ['admin', 'dashboard'],
] as const;

export function invalidateDashboards(qc: QueryClient = queryClient) {
  for (const queryKey of DASHBOARD_KEYS) void qc.invalidateQueries({ queryKey: [...queryKey] });
}

onWriteSuccess(() => invalidateDashboards(queryClient));
