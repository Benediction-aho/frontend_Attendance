/**
 * Device session (Bearer token, one per device).
 *
 * Storage choice: the token lives in memory for requests and is persisted in
 * IndexedDB (not localStorage, never in URLs, cookies or logs) so the installed
 * PWA stays signed in. It is read once at start-up into memory. No browser
 * storage is out of reach of an XSS, so the real protection is: no third-party
 * scripts, strict CSP, no HTML injection, and a server-side token that can be
 * revoked (logout, 401, admin actions). It is cleared on logout and on 401 only.
 */
import { createKvStore, type KvStore } from './kvStore';

const TOKEN_KEY = 'session.token';
const DEVICE_KEY = 'ag.device';

type Listener = () => void;
let store: KvStore = createKvStore();
let token: string | null = null;
let loaded = false;
const listeners = new Set<Listener>();

/** Loads the persisted token into memory (call once before rendering). */
export async function loadSession(): Promise<void> {
  if (loaded) return;
  const stored = await store.get(TOKEN_KEY);
  // A token set while loading wins over the stored one.
  if (!loaded) token = token ?? stored;
  loaded = true;
  listeners.forEach((l) => l());
}

export function isSessionLoaded(): boolean {
  return loaded;
}

export function getToken(): string | null {
  return token;
}

export function setToken(value: string | null): void {
  token = value;
  loaded = true;
  void (value ? store.set(TOKEN_KEY, value) : store.remove(TOKEN_KEY));
  listeners.forEach((l) => l());
}

/** Called only when the server says the session is invalid (HTTP 401). */
export function invalidateSession(reason?: string): void {
  if (token === null) return;
  signOutReason = reason ?? 'session_ended';
  setToken(null);
}

let signOutReason: string | null = null;
/** Why the server ended the session (e.g. reauth_limit); read once by the sign-in page. */
export function takeSignOutReason(): string | null {
  const r = signOutReason;
  signOutReason = null;
  return r;
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Test helper. */
export function __setStoreForTests(s: KvStore): void {
  store = s;
  token = null;
  loaded = false;
}

function randomId(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Random device identifier generated once and kept on the device (not a secret).
 * Format accepted by the API: 16–128 chars of [A-Za-z0-9_-].
 */
export function getDeviceId(): string {
  try {
    const existing = localStorage.getItem(DEVICE_KEY);
    if (existing && /^[A-Za-z0-9_-]{16,128}$/.test(existing)) return existing;
    const id = randomId();
    localStorage.setItem(DEVICE_KEY, id);
    return id;
  } catch {
    memoryDeviceId ??= randomId();
    return memoryDeviceId;
  }
}
let memoryDeviceId: string | null = null;

/** Best-effort human name for the device list (e.g. "iPhone – Safari"). */
export function getDeviceName(ua = globalThis.navigator?.userAgent ?? ''): string {
  const os = /iPhone/.test(ua)
    ? 'iPhone'
    : /iPad/.test(ua)
      ? 'iPad'
      : /Android/.test(ua)
        ? 'Android'
        : /Mac OS X/.test(ua)
          ? 'Mac'
          : /Windows/.test(ua)
            ? 'Windows'
            : 'Device';
  const browser = /Edg/.test(ua)
    ? 'Edge'
    : /CriOS|Chrome/.test(ua)
      ? 'Chrome'
      : /FxiOS|Firefox/.test(ua)
        ? 'Firefox'
        : /Safari/.test(ua)
          ? 'Safari'
          : 'Browser';
  return `${os} – ${browser}`;
}

export function isStandalonePwa(): boolean {
  try {
    return (
      globalThis.matchMedia?.('(display-mode: standalone)').matches === true ||
      (globalThis.navigator as Navigator & { standalone?: boolean })?.standalone === true
    );
  } catch {
    return false;
  }
}
