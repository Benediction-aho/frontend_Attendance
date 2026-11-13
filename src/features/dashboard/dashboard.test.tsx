import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import { renderAt } from '../../test/render';
import { ApiError } from '../../lib/api';
import { exportErrorMessage } from '../../lib/logs';
import { backQuery } from '../../lib/reports';
import { periodLabel, ratio, weeklyReportText } from './logic';
import { EmployeeOverview } from './EmployeeOverview';
import { DashboardPage } from './DashboardPage';
import type { MyDashboard } from './types';

function stubApi(routes: Record<string, unknown>) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      const path = new URL(url, 'http://x').pathname;
      const body = routes[path];
      return new Response(JSON.stringify(body ?? { message: 'Not found' }), {
        status: body === undefined ? 404 : 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }),
  );
}
afterEach(() => vi.unstubAllGlobals());

const wr = (o: Partial<MyDashboard['week']['weekly_report']> = {}) => ({
  status: 'open' as const,
  expected: true,
  window_date: '2026-11-13',
  opens_at: null,
  deadline: '2026-11-13T17:00:00Z',
  submitted_at: null,
  is_late: null,
  version: null,
  ...o,
});

const myDash: MyDashboard = {
  server_time: '2026-11-13T09:00:00Z',
  work_date: '2026-11-13',
  today: {
    day_status: 'working',
    expected: true,
    checked_in: true,
    checked_out: false,
    check_in_at: '2026-11-13T08:01:00Z',
    check_in_type: 'gps',
    is_late: false,
    mission_status: null,
    tasks_planned: 4,
    tasks_done: 1,
    clients_count: 2,
  },
  week: {
    week_start: '2026-11-09',
    week_end: '2026-11-15',
    presence_days: 4,
    expected_days_so_far: 5,
    late_count: 1,
    tasks_planned: 20,
    tasks_done: 15,
    clients_count: 9,
    weekly_report: wr(),
  },
  month: {
    period_start: '2026-10-26',
    period_end: '2026-11-25',
    presence_days: 14,
    late_count: 2,
    clients_count: 31,
  },
};

describe('dashboard logic', () => {
  it('formats periods and ratios from server values', () => {
    expect(periodLabel('2026-10-26', '2026-11-25')).toBe('26 Oct – 25 Nov 2026');
    expect(ratio(3, 5)).toBe('3 of 5');
    expect(ratio(undefined, 5)).toBeUndefined();
    expect(ratio(1250, 12000)).toBe('1,250 of 12,000');
  });
  it('words every weekly report status', () => {
    expect(weeklyReportText(wr()).label).toBe('To send');
    expect(weeklyReportText(wr({ status: 'missing' })).attention).toBe(true);
    expect(weeklyReportText(wr({ status: 'submitted', is_late: true })).label).toBe('Sent late');
    expect(weeklyReportText(wr({ status: 'not_open' })).label).toBe('Not open yet');
    expect(weeklyReportText(wr({ status: 'not_expected' })).action).toBeUndefined();
  });
  it('keeps only a valid day in the back link (UX5-11)', () => {
    expect(backQuery(new URLSearchParams('back=2026-11-02'))).toBe('?date=2026-11-02');
    expect(backQuery(new URLSearchParams('back=javascript:x'))).toBe('');
    expect(backQuery(new URLSearchParams())).toBe('');
  });
  it('explains the CSV export limit', () => {
    const e = new ApiError('client', 429, 'x', null, 120);
    expect(exportErrorMessage(e)).toBe(
      'You have reached the hourly limit of CSV exports. Try again in 2 minutes.',
    );
    expect(exportErrorMessage(new ApiError('client', 403, 'x'))).toContain('super admins');
  });
});

describe('EmployeeOverview', () => {
  it('shows this week and this month as returned by the server', async () => {
    stubApi({ '/me/dashboard': { data: myDash } });
    renderAt(<EmployeeOverview />, '/app');
    const week = await screen.findByTestId('dash-week');
    expect(week).toHaveTextContent('4 of 5');
    expect(week).toHaveTextContent('15 of 20');
    expect(within(week).getByTestId('weekly-report-status')).toHaveTextContent('To send');
    expect(within(week).getByRole('link', { name: 'Send my weekly report' })).toHaveAttribute(
      'href',
      '/app/reports/weekly',
    );
    expect(screen.getByTestId('dash-month')).toHaveTextContent('26 Oct – 25 Nov 2026');
    expect(screen.getByTestId('dash-today')).toHaveTextContent('1 of 4');
  });
});

describe('Admin DashboardPage', () => {
  it('shows only the sections and fields returned, never a 0 for a hidden one', async () => {
    stubApi({
      '/me': { data: { id: 1, first_name: 'Kofi', role: 'admin', permissions: [] } },
      '/notifications/unread-count': { count: 0 },
      '/admin/dashboard': {
        data: {
          server_time: '2026-11-13T09:00:00Z',
          work_date: '2026-11-13',
          today: {
            expected: 10,
            checked_in: 7,
            missing: 3,
            on_leave: 0,
            remote: 1,
            not_working: 2,
          },
          pending: { sign_up_requests: 2 },
        },
      },
    });
    renderAt(<DashboardPage />, '/app');
    const today = await screen.findByTestId('admin-today');
    expect(today).toHaveTextContent('7 of 10');
    expect(today).not.toHaveTextContent('Late');
    expect(today).not.toHaveTextContent('Refused');
    expect(screen.queryByTestId('admin-week')).toBeNull();
    expect(screen.queryByTestId('admin-month')).toBeNull();
    const pending = screen.getByTestId('admin-pending');
    expect(within(pending).getByRole('link', { name: /Sign-up requests/ })).toHaveAttribute(
      'href',
      '/app/admin/requests',
    );
    expect(pending).not.toHaveTextContent('Face ID');
  });
});

describe('Phase 6 review fixes', () => {
  it('words the secondary line with distinct day off / holiday counts (UX6-03)', async () => {
    const { todaySecondary } = await import('./logic');
    expect(todaySecondary({ on_leave: 1, remote: 2, day_off: 4, holiday: 0, not_working: 5 })).toBe(
      '1 on leave · 2 remote · 4 day off',
    );
    expect(todaySecondary({ not_working: 3 })).toBe('3 not working');
    expect(todaySecondary({ late: 1 })).toBeUndefined();
  });
  it('shows 3 key figures, the unexpected check-ins, nowrap quantities and sorted pending rows', async () => {
    stubApi({
      '/me': { data: { id: 1, first_name: 'Kofi', role: 'super_admin', permissions: [] } },
      '/notifications/unread-count': { count: 0 },
      '/admin/dashboard': {
        data: {
          server_time: '2026-11-13T09:00:00Z',
          work_date: '2026-11-13',
          today: {
            expected: 10,
            checked_in: 7,
            missing: 3,
            late: 1,
            on_leave: 1,
            remote: 0,
            day_off: 2,
            holiday: 0,
            not_working: 3,
            checked_in_not_expected: 1,
            missions_pending: 2,
          },
          week: {
            week_start: '2026-11-09',
            week_end: '2026-11-13',
            closes_at: '2026-11-14T08:00:00Z',
            weekly_reports_received: 5,
            weekly_reports_expected: 12,
          },
          month: {
            period_start: '2026-10-26',
            period_end: '2026-11-25',
            services_top: [
              { service: 'A very long service name '.repeat(5), service_key: 'x', quantity: 1250 },
            ],
          },
          pending: { sign_up_requests: 0, faceid_devices: 3, missions: 2 },
        },
      },
    });
    renderAt(<DashboardPage />, '/app');
    const today = await screen.findByTestId('admin-today');
    expect(today).not.toHaveTextContent('Missions to approve');
    expect(screen.getByTestId('today-secondary')).toHaveTextContent('1 on leave · 2 day off');
    expect(screen.getByTestId('today-unexpected')).toHaveTextContent('1 checked in');
    expect(screen.getByTestId('admin-week')).toHaveTextContent('9 Nov – 13 Nov 2026');
    expect(screen.getByTestId('week-closes')).toHaveTextContent(/^Closes /);
    expect(screen.getByTestId('service-qty').className).toContain('whitespace-nowrap');
    // UI6-14: en-GB thousands separators.
    expect(screen.getByTestId('service-qty')).toHaveTextContent('1,250');
    // UI6-13: 2 columns on phones, Checked in full width, caption from sm only.
    const fig = screen.getByTestId('fig-checked-in');
    expect(fig.className).toContain('col-span-2');
    expect(fig.parentElement?.className).toContain('grid-cols-2 sm:grid-cols-3');
    expect(within(fig).getByText('Of expected today').className).toContain('hidden sm:block');
    const links = within(screen.getByTestId('admin-pending')).getAllByRole('link');
    expect(links.map((l) => l.textContent)).toEqual([
      'Face ID devices3Review',
      'Mission check-ins2Review',
      'Sign-up requestsNone',
    ]);
  });
  it('shows a single message when nothing is pending (UI6-06)', async () => {
    stubApi({
      '/me': { data: { id: 1, first_name: 'Kofi', role: 'admin', permissions: [] } },
      '/notifications/unread-count': { count: 0 },
      '/admin/dashboard': {
        data: {
          server_time: '2026-11-13T09:00:00Z',
          work_date: '2026-11-13',
          pending: { sign_up_requests: 0 },
        },
      },
    });
    renderAt(<DashboardPage />, '/app');
    const p = await screen.findByTestId('admin-pending');
    expect(p).toHaveTextContent('Nothing to review.');
    expect(p).not.toHaveTextContent('None');
    expect(within(p).getByRole('link', { name: 'See sign-up requests' })).toBeInTheDocument();
  });
  it('names a CSV with the date when the server name is unreadable (UX6-05)', async () => {
    const { fallbackExportName, exportErrorMessage: m } = await import('../../lib/logs');
    expect(fallbackExportName(new Date('2026-11-13T06:10:20Z'))).toBe(
      'activity_log_2026-11-13_061020.csv',
    );
    expect(m(new ApiError('client', 429, 'x', { retry_after_seconds: 60 }), '07:10')).toContain(
      'available again at 07:10',
    );
  });
});
