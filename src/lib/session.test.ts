import { beforeEach, describe, expect, it } from 'vitest';
import { memoryStore } from './kvStore';
import {
  __setStoreForTests,
  getDeviceId,
  getDeviceName,
  getToken,
  invalidateSession,
  loadSession,
  setToken,
  takeSignOutReason,
} from './session';

describe('session', () => {
  let store = memoryStore();
  beforeEach(() => {
    store = memoryStore();
    __setStoreForTests(store);
  });

  it('persists the token and reloads it into memory', async () => {
    setToken('t1');
    await new Promise((r) => setTimeout(r));
    expect(await store.get('session.token')).toBe('t1');
    __setStoreForTests(store);
    expect(getToken()).toBeNull();
    await loadSession();
    expect(getToken()).toBe('t1');
  });

  it('remembers why the server ended the session, once', () => {
    setToken('t');
    invalidateSession('reauth_limit');
    expect(getToken()).toBeNull();
    expect(takeSignOutReason()).toBe('reauth_limit');
    expect(takeSignOutReason()).toBeNull();
  });

  it('keeps a stable, API-compatible device id', () => {
    const id = getDeviceId();
    expect(id).toMatch(/^[A-Za-z0-9_-]{16,128}$/);
    expect(getDeviceId()).toBe(id);
  });

  it('names common devices', () => {
    expect(
      getDeviceName(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit Safari/604.1',
      ),
    ).toBe('iPhone – Safari');
    expect(getDeviceName('Mozilla/5.0 (Linux; Android 13) Chrome/120 Mobile Safari')).toBe(
      'Android – Chrome',
    );
  });
});
