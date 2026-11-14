import { expect, test } from '@playwright/test';
import { mockApi, newState, signInUi, SUPER } from './mockApi';

const SETTINGS = [
  {
    key: 'checkin_radius_m',
    label: 'Check-in perimeter radius (m)',
    group: 'attendance',
    section: 'attendance',
    type: 'int',
    editable: true,
    value: 50,
    default: 50,
    scheduled: [],
  },
  {
    key: 'work_start_time',
    label: 'Work start time',
    group: 'attendance',
    section: 'attendance',
    type: 'time',
    editable: true,
    value: '08:10',
    default: '08:00',
    scheduled: [],
  },
  {
    key: 'report_send_time',
    label: 'Daily report time',
    group: 'reports',
    section: 'reports',
    type: 'time',
    editable: true,
    value: '17:00',
    default: '17:00',
    scheduled: [],
  },
  {
    key: 'lockout_failures',
    label: 'Failed sign-ins before lock',
    group: 'security',
    section: 'security',
    type: 'int',
    editable: true,
    value: 5,
    default: 5,
    scheduled: [],
  },
];

const ADMIN = {
  id: 2,
  role: 'admin',
  first_name: 'Esi',
  last_name: 'Owusu',
  email: 'esi@assistance.test',
};

const parts = (page: import('@playwright/test').Page) =>
  page.getByRole('navigation', { name: 'Settings parts' }).getByRole('link');

test('super admin sees the three parts and times in 12-hour format', async ({ page }) => {
  const state = newState(SUPER, []);
  state.settings = SETTINGS;
  await mockApi(page, state);
  await signInUi(page, 'kofi@assistance.test');
  await page.goto('/app/admin/settings');
  await expect(page).toHaveURL(/\/app\/admin\/settings\/attendance$/);
  await expect(parts(page)).toHaveText(['Attendance', 'Reports', 'Security']);
  const start = page.getByLabel('Work start time');
  await expect(start).toHaveValue('8:10 AM');
  await expect(start).toHaveAttribute('type', 'text');
  await expect(page.getByText('12-hour clock, e.g. 8:10 AM or 5:00 PM.').first()).toBeVisible();
  await start.fill('7.30am');
  await start.blur();
  await expect(start).toHaveValue('7:30 AM');
  await page.getByRole('button', { name: 'Save now' }).click();
  await expect(page.getByText('Settings saved. They apply now.')).toBeVisible();
  const put = state.calls.find((c) => c.method === 'PUT')?.body;
  expect(put).toEqual({ values: { work_start_time: '07:30' } });
  await parts(page).filter({ hasText: 'Reports' }).click();
  await expect(page.getByLabel('Daily report time')).toHaveValue('5:00 PM');
  await expect(page.getByLabel('Check-in perimeter radius (m)')).toHaveCount(0);
});

test('admin with one tier sees only that part; others show no access', async ({ page }) => {
  const state = newState({ ...ADMIN, permissions: ['manage_settings_reports'] }, []);
  state.settings = SETTINGS;
  await mockApi(page, state);
  await signInUi(page, 'esi@assistance.test');
  await page.goto('/app/admin');
  await page
    .getByRole('link', { name: /Settings/ })
    .first()
    .click();
  await expect(page).toHaveURL(/\/app\/admin\/settings\/reports$/);
  await expect(page.getByRole('heading', { name: 'Settings – Reports' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Settings parts' })).toHaveCount(0);
  await expect(page.getByLabel('Daily report time')).toHaveValue('5:00 PM');
  await page.goto('/app/admin/settings/security');
  await expect(page.getByText('You do not have access to this page')).toBeVisible();
  await page.goto('/app/admin/settings/attendance');
  await expect(page.getByText('You do not have access to this page')).toBeVisible();
});

test('admin without a settings tier has no Settings entry', async ({ page }) => {
  const state = newState({ ...ADMIN, permissions: ['view_logs'] }, []);
  state.settings = SETTINGS;
  await mockApi(page, state);
  await signInUi(page, 'esi@assistance.test');
  await page.goto('/app/admin');
  await expect(page.getByRole('link', { name: 'Activity log' }).first()).toBeVisible();
  await expect(page.getByRole('link', { name: /Settings/ })).toHaveCount(0);
  await page.goto('/app/admin/settings');
  await expect(page.getByText('You do not have access to this page')).toBeVisible();
});

test('a 403 on save explains it and keeps the session', async ({ page }) => {
  const state = newState({ ...ADMIN, permissions: ['manage_settings_attendance'] }, []);
  state.settings = SETTINGS;
  state.settingsPutStatus = 403;
  await mockApi(page, state);
  await signInUi(page, 'esi@assistance.test');
  await page.goto('/app/admin/settings/attendance');
  await page.getByLabel('Check-in perimeter radius (m)').fill('80');
  await page.getByLabel('Check-in perimeter radius (m)').blur();
  await page.getByRole('button', { name: 'Save now' }).click();
  await expect(page.getByText(/not allowed to change these settings/)).toBeVisible();
  await expect(page).toHaveURL(/\/app\/admin\/settings\/attendance$/);
  await expect(page.getByLabel('Check-in perimeter radius (m)')).toHaveValue('50');
});
