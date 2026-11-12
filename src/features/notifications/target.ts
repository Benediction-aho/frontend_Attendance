import type { AppNotification } from '../../lib/types';

/** Known screens per notification kind (used when the path is missing or points elsewhere). */
const BY_KIND: Record<string, string> = {
  signup_request: '/app/admin/requests',
  checkin_reminder: '/app',
};

/**
 * In-app page a notification opens. The API sends app-relative paths
 * ("/admin/users/5"); only same-app paths are followed (never external URLs).
 */
export function notificationTarget(n: AppNotification): string | null {
  const kind = n.data.kind;
  if (kind && BY_KIND[kind]) return BY_KIND[kind];
  const p = n.data.path;
  if (!p || !p.startsWith('/') || p.startsWith('//') || p.includes('\\')) return null;
  return p === '/app' || p.startsWith('/app/') ? p : `/app${p}`;
}
