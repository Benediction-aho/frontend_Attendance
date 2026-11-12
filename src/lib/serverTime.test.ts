import { afterEach, describe, expect, it } from 'vitest';
import {
  recordServerDate,
  resetServerTime,
  serverNow,
  serverOffsetMs,
  syncFromServerTimestamp,
} from './serverTime';

describe('server time', () => {
  afterEach(resetServerTime);

  it('computes the offset from a server timestamp', () => {
    syncFromServerTimestamp('2026-01-01T08:00:10.000Z', Date.parse('2026-01-01T08:00:00.000Z'));
    expect(serverOffsetMs()).toBe(10_000);
    expect(Math.abs(serverNow().getTime() - (Date.now() + 10_000))).toBeLessThan(50);
  });

  it('ignores the coarse Date header once precisely synced', () => {
    syncFromServerTimestamp(Date.now() + 5000);
    recordServerDate(new Date(Date.now() - 60_000).toUTCString());
    expect(Math.abs(serverOffsetMs() - 5000)).toBeLessThan(50);
  });
});
