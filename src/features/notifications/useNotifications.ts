import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, qs } from '../../lib/api';
import type { NotificationPage } from '../../lib/types';

export function useUnreadCount() {
  return useQuery({
    queryKey: ['notifications', 'count'],
    queryFn: () => api.get<NotificationPage>(`/notifications${qs({ unread: 1 })}`),
    select: (r) => r.meta.unread_count ?? r.meta.total,
    refetchInterval: 60_000,
  });
}

export function useNotifications(page: number, unreadOnly: boolean) {
  return useQuery({
    queryKey: ['notifications', 'list', page, unreadOnly],
    queryFn: () =>
      api.get<NotificationPage>(
        `/notifications${qs({ page, unread: unreadOnly ? 1 : undefined })}`,
      ),
    placeholderData: (p) => p,
  });
}

export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string | 'all') =>
      id === 'all'
        ? api.post('/notifications/read-all')
        : api.post(`/notifications/${encodeURIComponent(id)}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
}
