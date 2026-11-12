import { getToken, invalidateSession } from './session';
import { recordServerDate } from './serverTime';

export type ApiErrorKind = 'network' | 'server' | 'unauthorized' | 'client';

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status: number | null;
  readonly body: unknown;

  constructor(kind: ApiErrorKind, status: number | null, message: string, body?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.kind = kind;
    this.status = status;
    this.body = body;
  }

  /** Transient errors are retried and never end the session. */
  get transient(): boolean {
    return this.kind === 'network' || this.kind === 'server';
  }
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
  /** Retries for network/5xx errors. Defaults to 3 for GET, 0 otherwise (non-idempotent). */
  retries?: number;
}

export interface ApiClientConfig {
  baseUrl: string;
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  baseDelayMs?: number;
  maxDelayMs?: number;
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
    if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;

    let res: Response;
    try {
      res = await fetchImpl(`${root}${path.startsWith('/') ? path : `/${path}`}`, {
        method: opts.method ?? 'GET',
        headers,
        body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
        signal: opts.signal,
        cache: 'no-store',
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
    const data: unknown = await res.json().catch(() => null);

    if (res.ok) return data as T;
    if (res.status === 401) {
      // Only a genuinely invalid session signs the user out.
      invalidateSession();
      throw new ApiError(
        'unauthorized',
        401,
        'Your session has ended. Please sign in again.',
        data,
      );
    }
    if (res.status >= 500) {
      throw new ApiError('server', res.status, 'The service is temporarily unavailable.', data);
    }
    const message =
      data && typeof data === 'object' && 'message' in data && typeof data.message === 'string'
        ? data.message
        : 'The request could not be completed.';
    throw new ApiError('client', res.status, message, data);
  }

  async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
    const retries = opts.retries ?? ((opts.method ?? 'GET') === 'GET' ? 3 : 0);
    for (let attempt = 0; ; attempt++) {
      try {
        return await once<T>(path, opts);
      } catch (e) {
        if (!(e instanceof ApiError) || !e.transient || attempt >= retries) throw e;
        await sleep(backoffDelay(attempt, base, max));
      }
    }
  }

  return {
    request,
    get: <T>(path: string, o?: Omit<RequestOptions, 'method' | 'body'>) =>
      request<T>(path, { ...o, method: 'GET' }),
    post: <T>(path: string, body?: unknown, o?: Omit<RequestOptions, 'method' | 'body'>) =>
      request<T>(path, { ...o, method: 'POST', body }),
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;

export const api = createApiClient({ baseUrl: import.meta.env.VITE_API_URL ?? '' });
