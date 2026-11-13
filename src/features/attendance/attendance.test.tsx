import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { renderAt } from '../../test/render';
import { ApiError } from '../../lib/api';
import {
  checkOutPlace,
  formatDistance,
  weekdayNames,
  type Attendance,
  type Today,
} from '../../lib/attendance';
import { GeoError, locate } from '../../lib/geo';
import { PasskeyError } from '../../lib/webauthn';
import { serverNow, resetServerTime } from '../../lib/serverTime';
import { checkInProblem } from './checkInErrors';
import { looksBeforeEndOfDay } from './CheckOutDialog';
import { TodayPage } from './TodayPage';
import { fetchToday } from './useAttendance';
import { notificationTarget } from '../notifications/target';

const apiErr = (status: number, body: Record<string, unknown>) =>
  new ApiError('client', status, String(body.message ?? 'x'), body);

describe('check-in problems: a clear message for every case', () => {
  it('shows the distance and radius from the API when out of the perimeter', () => {
    const p = checkInProblem(
      apiErr(422, { code: 'out_of_perimeter', distance_m: 3240, radius_m: 50 }),
    );
    expect(p.kind).toBe('out_of_perimeter');
    expect(p.message).toContain('3.2 km from the office');
    expect(p.message).toContain('within 50 m');
    expect(p.message).toContain('mission check-in');
  });

  it('explains low accuracy with the values from the API', () => {
    const p = checkInProblem(
      apiErr(422, { code: 'low_accuracy', accuracy_m: 120, max_accuracy_m: 50 }),
    );
    expect(p.message).toContain('120 m');
    expect(p.message).toContain('50 m or better');
  });

  it('shows the server messages for low accuracy, already checked in and not open yet', () => {
    const low =
      'Your GPS position is not precise enough: about 120 m of uncertainty, and the maximum accepted is 100 m. Move near a window or step outside, wait a few seconds, then try again.';
    expect(checkInProblem(apiErr(422, { code: 'low_accuracy', message: low })).message).toBe(low);
    const done =
      'You already checked in and out today. You can check in again tomorrow from 6:00 AM.';
    const p = checkInProblem(apiErr(409, { code: 'already_checked_in', message: done }));
    expect(p.message).toBe(done);
    const early = checkInProblem(
      apiErr(422, {
        code: 'checkin_not_open',
        opens_at: '06:00',
        message: 'Check-in opens at 6:00 AM.',
      }),
    );
    expect(early.kind).toBe('not_open');
    expect(early.message).toBe('Check-in opens at 6:00 AM.');
  });

  it('offline, GPS denied, Face ID cancelled, pending device, expired intent', () => {
    expect(checkInProblem(new ApiError('network', null, 'x')).kind).toBe('offline');
    expect(checkInProblem(new GeoError('denied', 'blocked')).steps?.length).toBeGreaterThan(2);
    expect(checkInProblem(new PasskeyError('cancelled', 'c')).kind).toBe('faceid_cancelled');
    const pend = checkInProblem(apiErr(403, { code: 'faceid_pending_approval' }));
    expect(pend.faceidState).toBe('pending_approval');
    expect(checkInProblem(apiErr(422, { code: 'intent_invalid' })).kind).toBe('expired');
    expect(checkInProblem(apiErr(429, { retry_after_seconds: 30 })).message).toContain('30 s');
  });
});

describe('attendance display helpers', () => {
  it('formats distances', () => {
    expect(formatDistance(42.4)).toBe('42 m');
    expect(formatDistance(3240)).toBe('3.2 km');
    expect(formatDistance(null)).toBe('–');
  });

  it('describes the check-out position', () => {
    const base = { check_out_at: '2026-11-12T17:05:00Z' } as Attendance;
    expect(checkOutPlace({ ...base, check_out_at_office: true })).toBe('At the office');
    expect(checkOutPlace({ ...base, check_out_distance_m: 3200 })).toBe('3.2 km from the office');
    expect(checkOutPlace({ ...base, check_out_position_available: false })).toBe(
      'Position not available',
    );
    expect(checkOutPlace({ ...base, checkout_forgotten: true })).toBeNull();
  });

  it('names weekdays', () => {
    expect(weekdayNames([3, 1])).toBe('Monday, Wednesday');
    expect(weekdayNames([])).toBe('None');
  });

  it('shows the reason field before the end of day (display hint only)', () => {
    const rules = { end_of_day: '17:00', early_checkout_reason_required: true };
    expect(looksBeforeEndOfDay(rules, new Date('2026-11-12T15:00:00Z'))).toBe(true);
    expect(looksBeforeEndOfDay(rules, new Date('2026-11-12T17:30:00Z'))).toBe(false);
    expect(looksBeforeEndOfDay({ ...rules, early_checkout_reason_required: false })).toBe(false);
  });

  it('opens the check-in screen from the reminder notification', () => {
    expect(
      notificationTarget({
        id: '1',
        data: { kind: 'checkin_reminder' },
        read_at: null,
        created_at: '',
      }),
    ).toBe('/app');
    expect(
      notificationTarget({
        id: '2',
        data: { path: '/admin/faceid-devices' },
        read_at: null,
        created_at: '',
      }),
    ).toBe('/app/admin/faceid-devices');
  });
});

function fakeGeo(readings: (number | 'denied')[]) {
  return {
    watchPosition: (ok: PositionCallback, fail: PositionErrorCallback) => {
      readings.forEach((r, i) =>
        setTimeout(() => {
          if (r === 'denied') fail({ code: 1, message: 'denied' } as GeolocationPositionError);
          else
            ok({ coords: { latitude: 5.6, longitude: -0.2, accuracy: r } } as GeolocationPosition);
        }, i),
      );
      return 1;
    },
    clearWatch: vi.fn(),
    getCurrentPosition: vi.fn(),
  } as unknown as Geolocation;
}

describe('GPS with accuracy retries', () => {
  it('keeps reading until the accuracy is good enough and reports progress', async () => {
    const progress: (number | null)[] = [];
    const p = await locate({
      targetAccuracy: 50,
      geolocation: fakeGeo([300, 120, 40, 10]),
      onProgress: (x) => progress.push(x.accuracy),
    });
    expect(p.accuracy).toBe(40);
    expect(progress).toEqual([null, 300, 120, 40]);
  });

  it('maps a refused permission to a clear message', async () => {
    await expect(locate({ geolocation: fakeGeo(['denied']) })).rejects.toMatchObject({
      kind: 'denied',
    });
  });

  it('returns the best reading when time runs out', async () => {
    const p = await locate({ targetAccuracy: 5, timeoutMs: 30, geolocation: fakeGeo([90, 60]) });
    expect(p.accuracy).toBe(60);
  });
});

const today = (o: Partial<Today> = {}): Today => ({
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
  rules: {
    radius_m: 50,
    max_accuracy_m: 50,
    late_after: '08:10',
    end_of_day: '17:00',
    faceid_required: true,
  },
  faceid_state: 'ready',
  ...o,
});

function route(map: Record<string, unknown>) {
  return vi.fn(async (url: string) => {
    const path = new URL(url, 'http://x').pathname;
    const body = map[path] ?? { data: [] };
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  });
}

describe('Today screen', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    resetServerTime();
  });

  it('syncs the displayed clock with the server time', async () => {
    vi.stubGlobal(
      'fetch',
      route({ '/attendance/today': today({ server_timestamp_ms: Date.now() + 3_600_000 }) }),
    );
    await fetchToday();
    expect(Math.round((serverNow().getTime() - Date.now()) / 60_000)).toBe(60);
  });

  it('offers office and mission check-in, and remote in one tap on remote days', async () => {
    vi.stubGlobal(
      'fetch',
      route({
        '/attendance/today': today({
          day_status: 'remote',
          available_check_ins: ['gps', 'mission', 'remote'],
        }),
        '/me/work-schedule': {
          selected: true,
          locked: true,
          working_days: [1, 2, 3, 4, 5],
          current: null,
          upcoming: [],
        },
      }),
    );
    renderAt(<TodayPage />, '/app');
    expect(await screen.findByRole('button', { name: 'Check in remotely' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Check in at the office' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Mission check-in/ })).toBeInTheDocument();
    expect(screen.getByText(/after 08:10 count as late/)).toBeInTheDocument();
  });

  it('shows when check-in opens instead of the button before opening time', async () => {
    const t = today();
    vi.stubGlobal(
      'fetch',
      route({
        '/attendance/today': {
          ...t,
          rules: { ...t.rules, checkin_opens_at: '06:00', checkin_open: false },
        },
        '/me/work-schedule': { selected: true },
      }),
    );
    renderAt(<TodayPage />, '/app');
    expect(await screen.findByTestId('checkin-not-open')).toHaveTextContent(
      'Check-in opens at 6:00 AM',
    );
    expect(screen.queryByRole('button', { name: 'Check in at the office' })).toBeNull();
  });

  it('says see you tomorrow after check-out', async () => {
    const t = today();
    const a: Attendance = {
      id: 2,
      work_date: '2026-11-12',
      day_status: 'working',
      check_in_type: 'gps',
      check_in_at: '2026-11-12T07:50:00Z',
      check_out_at: '2026-11-12T17:10:00Z',
    };
    vi.stubGlobal(
      'fetch',
      route({
        '/attendance/today': {
          ...t,
          checked_in: true,
          checked_out: true,
          attendance: a,
          available_check_ins: [],
          rules: { ...t.rules, checkin_opens_at: '06:00', checkin_open: true },
        },
        '/me/work-schedule': { selected: true },
      }),
    );
    renderAt(<TodayPage />, '/app');
    expect(await screen.findByTestId('see-you-tomorrow')).toHaveTextContent(
      'See you tomorrow – check-in opens at 6:00 AM',
    );
  });

  it('asks to set up Face ID before any check-in', async () => {
    vi.stubGlobal(
      'fetch',
      route({
        '/attendance/today': today({ faceid_state: 'not_registered' }),
        '/me/work-schedule': { selected: true },
      }),
    );
    renderAt(<TodayPage />, '/app');
    expect(await screen.findByRole('button', { name: 'Set up Face ID' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Check in at the office' })).toBeNull();
  });

  it('shows the checked-in state with lateness only when returned, then check-out', async () => {
    const a: Attendance = {
      id: 1,
      work_date: '2026-11-12',
      day_status: 'working',
      check_in_type: 'mission',
      check_in_at: '2026-11-12T08:20:00Z',
      mission_status: 'pending',
      reason: '<b>Client</b> visit',
    };
    vi.stubGlobal(
      'fetch',
      route({
        '/attendance/today': today({ checked_in: true, attendance: a, available_check_ins: [] }),
        '/me/work-schedule': {
          selected: false,
          locked: false,
          working_days: [1, 2, 3, 4, 5],
          current: null,
          upcoming: [],
        },
      }),
    );
    renderAt(<TodayPage />, '/app');
    expect(await screen.findByText('You are checked in')).toBeInTheDocument();
    expect(screen.queryByText('Late')).toBeNull();
    expect(screen.getByText('Mission: waiting for approval')).toBeInTheDocument();
    // Free text stays plain text.
    expect(screen.getByText('<b>Client</b> visit')).toBeInTheDocument();
    expect(screen.getByText('Choose your days off and remote days')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Check out' }));
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());
  });
});
