import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { renderAt } from '../../test/render';
import { ApiError } from '../../lib/api';
import type { Attendance, Today } from '../../lib/attendance';
import { inAppMessage } from '../../lib/browser';
import { resetServerTime, syncFromServerTimestamp } from '../../lib/serverTime';
import { checkInProblem, LOCATION_STEPS } from './checkInErrors';
import { TodayPage } from './TodayPage';
import { confirmedToday } from './useCheckIn';
import { GeoError } from '../../lib/geo';

const apiErr = (status: number, body: Record<string, unknown>) =>
  new ApiError('client', status, String(body.message ?? 'x'), body);

const base = (o: Partial<Today> = {}): Today => ({
  server_time: '2026-11-12T08:00:00Z',
  server_timestamp_ms: Date.parse('2026-11-12T08:00:00Z'),
  timezone: 'Africa/Accra',
  work_date: '2026-11-12',
  day_status: 'working',
  expected: true,
  holiday_name: null,
  checked_in: false,
  checked_out: false,
  attendance: null,
  available_check_ins: ['gps', 'mission'],
  rules: { radius_m: 50, max_accuracy_m: 50, late_after: '08:10', end_of_day: '17:00' },
  faceid_state: 'ready',
  ...o,
});

const att: Attendance = {
  id: 7,
  work_date: '2026-11-12',
  day_status: 'working',
  check_in_type: 'gps',
  check_in_at: '2026-11-12T08:02:00Z',
};

type Handler = (path: string, init?: RequestInit) => { status?: number; body: unknown };

function stubApi(handler: Handler) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      const path = new URL(url, 'http://x').pathname;
      const r = handler(path, init);
      // A refetch that never answers (very slow network).
      if (r.body === '__hang__') return new Promise<Response>(() => {});
      return new Response(JSON.stringify(r.body), {
        status: r.status ?? 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }),
  );
}

function geoAt(accuracy: number) {
  vi.stubGlobal('navigator', {
    ...navigator,
    onLine: true,
    geolocation: {
      watchPosition: (ok: PositionCallback) => {
        setTimeout(() =>
          ok({ coords: { latitude: 5.6, longitude: -0.2, accuracy } } as GeolocationPosition),
        );
        return 1;
      },
      clearWatch: vi.fn(),
    },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  resetServerTime();
});

describe('check-in messages (UX34-08, UI34-06)', () => {
  it('hints that the position may improve at the edge of the perimeter', () => {
    const body = { code: 'out_of_perimeter', distance_m: 70, radius_m: 50 };
    expect(checkInProblem(apiErr(422, body), { accuracy: 30 }).hint).toContain('window');
    expect(checkInProblem(apiErr(422, body), { accuracy: 5 }).hint).toBeUndefined();
  });

  it('gives numbered location steps for the detected platform only', () => {
    const p = checkInProblem(new GeoError('denied', 'x'));
    expect(p.steps).toEqual(LOCATION_STEPS.desktop);
    expect(LOCATION_STEPS.ios.join(' ')).not.toContain('Chrome');
  });

  it('gives one in-app browser instruction per platform (UI34-15)', () => {
    expect(inAppMessage('whatsapp', 'ios')).not.toContain('three dots');
    expect(inAppMessage('whatsapp', 'android')).toContain('three dots');
  });
});

describe('Today after a check-in (UX34-02)', () => {
  it('builds the confirmed state from the confirm payload', () => {
    const t = confirmedToday(base(), att);
    expect(t.checked_in).toBe(true);
    expect(t.attendance).toEqual(att);
    expect(t.available_check_ins).toEqual([]);
  });

  it('shows the confirmed attendance at once, even if the refetch is slow', async () => {
    geoAt(10);
    let todayCalls = 0;
    stubApi((path) => {
      if (path === '/attendance/today') {
        todayCalls += 1;
        if (todayCalls > 1) return { body: '__hang__' };
        return { body: base({ rules: { ...base().rules, faceid_required: false } }) };
      }
      if (path === '/attendance/check-in/intent')
        return {
          status: 201,
          body: { intent_id: 'i', type: 'gps', distance_m: 5, faceid_options: null },
        };
      if (path === '/attendance/check-in/confirm')
        return { status: 201, body: { data: att, created: true } };
      return { body: { selected: true } };
    });
    renderAt(<TodayPage />, '/app');
    fireEvent.click(await screen.findByRole('button', { name: 'Check in at the office' }));
    expect(await screen.findByText('You are checked in')).toBeInTheDocument();
    expect(todayCalls).toBeGreaterThanOrEqual(1);
  });
});

describe('Today screen fixes', () => {
  it('makes the mission check-in the single main action when out of the perimeter (UI34-01)', async () => {
    geoAt(10);
    stubApi((path) => {
      if (path === '/attendance/today') return { body: base() };
      if (path === '/attendance/check-in/intent')
        return {
          status: 422,
          body: { code: 'out_of_perimeter', distance_m: 3200, radius_m: 50, message: 'x' },
        };
      return { body: { selected: true } };
    });
    renderAt(<TodayPage />, '/app');
    fireEvent.click(await screen.findByRole('button', { name: 'Check in at the office' }));
    expect(await screen.findByRole('button', { name: 'Mission check-in' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again at the office' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Check in at the office' })).toBeNull();
  });

  it('offers to register Face ID again after two failures (UX34-01)', async () => {
    geoAt(10);
    stubApi((path) => {
      if (path === '/attendance/today') return { body: base() };
      if (path === '/attendance/check-in/intent')
        return {
          status: 201,
          body: {
            intent_id: 'i',
            type: 'gps',
            distance_m: 5,
            faceid_options: { challenge_id: 'c', public_key: { challenge: 'AAAA' } },
          },
        };
      return { body: { selected: true } };
    });
    // The passkey is gone: the browser refuses every assertion.
    vi.stubGlobal('PublicKeyCredential', function PublicKeyCredential() {});
    Object.defineProperty(navigator, 'credentials', {
      configurable: true,
      value: {
        create: vi.fn(),
        get: () => Promise.reject(new DOMException('no credential', 'NotAllowedError')),
      },
    });
    renderAt(<TodayPage />, '/app');
    fireEvent.click(await screen.findByRole('button', { name: 'Check in at the office' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(screen.getByTestId('faceid-help')).toBeInTheDocument());
    expect(screen.getByTestId('faceid-help').textContent).toContain(
      'Register it again; an administrator will approve it.',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Register Face ID again' }));
    expect(
      await screen.findByRole('heading', { name: 'Register Face ID again' }),
    ).toBeInTheDocument();
  });

  it('shows a calm card on a day off with nothing to do (UI34-08)', async () => {
    stubApi((path) =>
      path === '/attendance/today'
        ? { body: base({ day_status: 'day_off', expected: false, available_check_ins: [] }) }
        : { body: { selected: true } },
    );
    renderAt(<TodayPage />, '/app');
    expect(await screen.findByTestId('rest-day')).toHaveTextContent('Enjoy your day off.');
    expect(screen.queryByText(/You can still check in/)).toBeNull();
    expect(screen.queryByText(/tap the button/)).toBeNull();
  });

  it('labels a mission day and hides the early check-out hint after the end of day (UX34-07)', async () => {
    syncFromServerTimestamp(Date.parse('2026-11-12T18:00:00Z'));
    stubApi((path) =>
      path === '/attendance/today'
        ? {
            body: base({
              server_timestamp_ms: Date.parse('2026-11-12T18:00:00Z'),
              checked_in: true,
              available_check_ins: [],
              attendance: { ...att, check_in_type: 'mission', mission_status: 'pending' },
            }),
          }
        : { body: { selected: true } },
    );
    renderAt(<TodayPage />, '/app');
    expect((await screen.findAllByText('Mission')).length).toBeGreaterThan(0);
    expect(screen.queryByText('Office day')).toBeNull();
    expect(screen.getByTestId('checkout-hint').textContent).not.toContain('Before 17:00');
  });

  it('shows the elapsed time and an early hint while the position is poor (UX34-03)', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.stubGlobal('navigator', {
      ...navigator,
      onLine: true,
      geolocation: {
        watchPosition: (ok: PositionCallback) => {
          setTimeout(() =>
            ok({
              coords: { latitude: 5.6, longitude: -0.2, accuracy: 220 },
            } as GeolocationPosition),
          );
          return 1;
        },
        clearWatch: vi.fn(),
      },
    });
    stubApi((path) =>
      path === '/attendance/today' ? { body: base() } : { body: { selected: true } },
    );
    renderAt(<TodayPage />, '/app');
    fireEvent.click(await screen.findByRole('button', { name: 'Check in at the office' }));
    expect(await screen.findByTestId('locate-timer')).toHaveTextContent('of up to 30 s');
    await vi.advanceTimersByTimeAsync(11_000);
    expect(await screen.findByTestId('locate-hint')).toHaveTextContent('window');
  });
});
