/**
 * Session token store. The token lives in memory and in
 * localStorage so the installed PWA stays signed in; it is never logged.
 * The final transport (bearer token vs cookie) follows the backend contract (phase 1/2).
 */
const STORAGE_KEY = 'ag.session';

type Listener = () => void;
let token: string | null = readStored();
const listeners = new Set<Listener>();

function readStored(): string | null {
  try {
    return globalThis.localStorage?.getItem(STORAGE_KEY) ?? null;
  } catch {
    return null;
  }
}

export function getToken(): string | null {
  return token;
}

export function setToken(value: string | null): void {
  token = value;
  try {
    if (value) localStorage.setItem(STORAGE_KEY, value);
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage unavailable (private mode): keep the in-memory token only.
  }
  listeners.forEach((l) => l());
}

/** Called only when the server says the session is invalid (HTTP 401). */
export function invalidateSession(): void {
  if (token === null) return;
  setToken(null);
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
