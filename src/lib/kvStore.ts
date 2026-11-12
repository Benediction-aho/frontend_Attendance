/**
 * Tiny key/value store on IndexedDB (one object store), with an in-memory
 * fallback when IndexedDB is unavailable (private mode, tests, old WebViews).
 */
const DB_NAME = 'ag';
const STORE = 'kv';

export interface KvStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}

export function memoryStore(): KvStore {
  const map = new Map<string, string>();
  return {
    get: async (k) => map.get(k) ?? null,
    set: async (k, v) => void map.set(k, v),
    remove: async (k) => void map.delete(k),
  };
}

function req<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

export function indexedDbStore(factory: IDBFactory): KvStore {
  let dbp: Promise<IDBDatabase> | null = null;
  const open = () => {
    dbp ??= new Promise<IDBDatabase>((resolve, reject) => {
      const r = factory.open(DB_NAME, 1);
      r.onupgradeneeded = () => r.result.createObjectStore(STORE);
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    return dbp;
  };
  const tx = async (mode: IDBTransactionMode) =>
    (await open()).transaction(STORE, mode).objectStore(STORE);
  return {
    get: async (k) => {
      const v = await req((await tx('readonly')).get(k));
      return typeof v === 'string' ? v : null;
    },
    set: async (k, v) => void (await req((await tx('readwrite')).put(v, k))),
    remove: async (k) => void (await req((await tx('readwrite')).delete(k))),
  };
}

/** IndexedDB when it works, memory otherwise. Failures never throw to callers. */
export function createKvStore(): KvStore {
  const mem = memoryStore();
  const factory = globalThis.indexedDB;
  if (!factory) return mem;
  const idb = indexedDbStore(factory);
  const safe =
    <A extends unknown[], R>(fn: (...a: A) => Promise<R>, memFn: (...a: A) => Promise<R>) =>
    async (...a: A) => {
      try {
        return await fn(...a);
      } catch {
        return memFn(...a);
      }
    };
  return {
    get: safe(idb.get, mem.get),
    set: safe(idb.set, mem.set),
    remove: safe(idb.remove, mem.remove),
  };
}
