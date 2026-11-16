import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import type { AdminDashboard, MyDashboard } from './types';

const unwrap = <T>(r: { data: T }) => r.data;

export const MY_DASHBOARD_KEY = ['me', 'dashboard'] as const;
export const ADMIN_DASHBOARD_KEY = ['admin', 'dashboard'] as const;
export const fetchMyDashboard = () =>
  api.get<{ data: MyDashboard }>('/me/dashboard', { retries: 1 }).then(unwrap);
export const fetchAdminDashboard = () =>
  api.get<{ data: AdminDashboard }>('/admin/dashboard', { retries: 1 }).then(unwrap);

export function useMyDashboard(enabled = true) {
  return useQuery({
    queryKey: MY_DASHBOARD_KEY,
    queryFn: fetchMyDashboard,
    staleTime: 60_000,
    enabled,
    refetchInterval: 5 * 60_000,
  });
}

export function useAdminDashboard(enabled = true) {
  return useQuery({
    queryKey: ADMIN_DASHBOARD_KEY,
    queryFn: fetchAdminDashboard,
    staleTime: 60_000,
    enabled,
    refetchInterval: 2 * 60_000,
  });
}
