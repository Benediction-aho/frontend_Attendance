/**
 * Sign-in notices that must survive a reload in the same tab (UX2-23): the
 * sign-out reason and the lockout countdown. sessionStorage, with an expiry;
 * a per-tab convenience only (the server stays the authority).
 */
const KEY = 'ag.signin.notice';
const SIGNED_IN_KEY = 'ag.signedin';
const DEFAULT_TTL_MS = 30 * 60 * 1000;

export interface StoredNotice<E> {
  error?: E | null;
  reason?: string | null;
  expires: number;
}

export function saveNotice<E>(n: Omit<StoredNotice<E>, 'expires'>, ttlMs = DEFAULT_TTL_MS): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ ...n, expires: Date.now() + ttlMs }));
  } catch {
    // storage unavailable: the notice simply does not survive a reload
  }
}

export function loadNotice<E>(now = Date.now()): StoredNotice<E> | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const n = JSON.parse(raw) as StoredNotice<E>;
    if (typeof n.expires !== 'number' || n.expires <= now) {
      sessionStorage.removeItem(KEY);
      return null;
    }
    return n;
  } catch {
    return null;
  }
}

export function clearNotice(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}

/** Remembers that an account already signed in from this browser (UX2-24). */
export function markSignedInHere(): void {
  try {
    localStorage.setItem(SIGNED_IN_KEY, '1');
  } catch {
    // ignore
  }
}

export function hasSignedInHere(): boolean {
  try {
    return localStorage.getItem(SIGNED_IN_KEY) === '1';
  } catch {
    return false;
  }
}
