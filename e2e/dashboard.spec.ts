import { expect, test } from '@playwright/test';
import { makeUser, mockApi, newState, signInUi, SUPER } from './mockApi';

test('employee home shows today, this week and this month from the server', async ({ page }) => {
  const state = newState();
  await mockApi(page, state);
  await signInUi(page);
  await page.goto('/app');
  const week = page.getByTestId('dash-week');
  await expect(week).toContainText('4 of 5');
  await expect(page.getByTestId('weekly-report-status')).toHaveText('To send');
  await expect(page.getByTestId('dash-month')).toContainText('26 Oct – 25 Nov 2026');
  await week.getByRole('link', { name: 'Send my weekly report' }).click();
  await expect(page).toHaveURL(/\/app\/reports\/weekly/);
});

test('super admin dashboard: server figures and actionable pending items', async ({ page }) => {
  const state = newState(SUPER);
  state.adminDashboard = {
    server_time: new Date().toISOString(),
    work_date: '2026-11-13',
    today: {
      expected: 12,
      checked_in: 9,
      missing: 3,
      on_leave: 1,
      remote: 2,
      not_working: 4,
      late: 2,
      refused_attempts: 1,
      missions_pending: 1,
    },
    week: {
      week_start: '2026-11-09',
      window_date: '2026-11-13',
      closes_at: '2026-11-14T08:00:00Z',
      closed: false,
      weekly_reports_received: 5,
      weekly_reports_expected: 12,
    },
    month: {
      period_start: '2026-10-26',
      period_end: '2026-11-25',
      to_date: '2026-11-13',
      late_count: 7,
      clients_count: 140,
      services_top: [
        { service: 'Visa application', service_key: 'visa application', quantity: 40 },
      ],
    },
    pending: { sign_up_requests: 2, faceid_devices: 0, missions: 1 },
  };
  await mockApi(page, state);
  await signInUi(page, 'kofi@assistance.test');
  await page.goto('/app');
  await expect(page.getByTestId('fig-checked-in')).toContainText('9 of 12');
  await expect(page.getByTestId('fig-weekly')).toContainText('5 of 12');
  await expect(page.getByTestId('services-top')).toContainText('Visa application');
  await page
    .getByTestId('admin-pending')
    .getByRole('link', { name: /Sign-up requests/ })
    .click();
  await expect(page).toHaveURL(/\/app\/admin\/requests/);
});

test('limited admin sees only the sections returned', async ({ page }) => {
  const admin = makeUser({
    id: 5,
    role: 'admin',
    email: 'abena@assistance.test',
    permissions: ['approve_users'],
  });
  const state = newState(admin);
  state.adminDashboard = {
    server_time: new Date().toISOString(),
    work_date: '2026-11-13',
    pending: { sign_up_requests: 0 },
  };
  await mockApi(page, state);
  await signInUi(page, 'abena@assistance.test');
  await page.goto('/app');
  await expect(page.getByTestId('admin-pending')).toContainText('Nothing to review');
  await expect(page.getByTestId('admin-today')).toHaveCount(0);
  await expect(page.getByTestId('admin-month')).toHaveCount(0);
});

test('super admin exports the activity log as CSV with filters, and sees the hourly limit', async ({
  page,
}) => {
  const state = newState(SUPER);
  state.settings = [
    {
      key: 'log_export_max_rows',
      label: 'x',
      group: 'security',
      type: 'int',
      editable: true,
      value: 100000,
      default: 100000,
      scheduled: [],
    },
  ];
  await mockApi(page, state);
  await signInUi(page, 'kofi@assistance.test');
  await page.goto('/app/admin/logs?type=security');
  await expect(page.getByTestId('log-export')).toContainText('at most 100,000 rows');
  const req = page.waitForRequest(/activity-logs\/export\?type=security$/);
  const dl = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export CSV' }).click();
  expect((await dl).suggestedFilename()).toBe('activity_log_2026-11-13_090000.csv');
  await req;
  state.exportStatus = 429;
  await page.getByRole('button', { name: 'Export CSV' }).click();
  await expect(page.getByText('hourly limit of CSV exports')).toBeVisible();
});

test('cap warning reads cleanly and gives way to the hourly limit (UX6-10, UI6-15)', async ({
  page,
}) => {
  const state = newState(SUPER);
  state.settings = [
    {
      key: 'log_export_max_rows',
      label: 'x',
      group: 'security',
      type: 'int',
      editable: true,
      value: 1,
      default: 1,
      scheduled: [],
    },
  ];
  const entry = (id: number) => ({
    id,
    created_at: '2026-11-12T08:00:00Z',
    type: 'security',
    level: 'warning',
    event: 'auth.failed',
    description: 'Failed sign-in',
    user: null,
    actor: null,
    context: null,
    ip: null,
    device_id: null,
    user_agent: null,
  });
  state.logs = [entry(1), entry(2)];
  await mockApi(page, state);
  await signInUi(page, 'kofi@assistance.test');
  await page.goto('/app/admin/logs?type=security');
  const box = page.getByTestId('log-export-messages');
  await expect(box).toContainText('to get the rest. Change dates');
  state.exportStatus = 429;
  await page.getByRole('button', { name: 'Export CSV' }).click();
  await expect(box).toContainText('hourly limit of CSV exports');
  await expect(box).not.toContainText('Change dates');
});
