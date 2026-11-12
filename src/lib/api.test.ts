import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, backoffDelay, createApiClient } from './api';
import { getToken, setToken } from './session';

const json = (status: number, body: unknown = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

function setup(responses: Array<Response | Error>) {
  const fetchImpl = vi.fn(async () => {
    const next = responses.shift();
    if (!next) throw new Error('no more responses');
    if (next instanceof Error) throw next;
    return next;
  });
  const sleep = vi.fn(async () => {});
  const client = createApiClient({ baseUrl: 'https://api.test/', fetchImpl, sleep });
  return { client, fetchImpl, sleep };
}

describe('api client', () => {
  beforeEach(() => setToken('secret-token'));

  it('sends the bearer token and JSON headers to the configured base URL', async () => {
    const { client, fetchImpl } = setup([json(200, { ok: true })]);
    await expect(client.get('/me')).resolves.toEqual({ ok: true });
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.test/me');
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer secret-token');
    expect(headers.Accept).toBe('application/json');
  });

  it('retries network and 5xx errors with backoff, keeping the session', async () => {
    const { client, fetchImpl, sleep } = setup([
      new TypeError('Failed to fetch'),
      json(503),
      json(200, { ok: 1 }),
    ]);
    await expect(client.get('/x')).resolves.toEqual({ ok: 1 });
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenCalledTimes(2);
    expect(getToken()).toBe('secret-token');
  });

  it('never signs out after exhausting retries on 5xx', async () => {
    const { client } = setup([json(500), json(500), json(500), json(500)]);
    const err = await client.get('/x').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).kind).toBe('server');
    expect(getToken()).toBe('secret-token');
  });

  it('does not retry non-idempotent requests by default', async () => {
    const { client, fetchImpl } = setup([json(502)]);
    await expect(client.post('/check-in', {})).rejects.toBeInstanceOf(ApiError);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('clears the session only on 401', async () => {
    const { client, fetchImpl } = setup([json(401)]);
    const err = (await client.get('/me').catch((e: unknown) => e)) as ApiError;
    expect(err.kind).toBe('unauthorized');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(getToken()).toBeNull();
  });

  it('does not retry or sign out on 4xx client errors', async () => {
    const { client, fetchImpl } = setup([json(422, { message: 'Invalid input.' })]);
    const err = (await client.post('/x', {}).catch((e: unknown) => e)) as ApiError;
    expect(err.message).toBe('Invalid input.');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(getToken()).toBe('secret-token');
  });

  it('never writes the token to the console', async () => {
    const spies = (['log', 'info', 'warn', 'error', 'debug'] as const).map((m) =>
      vi.spyOn(console, m).mockImplementation(() => {}),
    );
    const { client } = setup([new TypeError('x'), json(500), json(401)]);
    await client.get('/x', { retries: 2 }).catch(() => {});
    for (const s of spies) {
      for (const call of s.mock.calls) expect(JSON.stringify(call)).not.toContain('secret-token');
      s.mockRestore();
    }
  });

  it('keeps backoff within bounds', () => {
    for (let a = 0; a < 10; a++) {
      const d = backoffDelay(a, 500, 8000);
      expect(d).toBeGreaterThanOrEqual(Math.min(8000, 500 * 2 ** a) / 2);
      expect(d).toBeLessThanOrEqual(8000);
    }
  });
});

describe('api client – sign-in specifics', () => {
  it('a 401 without a session (wrong code) keeps the server message and code', async () => {
    setToken(null);
    const { client } = setup([
      json(401, { message: 'Invalid credentials.', code: 'invalid_credentials' }),
    ]);
    const err = (await client.post('/auth/login', {}).catch((e: unknown) => e)) as ApiError;
    expect(err.kind).toBe('client');
    expect(err.code).toBe('invalid_credentials');
  });

  it('exposes retry_after_seconds and field errors', async () => {
    const { client } = setup([
      json(429, { message: 'x', code: 'login_blocked', retry_after_seconds: 120 }),
      json(422, { message: 'x', errors: { email: ['Bad.'] } }),
    ]);
    const a = (await client.post('/a', {}).catch((e: unknown) => e)) as ApiError;
    expect(a.retryAfterSeconds).toBe(120);
    const b = (await client.post('/b', {}).catch((e: unknown) => e)) as ApiError;
    expect(b.fieldErrors).toEqual({ email: 'Bad.' });
  });

  it('sends FormData without a JSON content type', async () => {
    const { client, fetchImpl } = setup([json(200, {})]);
    await client.post('/me/photo', new FormData());
    const init = (fetchImpl.mock.calls[0] as unknown as [string, RequestInit])[1];
    expect((init.headers as Record<string, string>)['Content-Type']).toBeUndefined();
    expect(init.body).toBeInstanceOf(FormData);
  });
});
