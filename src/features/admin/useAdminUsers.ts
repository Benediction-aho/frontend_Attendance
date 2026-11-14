import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, qs } from '../../lib/api';
import type { Paginated, PermissionTier, Role, User } from '../../lib/types';

export interface UserFilters {
  q?: string;
  status?: string;
  role?: string;
  employee_type?: string;
  page?: number;
  per_page?: number;
}

export function useUsers(f: UserFilters) {
  return useQuery({
    queryKey: ['admin', 'users', 'list', f],
    queryFn: () => api.get<Paginated<User>>(`/admin/users${qs({ ...f })}`),
    placeholderData: (p) => p,
  });
}

export function useUser(id: number) {
  return useQuery({
    queryKey: ['admin', 'users', 'one', id],
    queryFn: async () => (await api.get<{ data: User }>(`/admin/users/${id}`)).data,
  });
}

export function usePermissionCatalogue(enabled: boolean) {
  return useQuery({
    queryKey: ['admin', 'permissions'],
    queryFn: async () => (await api.get<{ data: PermissionTier[] }>('/admin/permissions')).data,
    enabled,
    staleTime: 10 * 60_000,
  });
}

export type UserAction =
  | { kind: 'approve' }
  | { kind: 'reject' }
  | { kind: 'block' }
  | { kind: 'unblock' }
  | { kind: 'unlock'; sendNewCode: boolean }
  | { kind: 'code' }
  | { kind: 'delete' }
  | { kind: 'role'; role: Role }
  | { kind: 'permissions'; permissions: string[] };

export function runUserAction(id: number, a: UserAction) {
  const base = `/admin/users/${id}`;
  switch (a.kind) {
    case 'unlock':
      return api.post<{ data?: User; message?: string }>(`${base}/unlock`, {
        send_new_code: a.sendNewCode,
      });
    case 'code':
      return api.post<{ data?: User; message?: string }>(`${base}/code`);
    case 'delete':
      return api.del<{ data?: User; message?: string }>(base);
    case 'role':
      return api.put<{ data?: User; message?: string }>(`${base}/role`, { role: a.role });
    case 'permissions':
      return api.put<{ data?: User; message?: string }>(`${base}/permissions`, {
        permissions: a.permissions,
      });
    default:
      return api.post<{ data?: User; message?: string }>(`${base}/${a.kind}`);
  }
}

export function useUserAction(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (a: UserAction) => runUserAction(id, a),
    onSuccess: (res) => {
      if (res?.data) qc.setQueryData(['admin', 'users', 'one', id], res.data);
      void qc.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
  });
}

export const ACTION_DONE: Record<UserAction['kind'], string> = {
  approve: 'Request approved. The identification code has been emailed.',
  reject: 'Request rejected.',
  block: 'Account blocked. Access was cut immediately.',
  unblock: 'Account unblocked.',
  unlock: 'Sign-in restored.',
  code: 'A new identification code has been emailed.',
  delete: 'Account deleted.',
  role: 'Role updated. The account was signed out of its devices.',
  permissions: 'Permissions saved.',
};

/** Friendly text for the API's conflict codes. */
export function conflictMessage(code: string | undefined, fallback: string): string {
  switch (code) {
    case 'last_super_admin':
      return 'There must always be at least one active super admin.';
    case 'not_blocked':
      return 'This account is not blocked.';
    case 'not_locked':
      return 'This account is not locked.';
    case 'not_active':
      return 'Only active accounts can change role.';
    case 'email_taken':
      return 'An account already uses this email address.';
    default:
      return fallback;
  }
}
