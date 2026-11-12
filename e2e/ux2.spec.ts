import { expect, test } from '@playwright/test';
import { makeUser, mockApi, newState, signInUi, SUPER, trySignIn } from './mockApi';

const radius = {
  key: 'checkin_radius_m',
  label: 'Check-in perimeter radius (m)',
  group: 'attendance',
  type: 'int',
  editable: true,
  value: 50,
  default: 50,
  scheduled: [],
  min: 10,
  max: 5000,
};

test('settings: bounds checked, leaving with unsaved changes asks first', async ({ page }) => {
  const state = newState(SUPER, []);
  state.settings = [radius];
  await mockApi(page, state);
  await signInUi(page, 'kofi@assistance.test');
  await page.goto('/app/admin/settings');
  const field = page.getByLabel('Check-in perimeter radius (m)');
  await field.fill('-5');
  await expect(page.getByText('Minimum 10.')).toBeVisible();
  await field.fill('60');
  await field.blur();
  await expect(page.getByText('1 unsaved change')).toBeVisible();
  await page.getByRole('link', { name: 'Home' }).first().click();
  await expect(page.getByText('Leave without saving?')).toBeVisible();
  await page.getByRole('button', { name: 'Stay on this page' }).click();
  await expect(page).toHaveURL(/\/app\/admin\/settings$/);
  await expect(field).toHaveValue('60');
});

test('sign-up request notification opens Sign-up requests', async ({ page }) => {
  const state = newState(SUPER, []);
  state.notifications = [
    {
      id: 'n1',
      data: { kind: 'signup_request', title: 'New account request', path: '/admin/users/9' },
      read_at: null,
      created_at: '2026-11-12T09:00:00Z',
    },
  ];
  await mockApi(page, state);
  await signInUi(page, 'kofi@assistance.test');
  await page.goto('/app/notifications');
  await page.getByRole('button', { name: /New account request/ }).click();
  await expect(page).toHaveURL(/\/app\/admin\/requests$/);
});

test('forbidden deep link shows a no-access page', async ({ page }) => {
  const state = newState({ id: 2, role: 'admin', permissions: ['block_users'] }, []);
  await mockApi(page, state);
  await signInUi(page);
  await page.goto('/app/admin/settings');
  await expect(page.getByText('You do not have access to this page')).toBeVisible();
});

test('users list shows the email on phones too', async ({ page }) => {
  const state = newState(SUPER, [
    makeUser({ id: 3, email: 'ama.one@assistance.test' }),
    makeUser({ id: 4, email: 'ama.two@assistance.test' }),
  ]);
  await mockApi(page, state);
  await signInUi(page, 'kofi@assistance.test');
  await page.goto('/app/admin/users');
  await expect(page.getByText('ama.one@assistance.test').locator('visible=true')).toHaveCount(1);
  await expect(page.getByText('ama.two@assistance.test').locator('visible=true')).toHaveCount(1);
});

test('sign-in: last attempt warning and pending-approval hint', async ({ page }) => {
  const state = newState({}, []);
  state.loginReply = {
    status: 401,
    body: { message: 'x', code: 'invalid_credentials', remaining_attempts: 1 },
  };
  await mockApi(page, state);
  await trySignIn(page, 'ama@assistance.test', ' WRONG1 ');
  await expect(
    page.getByText('1 attempt left before sign-in is temporarily blocked.'),
  ).toBeVisible();
  // UX2-24: a known device (remaining attempts sent) does not get the approval hint.
  await expect(page.getByText(/may still be awaiting approval/)).toHaveCount(0);
  const login = state.calls.find((c) => c.path === '/auth/login')?.body as { password: string };
  expect(login.password).toBe('WRONG1');
});
