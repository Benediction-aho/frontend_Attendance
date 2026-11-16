import { afterEach, describe, expect, it, vi } from 'vitest';
import { isFreshThisRun, isPersistable, shouldPersistQuery, APP_STARTED_AT } from './persist';
import { __resetNetStatus, isWaking, subscribeWaking, trackRequest } from './netStatus';
import { createApiClient } from './api';
import { __resetWarmup, wakeApi } from './warmup';
import { fitWithin } from './image';
import { routeFor, registerRoute, __resetPreload } from '../app/preload';

describe('persisted cache allowlist', () => {
  it('keeps only the everyday data of the signed-in user', () => {
    expect(isPersistable(['me'])).toBe(true);
    expect(isPersistable(['me', 'dashboard'])).toBe(true);
    expect(isPersistable(['me', 'tasks'])).toBe(true);
    expect(isPersistable(['me', 'clients'])).toBe(true);
    expect(isPersistable(['attendance', 'today'])).toBe(true);
    expect(isPersistable(['admin', 'dashboard'])).toBe(true);
    expect(isPersistable(['notifications', 'count'])).toBe(true);
  });

  it('never keeps lists of other people, logs, settings or expiring file links', () => {
    expect(isPersistable(['admin', 'users', 'list', {}])).toBe(false);
    expect(isPersistable(['admin', 'logs', {}, 1])).toBe(false);
    expect(isPersistable(['admin', 'settings'])).toBe(false);
    expect(isPersistable(['me', 'reports', 'daily', 'today'])).toBe(false);
    expect(isPersistable(['me', 'reports', 'activity', 1])).toBe(false);
    expect(isPersistable(['attendance', 'history', '/me/attendance'])).toBe(false);
    expect(isPersistable(['notifications', 'list', 1, false])).toBe(false);
  });

  it('never keeps failed or pending queries', () => {
    const q = (status: 'success' | 'error' | 'pending') =>
      ({ queryKey: ['me'], state: { status } }) as unknown as Parameters<
        typeof shouldPersistQuery
      >[0];
    expect(shouldPersistQuery(q('success'))).toBe(true);
    expect(shouldPersistQuery(q('error'))).toBe(false);
    expect(shouldPersistQuery(q('pending'))).toBe(false);
  });

  it('tells restored data from data fetched during this run', () => {
    expect(isFreshThisRun(APP_STARTED_AT - 60_000)).toBe(false);
    expect(isFreshThisRun(Date.now())).toBe(true);
  });
});

describe('waking server detection', () => {
  afterEach(() => {
    vi.useRealTimers();
    __resetNetStatus();
  });

  it('turns on for a slow request and off when it settles', () => {
    vi.useFakeTimers();
    const seen: boolean[] = [];
    subscribeWaking((w) => seen.push(w));
    const done = trackRequest(3000);
    vi.advanceTimersByTime(2999);
    expect(isWaking()).toBe(false);
    vi.advanceTimersByTime(1);
    expect(isWaking()).toBe(true);
    done();
    expect(isWaking()).toBe(false);
    expect(seen).toEqual([true, false]);
  });

  it('stays off for quick requests', () => {
    vi.useFakeTimers();
    const done = trackRequest(3000);
    vi.advanceTimersByTime(500);
    done();
    vi.advanceTimersByTime(5000);
    expect(isWaking()).toBe(false);
  });

  it('turns on while a transient error is retried', async () => {
    let calls = 0;
    const states: boolean[] = [];
    const client = createApiClient({
      baseUrl: 'https://api.test',
      fetchImpl: vi.fn(async () => {
        calls++;
        if (calls === 1) return new Response('{}', { status: 503 });
        return new Response('{"ok":1}', { status: 200 });
      }),
      sleep: async () => void states.push(isWaking()),
    });
    await expect(client.get('/x')).resolves.toEqual({ ok: 1 });
    expect(states).toEqual([true]);
    expect(isWaking()).toBe(false);
  });
});

describe('API warm-up', () => {
  it('sends one anonymous health request', () => {
    __resetWarmup();
    const f = vi.fn(async () => new Response('{}'));
    vi.stubGlobal('fetch', f);
    wakeApi('https://api.test/api/');
    wakeApi('https://api.test/api/');
    expect(f).toHaveBeenCalledTimes(1);
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.test/api/health');
    expect(init.credentials).toBe('omit');
    expect(JSON.stringify(init.headers)).not.toMatch(/Authorization/i);
    vi.unstubAllGlobals();
  });
});

describe('route preloading', () => {
  it('matches the most specific registered screen', () => {
    __resetPreload();
    registerRoute('/app/admin', async () => 1);
    registerRoute('/app/admin/users', async () => 2);
    expect(routeFor('/app/admin/users/12')).toBe('/app/admin/users');
    expect(routeFor('/app/admin')).toBe('/app/admin');
    expect(routeFor('/app/administrator')).toBeUndefined();
    expect(routeFor('/app/work')).toBeUndefined();
  });
});

describe('profile photo downscale', () => {
  it('fits large phone photos within 1024 px without upscaling', () => {
    expect(fitWithin(4032, 3024, 1024)).toEqual({ width: 1024, height: 768 });
    expect(fitWithin(800, 600, 1024)).toEqual({ width: 800, height: 600 });
  });
});

describe('dashboard greeting (FIN-05)', () => {
  it('follows the hour and stays neutral after midnight', async () => {
    const { greeting } = await import('../features/dashboard/DashboardPage');
    expect(greeting(0)).toBe('Hello');
    expect(greeting(4)).toBe('Hello');
    expect(greeting(5)).toBe('Good morning');
    expect(greeting(13)).toBe('Good afternoon');
    expect(greeting(20)).toBe('Good evening');
  });
});
