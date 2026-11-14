import { expect, test } from '@playwright/test';
import { makeUser, mockApi, newState, signInUi, SUPER } from './mockApi';

const pending = makeUser({
  id: 7,
  first_name: 'Yaw',
  last_name: 'Asante',
  email: 'yaw@assistance.test',
  status: 'pending',
  employee_type: 'intern',
  job_title: 'IT intern',
});

test('super admin approves a sign-up request', async ({ page }) => {
  const state = newState(SUPER, [pending]);
  await mockApi(page, state);
  await signInUi(page, 'kofi@assistance.test');
  await page.goto('/app/admin/requests');
  await expect(page.getByText('Yaw Asante')).toBeVisible();
  await page.getByRole('button', { name: 'Approve' }).click();
  await expect(page.getByText('Yaw Asante approved.', { exact: false })).toBeVisible();
  await expect(page.getByText('No requests waiting')).toBeVisible();
  expect(state.calls.some((c) => c.path === '/admin/users/7/approve')).toBe(true);
});

test('users: search, detail, block with confirmation, permissions editor', async ({ page }) => {
  const admin = makeUser({
    id: 8,
    first_name: 'Abena',
    last_name: 'Darko',
    role: 'admin',
    permissions: ['approve_users'],
  });
  const state = newState(SUPER, [makeUser({ id: 3 }), admin]);
  await mockApi(page, state);
  await signInUi(page, 'kofi@assistance.test');
  await page.goto('/app/admin/users');
  await page.getByLabel('Search').fill('Ama');
  await expect(page.getByText('Abena Darko')).toHaveCount(0);
  await page
    .getByRole('link', { name: /Ama Mensah/ })
    .first()
    .click();
  await page.getByRole('button', { name: 'Block' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Block account' }).click();
  await expect(page.getByText('Account blocked.', { exact: false })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Unblock' })).toBeVisible();

  await page.goto('/app/admin/users/8');
  await page.getByLabel('View activity logs').check();
  await page.getByRole('button', { name: 'Save permissions' }).click();
  await expect(page.getByText('Permissions saved.')).toBeVisible();
  expect(state.users.find((u) => u.id === 8)?.permissions).toEqual(['approve_users', 'view_logs']);
});

test('admin with limited tiers only sees what it is allowed to do', async ({ page }) => {
  const me = { id: 2, role: 'admin', permissions: ['approve_users'], first_name: 'Abena' };
  const state = newState(me, [pending, makeUser({ id: 3 })]);
  await mockApi(page, state);
  await signInUi(page);
  await page.goto('/app/admin/users/3');
  await expect(page.getByRole('heading', { name: 'Ama Mensah' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Block' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Delete account' })).toHaveCount(0);
  await page.goto('/app/admin/settings');
  await expect(page.getByText('You do not have access to this page')).toBeVisible();
});

test('super admin creates an admin with permissions', async ({ page }) => {
  const state = newState(SUPER, []);
  await mockApi(page, state);
  await signInUi(page, 'kofi@assistance.test');
  await page.goto('/app/admin/users/new');
  await page.getByLabel('First name').fill('Kwame');
  await page.getByLabel('Last name').fill('Mensah');
  await page.getByLabel('Email').fill('kwame@assistance.test');
  await page.getByRole('main').getByText('Employee', { exact: true }).click();
  await page.getByLabel('Job title').fill('HR officer');
  await page.getByRole('main').getByText('Admin', { exact: true }).click();
  await page.getByLabel('Block, unblock and unlock users').check();
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByRole('heading', { name: 'Kwame Mensah' })).toBeVisible();
  const body = state.calls.find((c) => c.path === '/admin/users' && c.method === 'POST')?.body;
  expect(body).toMatchObject({
    role: 'admin',
    permissions: ['block_users'],
    employee_type: 'employee',
  });
});

test('settings: change values with an effective date', async ({ page }) => {
  const state = newState(SUPER, []);
  state.settings = [
    {
      key: 'checkin_radius_m',
      label: 'Check-in perimeter radius (m)',
      group: 'attendance',
      type: 'int',
      editable: true,
      value: 50,
      default: 50,
      scheduled: [],
    },
    {
      key: 'faceid_required',
      label: 'Face ID verification at check-in',
      group: 'attendance',
      type: 'bool',
      editable: true,
      value: true,
      default: true,
      scheduled: [],
    },
    {
      key: 'timezone',
      label: 'Time zone',
      group: 'system',
      type: 'string',
      editable: false,
      value: 'Africa/Accra',
      default: 'Africa/Accra',
      scheduled: [],
    },
  ];
  await mockApi(page, state);
  await signInUi(page, 'kofi@assistance.test');
  await page.goto('/app/admin/settings');
  await page.getByLabel('Check-in perimeter radius (m)').fill('abc');
  await expect(page.getByText('Enter a whole number.')).toBeVisible();
  await page.getByLabel('Check-in perimeter radius (m)').fill('60');
  await page.getByRole('switch', { name: 'Face ID verification at check-in' }).click();
  await expect(page.getByText('2 unsaved changes')).toBeVisible();
  await page.getByRole('button', { name: 'Schedule for later' }).click();
  await page.getByLabel('Apply from').fill('2026-12-01');
  await page.getByRole('button', { name: 'Schedule' }).click();
  await expect(page.getByText(/Changes scheduled for/)).toBeVisible();
  const put = state.calls.find((c) => c.method === 'PUT' && c.path === '/admin/settings')?.body;
  expect(put).toEqual({
    values: { checkin_radius_m: 60, faceid_required: false },
    effective_from: '2026-12-01',
  });
  await page.getByRole('tab', { name: 'History' }).click();
  await expect(page.getByText('No changes yet')).toBeVisible();
  await page.getByRole('link', { name: 'Security', exact: true }).click();
  await expect(page).toHaveURL(/\/app\/admin\/settings\/security$/);
  await expect(page.getByLabel('Time zone')).toBeDisabled();
  await page.getByRole('tab', { name: 'History' }).click();
  await expect(page.getByText('No changes yet')).toBeVisible();
});

test('notifications: unread count, mark all read', async ({ page }) => {
  const state = newState();
  state.notifications = [
    {
      id: 'a1',
      data: { title: 'Welcome aboard', body: 'Your account is ready.' },
      read_at: null,
      created_at: '2026-11-12T08:00:00Z',
    },
    {
      id: 'a2',
      data: { title: 'Older', body: 'Read already' },
      read_at: '2026-11-11T08:00:00Z',
      created_at: '2026-11-11T08:00:00Z',
    },
  ];
  await mockApi(page, state);
  await signInUi(page);
  await page.goto('/app/notifications');
  await expect(page.getByRole('main').getByText('1 unread', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Mark all as read' }).click();
  await expect(page.getByText('You are all caught up.')).toBeVisible();
});

test('activity log: filter by type and expand an entry', async ({ page }) => {
  const state = newState(SUPER, []);
  state.logs = [
    {
      id: 1,
      created_at: '2026-11-12T08:00:00Z',
      type: 'security',
      level: 'warning',
      event: 'auth.failed',
      description: 'Failed sign-in',
      user: { id: 3, name: 'Ama Mensah', email: 'ama@assistance.test', deleted: false },
      actor: null,
      context: { attempts: 3 },
      ip: '10.0.0.1',
      device_id: 'dev123',
      user_agent: 'Safari',
    },
    {
      id: 2,
      created_at: '2026-11-12T07:00:00Z',
      type: 'action',
      level: 'info',
      event: 'profile.updated',
      description: 'Profile updated',
      user: null,
      actor: null,
      context: null,
      ip: null,
      device_id: null,
      user_agent: null,
    },
  ];
  await mockApi(page, state);
  await signInUi(page, 'kofi@assistance.test');
  await page.goto('/app/admin/logs');
  await page.getByLabel('Type').selectOption('security');
  await expect(page.getByText('Profile updated')).toHaveCount(0);
  await page.getByRole('button', { name: /Failed sign-in/ }).click();
  await expect(page.getByText('10.0.0.1')).toBeVisible();
  expect(state.calls.some((c) => c.path === '/admin/activity-logs' && c.method === 'GET')).toBe(
    true,
  );
});

test('phones: floating bar (no menu button), admin hub; filters open in a sheet', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'iphone', 'Phone layout only');
  const state = newState(SUPER, [pending, makeUser({ id: 3 })]);
  await mockApi(page, state);
  await signInUi(page, 'kofi@assistance.test');
  await expect(page.getByRole('button', { name: 'Open menu' })).toHaveCount(0);
  const bar = page.getByRole('navigation', { name: 'Bottom menu' });
  await expect(bar.getByRole('link')).toHaveText(['Home', 'Notifications', 'Admin']);
  await expect(bar.getByRole('button', { name: 'Sign out' })).toBeVisible();
  await expect(bar.getByRole('link', { name: 'Profile' })).toHaveCount(0);
  await page.getByRole('link', { name: 'Open profile' }).click();
  await expect(page).toHaveURL(/\/app\/profile$/);
  await page.goto('/app/admin/users');
  // Only the search field is on screen; the other filters are behind "Filters".
  await expect(page.getByLabel('Status')).toBeHidden();
  await page.getByRole('button', { name: 'Filters', exact: true }).click();
  await page.getByRole('dialog', { name: 'Filters' }).getByLabel('Status').selectOption('pending');
  await page.getByRole('button', { name: 'Show results' }).click();
  await expect(page.getByRole('button', { name: 'Filters · 1' })).toBeVisible();
});

test('delete account sits in a danger zone and asks for confirmation', async ({ page }) => {
  const state = newState(SUPER, [makeUser({ id: 3 })]);
  await mockApi(page, state);
  await signInUi(page, 'kofi@assistance.test');
  await page.goto('/app/admin/users/3');
  await expect(page.getByText('Danger zone')).toBeVisible();
  await page.getByRole('button', { name: 'Delete account' }).click();
  await expect(page.getByRole('dialog', { name: /Delete Ama Mensah/ })).toBeVisible();
});
