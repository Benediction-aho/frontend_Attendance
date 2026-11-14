/**
 * Deep link restored after sign-in (e.g. an email link to /app/admin/users/42).
 * Kept in sessionStorage too, so it survives the first-sign-in steps and a reload
 * of the sign-in page. Only in-app paths are accepted (no open redirect).
 */
const KEY = 'ag.returnTo';

export function safeReturnPath(p: unknown): string | null {
  if (typeof p !== 'string') return null;
  if (!p.startsWith('/app')) return null;
  if (p.startsWith('//') || p.includes('\\') || [...p].some((c) => c.charCodeAt(0) < 0x20))
    return null;
  if (p !== '/app' && !/^\/app[/?#]/.test(p)) return null;
  return p;
}

export function rememberReturnTo(path: string): void {
  const safe = safeReturnPath(path);
  if (!safe || safe === '/app') return;
  try {
    sessionStorage.setItem(KEY, safe);
  } catch {
    /* storage unavailable: the router state still carries it */
  }
}

/** Returns the remembered path (router state first) and forgets it. */
export function takeReturnTo(fromState?: unknown): string {
  let stored: string | null;
  try {
    stored = sessionStorage.getItem(KEY);
    sessionStorage.removeItem(KEY);
  } catch {
    stored = null;
  }
  return safeReturnPath(fromState) ?? safeReturnPath(stored) ?? '/app';
}
