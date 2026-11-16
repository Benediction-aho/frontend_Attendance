import { getToken, invalidateSession } from './session';
import { recordServerDate } from './serverTime';
import { trackRequest, trackRetry } from './netStatus';

export type ApiErrorKind = 'network' | 'server' | 'unauthorized' | 'client';

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status: number | null;
  readonly body: unknown;
  /** Seconds from the Retry-After header, when the server sent one. */
  readonly retryAfterHeader: number | undefined;

  constructor(
    kind: ApiErrorKind,
    status: number | null,
    message: string,
    body?: unknown,
    retryAfterHeader?: number,
  ) {
    super(message);
    this.name = 'ApiError';
    this.kind = kind;
    this.status = status;
    this.body = body;
    this.retryAfterHeader = retryAfterHeader;
  }

  /** Transient errors are retried and never end the session. */
  get transient(): boolean {
    return this.kind === 'network' || this.kind === 'server';
  }

  /** Machine-readable reason from the API (e.g. login_blocked). */
  get code(): string | undefined {
    const b = this.body as { code?: unknown } | null;
    return b && typeof b.code === 'string' ? b.code : undefined;
  }

  get retryAfterSeconds(): number | undefined {
    const b = this.body as { retry_after_seconds?: unknown } | null;
    return b && typeof b.retry_after_seconds === 'number'
      ? b.retry_after_seconds
      : this.retryAfterHeader;
  }

  /** Sign-in attempts left before a temporary block, when the API says so. */
  get remainingAttempts(): number | undefined {
    const b = this.body as { remaining_attempts?: unknown; attempts_remaining?: unknown } | null;
    if (!b) return undefined;
    const v = b.remaining_attempts ?? b.attempts_remaining;
    return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
  }

  /** 422 field errors: field => first message. */
  get fieldErrors(): Record<string, string> {
    const b = this.body as { errors?: Record<string, unknown> } | null;
    const out: Record<string, string> = {};
    if (b && b.errors && typeof b.errors === 'object') {
      for (const [k, v] of Object.entries(b.errors)) {
        if (Array.isArray(v) && typeof v[0] === 'string') out[k] = v[0];
      }
    }
    return out;
  }
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
  /**
   * Retries for network/5xx errors. Defaults to 5 for GET (enough to ride out the API
   * waking up after a quiet period), 0 otherwise (non-idempotent).
   */
  retries?: number;
  /** Return `{ blob, filename }` instead of parsing JSON (file downloads). */
  raw?: boolean;
}

export interface ApiClientConfig {
  baseUrl: string;
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  baseDelayMs?: number;
  maxDelayMs?: number;
  /** XMLHttpRequest used for uploads with progress (tests). */
  xhrImpl?: typeof XMLHttpRequest;
}

type Listener = (e: ApiError) => void;
const forbiddenListeners = new Set<Listener>();

/** Notified when the API answers 403 password_change_required. */
export function onPasswordChangeRequired(l: Listener): () => void {
  forbiddenListeners.add(l);
  return () => forbiddenListeners.delete(l);
}

const writeListeners = new Set<(path: string) => void>();

/** Called after every successful write (POST/PUT/PATCH/DELETE) outside /auth, e.g. to refresh dashboards. */
export function onWriteSuccess(l: (path: string) => void): () => void {
  writeListeners.add(l);
  return () => writeListeners.delete(l);
}

const checkinListeners = new Set<Listener>();

/** Notified when the API answers 403 checkin_required (employee must check in first). */
export function onCheckInRequired(l: Listener): () => void {
  checkinListeners.add(l);
  return () => checkinListeners.delete(l);
}

/** Retry-After as seconds (number or HTTP date); undefined when absent or invalid. */
export function parseRetryAfter(value: string | null, now = Date.now()): number | undefined {
  if (!value) return undefined;
  const v = value.trim();
  if (/^\d+$/.test(v)) return Number(v);
  const t = Date.parse(v);
  return Number.isNaN(t) ? undefined : Math.max(0, Math.round((t - now) / 1000));
}

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export function backoffDelay(attempt: number, base: number, max: number): number {
  const exp = Math.min(max, base * 2 ** attempt);
  // Full jitter keeps many phones from retrying in lockstep at 08:00.
  return Math.round(exp / 2 + Math.random() * (exp / 2));
}

export function createApiClient(config: ApiClientConfig) {
  const fetchImpl = config.fetchImpl ?? ((...a: Parameters<typeof fetch>) => fetch(...a));
  const sleep = config.sleep ?? defaultSleep;
  const base = config.baseDelayMs ?? 500;
  const max = config.maxDelayMs ?? 8000;
  const root = config.baseUrl.replace(/\/+$/, '');

  async function once<T>(path: string, opts: RequestOptions): Promise<T> {
    const headers: Record<string, string> = { Accept: 'application/json' };
    const isForm = typeof FormData !== 'undefined' && opts.body instanceof FormData;
    if (opts.body !== undefined && !isForm) headers['Content-Type'] = 'application/json';
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;

    let res: Response;
    try {
      res = await fetchImpl(`${root}${path.startsWith('/') ? path : `/${path}`}`, {
        method: opts.method ?? 'GET',
        headers,
        body:
          opts.body === undefined
            ? undefined
            : isForm
              ? (opts.body as FormData)
              : JSON.stringify(opts.body),
        signal: opts.signal,
        cache: 'no-store',
        credentials: 'omit',
      });
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') throw e;
      throw new ApiError(
        'network',
        null,
        'You appear to be offline. Please check your connection.',
      );
    }

    recordServerDate(res.headers.get('Date'));
    if (opts.raw && res.ok) {
      const cd = res.headers.get('Content-Disposition') ?? '';
      const filename = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(cd)?.[1] ?? null;
      return { blob: await res.blob(), filename } as T;
    }
    const data: unknown = await res.json().catch(() => null);
    return settle<T>(path, opts.method ?? 'GET', Boolean(token), res.status, data, (h) =>
      res.headers.get(h),
    );
  }

  /** Shared outcome of every request: the data, or the ApiError matching the status. */
  function settle<T>(
    path: string,
    method: string,
    hadToken: boolean,
    status: number,
    data: unknown,
    header: (name: string) => string | null,
  ): T {
    if (status >= 200 && status < 300) {
      if (method !== 'GET' && !path.replace(/^\/+/, '').startsWith('auth/')) {
        writeListeners.forEach((l) => l(path));
      }
      return data as T;
    }
    const serverMessage =
      data && typeof data === 'object' && 'message' in data && typeof data.message === 'string'
        ? data.message
        : null;
    if (status === 401 && hadToken) {
      // Only a genuinely invalid session signs the user out.
      const code =
        data && typeof data === 'object' && 'code' in data && typeof data.code === 'string'
          ? data.code
          : undefined;
      invalidateSession(code);
      throw new ApiError(
        'unauthorized',
        401,
        'Your session has ended. Please sign in again.',
        data,
      );
    }
    if (status >= 500) {
      throw new ApiError('server', status, 'The service is temporarily unavailable.', data);
    }
    const err = new ApiError(
      'client',
      status,
      serverMessage ?? 'The request could not be completed.',
      data,
      parseRetryAfter(header('Retry-After')),
    );
    if (status === 403 && err.code === 'password_change_required') {
      forbiddenListeners.forEach((l) => l(err));
    }
    if (status === 403 && err.code === 'checkin_required') {
      checkinListeners.forEach((l) => l(err));
    }
    throw err;
  }

  /**
   * Multipart POST that reports how much of the file has left the device (0 to 1).
   * Never retried (a retry could store the file twice). Same errors as every request.
   */
  function upload<T>(
    path: string,
    form: FormData,
    onProgress?: (fraction: number) => void,
    signal?: AbortSignal,
  ): Promise<T> {
    const Xhr = config.xhrImpl ?? globalThis.XMLHttpRequest;
    // No XMLHttpRequest (unusual): the upload still works, without progress.
    if (typeof Xhr !== 'function') return once<T>(path, { method: 'POST', body: form, signal });
    return new Promise<T>((resolve, reject) => {
      const xhr = new Xhr();
      const token = getToken();
      xhr.open('POST', `${root}${path.startsWith('/') ? path : `/${path}`}`);
      xhr.setRequestHeader('Accept', 'application/json');
      if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && e.total > 0) onProgress?.(Math.min(1, e.loaded / e.total));
      };
      const offline = () =>
        reject(
          new ApiError('network', null, 'You appear to be offline. Please check your connection.'),
        );
      xhr.onerror = offline;
      xhr.ontimeout = offline;
      xhr.onabort = () => reject(new DOMException('The upload was cancelled.', 'AbortError'));
      xhr.onload = () => {
        recordServerDate(xhr.getResponseHeader('Date'));
        let data: unknown;
        try {
          data = xhr.responseText ? JSON.parse(xhr.responseText) : null;
        } catch {
          data = null;
        }
        try {
          resolve(
            settle<T>(path, 'POST', Boolean(token), xhr.status, data, (h) =>
              xhr.getResponseHeader(h),
            ),
          );
        } catch (e) {
          reject(e instanceof Error ? e : new Error('Upload failed.'));
        }
      };
      signal?.addEventListener('abort', () => xhr.abort(), { once: true });
      xhr.send(form);
    });
  }

  async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
    const retries = opts.retries ?? ((opts.method ?? 'GET') === 'GET' ? 5 : 0);
    // A slow answer or a retry shows "Waking up the server…" (display only).
    const settled = trackRequest();
    let retrying: (() => void) | null = null;
    try {
      for (let attempt = 0; ; attempt++) {
        try {
          return await once<T>(path, opts);
        } catch (e) {
          if (!(e instanceof ApiError) || !e.transient || attempt >= retries) throw e;
          retrying ??= trackRetry();
          await sleep(backoffDelay(attempt, base, max));
        }
      }
    } finally {
      settled();
      retrying?.();
    }
  }

  type O = Omit<RequestOptions, 'method' | 'body'>;
  return {
    request,
    upload,
    get: <T>(path: string, o?: O) => request<T>(path, { ...o, method: 'GET' }),
    post: <T>(path: string, body?: unknown, o?: O) =>
      request<T>(path, { ...o, method: 'POST', body }),
    put: <T>(path: string, body?: unknown, o?: O) =>
      request<T>(path, { ...o, method: 'PUT', body }),
    patch: <T>(path: string, body?: unknown, o?: O) =>
      request<T>(path, { ...o, method: 'PATCH', body }),
    del: <T>(path: string, o?: O) => request<T>(path, { ...o, method: 'DELETE' }),
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;

export const api = createApiClient({ baseUrl: import.meta.env.VITE_API_URL ?? '' });

/** Builds a query string, skipping empty values. */
export function qs(params: Record<string, string | number | boolean | undefined | null>): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue;
    p.set(k, String(v));
  }
  const s = p.toString();
  return s ? `?${s}` : '';
}

/** "9 min", "45 s" – rough remaining time for rate-limit messages. */
export function roughWait(seconds: number): string {
  const s = Math.max(1, Math.ceil(seconds));
  if (s < 60) return `${s} s`;
  const m = Math.ceil(s / 60);
  return `${m} minute${m > 1 ? 's' : ''}`;
}

/** Clear message for an HTTP 429: what happened, how long to wait, what to do next. */
export function throttleMessage(e: ApiError): string {
  const wait = e.retryAfterSeconds;
  const when = wait !== undefined && wait > 0 ? `in ${roughWait(wait)}` : 'in a few minutes';
  switch (e.code) {
    case 'too_many_code_requests':
      return `You asked for several codes. Use the last code you received, or ask for a new one ${when}.`;
    default:
      return `Too many requests. Please wait and try again ${when}.`;
  }
}

/** User-facing message for any error. */
export function errorMessage(e: unknown): string {
  if (e instanceof ApiError && e.status === 429) return throttleMessage(e);
  if (e instanceof ApiError) return e.message;
  return 'Something went wrong. Please try again.';
}
