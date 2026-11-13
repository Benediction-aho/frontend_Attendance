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
