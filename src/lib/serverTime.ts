/**
 * Server-time synchronisation. The device clock is never used for business data:
 * the UI displays `serverNow()`, i.e. device time corrected by the last known offset.
 * Phase 3 will feed this from a dedicated server timestamp endpoint.
 */
let offsetMs = 0;
let synced = false;

/** Records the offset from a server timestamp (ISO string or epoch ms) and the local receive time. */
export function syncFromServerTimestamp(server: string | number, receivedAt = Date.now()): void {
  const serverMs = typeof server === 'number' ? server : Date.parse(server);
  if (Number.isNaN(serverMs)) return;
  offsetMs = serverMs - receivedAt;
  synced = true;
}

/** Coarse fallback from the HTTP Date header (1 s precision) until a precise sync exists. */
export function recordServerDate(header: string | null): void {
  if (!header || synced) return;
  const ms = Date.parse(header);
  if (!Number.isNaN(ms)) offsetMs = ms - Date.now();
}

export function serverNow(): Date {
  return new Date(Date.now() + offsetMs);
}

export function serverOffsetMs(): number {
  return offsetMs;
}

export function isServerTimeSynced(): boolean {
  return synced;
}

/** Test helper. */
export function resetServerTime(): void {
  offsetMs = 0;
  synced = false;
}
