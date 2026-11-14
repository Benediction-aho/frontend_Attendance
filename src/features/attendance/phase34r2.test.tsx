import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { renderAt } from '../../test/render';
import { ApiError } from '../../lib/api';
import type { Today } from '../../lib/attendance';
import { resetServerTime } from '../../lib/serverTime';
import { checkInProblem } from './checkInErrors';
import { TodayPage } from './TodayPage';
import { mergeProgress } from './useCheckIn';
import { DayStatusBadge } from './parts';
import { render } from '@testing-library/react';
import { safeReturnPath, rememberReturnTo, takeReturnTo } from '../auth/returnTo';

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

describe('Re-review 2 fixes', () => {
  it('UI34-18: near the edge, retry at the office is the main action and the hint is outside the alert', async () => {
    geoAt(35);
    stubApi((path) => {
      if (path === '/attendance/today') return { body: base() };
      if (path === '/attendance/check-in/intent')
        return {
          status: 422,
          body: { code: 'out_of_perimeter', distance_m: 70, radius_m: 50, message: 'x' },
        };
      return { body: { selected: true } };
    });
    renderAt(<TodayPage />, '/app');
    fireEvent.click(await screen.findByRole('button', { name: 'Check in at the office' }));
    const retry = await screen.findByRole('button', { name: 'Try again at the office' });
    const mission = screen.getByRole('button', { name: 'Mission check-in' });
    expect(retry.compareDocumentPosition(mission) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    const hint = screen.getByTestId('problem-hint');
    expect(hint.closest('[role="alert"]')).toBeNull();
    expect(
      checkInProblem(apiErr(422, { code: 'out_of_perimeter', distance_m: 70, radius_m: 50 }), {
        accuracy: 35,
      }).nearEdge,
    ).toBe(true);
  });

  it('UI34-21: a day off with nothing to do shows only the calm card', async () => {
    stubApi((path) =>
      path === '/attendance/today'
        ? { body: base({ day_status: 'day_off', expected: false, available_check_ins: [] }) }
        : { body: { selected: true } },
    );
    renderAt(<TodayPage />, '/app');
    expect(await screen.findByTestId('rest-day')).toBeInTheDocument();
    expect(screen.queryByText('You are not expected today')).toBeNull();
  });

  it('UX34-09: a mission day reads "Mission" in the history badge', () => {
    render(<DayStatusBadge status="working" checkInType="mission" />);
    expect(screen.getByText('Mission')).toBeInTheDocument();
    expect(screen.queryByText('Office day')).toBeNull();
  });

  it('keeps the last accuracy during retries (no "Getting your position" flicker)', () => {
    const prev = { attempt: 3, accuracy: 120, target: 50 };
    expect(mergeProgress(prev, { attempt: 1, accuracy: null, target: 50 }).accuracy).toBe(120);
    expect(mergeProgress(null, { attempt: 1, accuracy: null, target: 50 }).accuracy).toBeNull();
    expect(mergeProgress(prev, { attempt: 2, accuracy: 40, target: 50 }).accuracy).toBe(40);
  });

  it('restores a deep link after sign-in, only for in-app paths', () => {
    rememberReturnTo('/app/admin/users/42?tab=x');
    expect(takeReturnTo()).toBe('/app/admin/users/42?tab=x');
    expect(takeReturnTo()).toBe('/app');
    expect(takeReturnTo('/app/reports')).toBe('/app/reports');
    expect(safeReturnPath('//evil.com')).toBeNull();
    expect(safeReturnPath('https://evil.com/app')).toBeNull();
    expect(safeReturnPath('/application')).toBeNull();
    expect(safeReturnPath('/app/x')).toBe('/app/x');
  });
});
