import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import type { AdminDashboard, MyDashboard } from './types';

const unwrap = <T>(r: { data: T }) => r.data;

export function useMyDashboard(enabled = true) {
  return useQuery({
    queryKey: ['me', 'dashboard'],
    queryFn: () => api.get<{ data: MyDashboard }>('/me/dashboard').then(unwrap),
    enabled,
    refetchInterval: 5 * 60_000,
  });
}

export function useAdminDashboard(enabled = true) {
  return useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: () => api.get<{ data: AdminDashboard }>('/admin/dashboard').then(unwrap),
    enabled,
    refetchInterval: 2 * 60_000,
  });
}
