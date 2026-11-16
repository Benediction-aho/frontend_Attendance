/**
 * Fire-and-forget request to the API health check, sent when the app opens so the
 * server (which sleeps after a quiet period on the current hosting) starts waking up
 * while the user reads the first screen or types their password. No credentials, no data.
 */
let sent = false;

export function wakeApi(baseUrl: string = import.meta.env.VITE_API_URL ?? ''): void {
  if (sent || !baseUrl || typeof fetch !== 'function') return;
  sent = true;
  const root = baseUrl.replace(/\/+$/, '');
  try {
    void fetch(`${root}/health`, {
      method: 'GET',
      cache: 'no-store',
      credentials: 'omit',
      headers: { Accept: 'application/json' },
    }).catch(() => {});
  } catch {
    // Never blocks start-up.
  }
}

/** Test helper. */
export function __resetWarmup(): void {
  sent = false;
}
