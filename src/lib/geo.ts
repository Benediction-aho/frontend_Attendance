/**
 * Device position for the check-in. The client only reads the position and its
 * accuracy and sends both; the server decides whether it is inside the perimeter.
 */
export interface Position {
  latitude: number;
  longitude: number;
  accuracy: number;
}

export type GeoErrorKind = 'unsupported' | 'denied' | 'unavailable' | 'timeout' | 'insecure';

export class GeoError extends Error {
  readonly kind: GeoErrorKind;
  constructor(kind: GeoErrorKind, message: string) {
    super(message);
    this.name = 'GeoError';
    this.kind = kind;
  }
}

export const GEO_MESSAGES: Record<GeoErrorKind, string> = {
  unsupported:
    'This browser cannot share your location. Open the app in Safari (iPhone) or Chrome (Android).',
  insecure: 'Location needs a secure connection. Open the app from its official address.',
  denied:
    'Location access is blocked. On iPhone: Settings > Privacy & Security > Location Services > Safari Websites (or the app) > While Using. On Android: tap the lock icon next to the address, then Permissions > Location > Allow. Then try again.',
  unavailable:
    'We cannot get your position. Turn on Location Services (GPS) on your phone, move near a window or outside, and try again.',
  timeout:
    'Getting your position is taking too long. Check that Location Services (GPS) is on, then try again.',
};

export interface GeoProgress {
  /** Attempt number, starting at 1. */
  attempt: number;
  /** Accuracy of the last reading in metres (null before the first reading). */
  accuracy: number | null;
  /** Accuracy needed (from the API rules), when known. */
  target: number | null;
}

export interface LocateOptions {
  /** Accuracy the server accepts (metres), from the API rules. */
  targetAccuracy?: number | null;
  /** Total time to wait for a good enough reading. */
  timeoutMs?: number;
  onProgress?: (p: GeoProgress) => void;
  signal?: AbortSignal;
  geolocation?: Geolocation;
}

function mapError(e: GeolocationPositionError): GeoError {
  if (e.code === 1) return new GeoError('denied', GEO_MESSAGES.denied);
  if (e.code === 3) return new GeoError('timeout', GEO_MESSAGES.timeout);
  return new GeoError('unavailable', GEO_MESSAGES.unavailable);
}

/**
 * Watches the position until the accuracy reaches `targetAccuracy` or the time is up,
 * reporting every reading. Resolves with the best reading obtained (the server
 * answers `low_accuracy` when it is still not good enough).
 */
export function locate(opts: LocateOptions = {}): Promise<Position> {
  const geo = opts.geolocation ?? globalThis.navigator?.geolocation;
  if (globalThis.isSecureContext === false)
    return Promise.reject(new GeoError('insecure', GEO_MESSAGES.insecure));
  if (!geo) return Promise.reject(new GeoError('unsupported', GEO_MESSAGES.unsupported));
  const target = opts.targetAccuracy ?? null;
  const timeoutMs = opts.timeoutMs ?? 20_000;

  return new Promise<Position>((resolve, reject) => {
    let best: Position | null = null;
    let attempt = 0;
    let done = false;
    let watchId: number | null = null;
    const finish = (fn: () => void) => {
      if (done) return;
      done = true;
      if (watchId !== null) geo.clearWatch(watchId);
      clearTimeout(timer);
      opts.signal?.removeEventListener('abort', onAbort);
      fn();
    };
    const onAbort = () => finish(() => reject(new DOMException('Aborted', 'AbortError')));
    const timer = setTimeout(() => {
      finish(() => (best ? resolve(best) : reject(new GeoError('timeout', GEO_MESSAGES.timeout))));
    }, timeoutMs);
    opts.signal?.addEventListener('abort', onAbort);
    opts.onProgress?.({ attempt: 1, accuracy: null, target });

    watchId = geo.watchPosition(
      (p) => {
        attempt += 1;
        const reading: Position = {
          latitude: p.coords.latitude,
          longitude: p.coords.longitude,
          accuracy: p.coords.accuracy,
        };
        if (!best || reading.accuracy <= best.accuracy) best = reading;
        opts.onProgress?.({ attempt, accuracy: best.accuracy, target });
        if (target === null || best.accuracy <= target) finish(() => resolve(best!));
      },
      (e) => {
        // A timeout of one reading is not final while the overall time remains.
        if (e.code === 3 && !done) return;
        finish(() => (best ? resolve(best) : reject(mapError(e))));
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: Math.min(timeoutMs, 15_000) },
    );
  });
}

/** Best-effort single reading for the check-out (never blocks it). */
export async function tryLocate(timeoutMs = 8000): Promise<Position | null> {
  try {
    return await locate({ timeoutMs, targetAccuracy: null });
  } catch {
    return null;
  }
}
