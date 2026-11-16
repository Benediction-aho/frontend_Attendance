/**
 * Detects a slow or waking API (the free hosting sleeps after a quiet period and can
 * take up to a minute to answer the first request). Purely presentational: it only
 * decides whether to show "Waking up the server…", never business logic.
 */
type Listener = (waking: boolean) => void;

/** A request still pending after this long is considered "waiting for the server". */
export const SLOW_AFTER_MS = 3500;

const listeners = new Set<Listener>();
const slow = new Set<number>();
let retrying = 0;
let nextId = 1;
let waking = false;

function emit() {
  const now = slow.size > 0 || retrying > 0;
  if (now === waking) return;
  waking = now;
  listeners.forEach((l) => l(waking));
}

export function isWaking(): boolean {
  return waking;
}

export function subscribeWaking(l: Listener): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

/** Marks a request as started; call the returned function when it settles. */
export function trackRequest(slowAfterMs = SLOW_AFTER_MS): () => void {
  const id = nextId++;
  const timer = setTimeout(() => {
    slow.add(id);
    emit();
  }, slowAfterMs);
  return () => {
    clearTimeout(timer);
    if (slow.delete(id)) emit();
  };
}

/** Marks a transient failure being retried (server starting, brief network loss). */
export function trackRetry(): () => void {
  retrying++;
  emit();
  let done = false;
  return () => {
    if (done) return;
    done = true;
    retrying--;
    emit();
  };
}

/** Test helper. */
export function __resetNetStatus(): void {
  slow.clear();
  retrying = 0;
  waking = false;
  listeners.clear();
}
