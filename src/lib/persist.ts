/**
 * Persisted query cache: screens a user already opened render at once from the device
 * and refresh in the background. Only an allowlist of the user's own everyday data is
 * stored (never tokens, never other people's lists, never temporary file links).
 * The copy is versioned, expires after a day and is erased on sign-in, sign-out and
 * whenever the server ends the session.
 */
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import type { Query } from '@tanstack/react-query';
import type { PersistQueryClientOptions } from '@tanstack/react-query-persist-client';
import { createKvStore, type KvStore } from './kvStore';

/** Bump when the shape of cached API data changes: older copies are then ignored. */
export const CACHE_BUSTER = 'v1';
export const CACHE_STORAGE_KEY = 'rq.cache';
/** Cached screens older than this are not shown. */
export const CACHE_MAX_AGE_MS = 24 * 60 * 60_000;

/** Query keys (as JSON prefixes) that may be kept on the device. */
const PERSISTED_PREFIXES: readonly (readonly unknown[])[] = [
  ['me'], // profile, dashboard, schedule, leaves, tasks, clients (exact keys below)
  ['attendance', 'today'],
  ['admin', 'dashboard'],
  ['notifications', 'count'],
  ['holidays'],
];

/** Under ['me'], only these sub-resources (reports hold expiring file links). */
const ME_ALLOWED = new Set([undefined, 'dashboard', 'work-schedule', 'leaves', 'tasks', 'clients']);

export function isPersistable(queryKey: readonly unknown[]): boolean {
  const match = PERSISTED_PREFIXES.some((p) => p.every((part, i) => queryKey[i] === part));
  if (!match) return false;
  if (queryKey[0] === 'me') return queryKey.length <= 2 && ME_ALLOWED.has(queryKey[1] as string);
  return true;
}

export function shouldPersistQuery(query: Pick<Query, 'queryKey' | 'state'>): boolean {
  return query.state.status === 'success' && isPersistable(query.queryKey);
}

let store: KvStore | null = null;
const kv = () => (store ??= createKvStore());

export const persister = createAsyncStoragePersister({
  storage: {
    getItem: (k) => kv().get(k),
    setItem: (k, v) => kv().set(k, v),
    removeItem: (k) => kv().remove(k),
  },
  key: CACHE_STORAGE_KEY,
  throttleTime: 1000,
});

export const persistOptions: Omit<PersistQueryClientOptions, 'queryClient'> = {
  persister,
  buster: CACHE_BUSTER,
  maxAge: CACHE_MAX_AGE_MS,
  dehydrateOptions: { shouldDehydrateQuery: shouldPersistQuery },
};

/** Erases the device copy (sign-in, sign-out, session ended by the server). */
export async function clearPersistedCache(): Promise<void> {
  try {
    await kv().remove(CACHE_STORAGE_KEY);
  } catch {
    // Storage unavailable: nothing was stored either.
  }
}

/** Time this app run started: data older than this was restored from the device. */
export const APP_STARTED_AT = Date.now();

/** True when the query's data came from the server during this run (not from the device copy). */
export function isFreshThisRun(dataUpdatedAt: number): boolean {
  return dataUpdatedAt >= APP_STARTED_AT;
}
