import { expect, test } from '@playwright/test';
import { makeUser, mockApi, newState, signInUi, SUPER, trySignIn } from './mockApi';

test('shell: no library names, manifest, no console output, unknown route goes to sign-in', async ({
  page,
}) => {
  const messages: string[] = [];
  page.on('console', (m) => messages.push(m.text()));
  await mockApi(page, newState());
  await page.goto('/some/deep/link');
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  await expect(page.locator('link[rel="manifest"]')).toHaveCount(1);
  expect(await page.content()).not.toMatch(/react|vite|tailwind/i);
  expect(messages).toEqual([]);
});

test('sign-up: two guided steps then the waiting-for-approval page', async ({ page }) => {
  const state = newState();
  await mockApi(page, state);
  await page.goto('/sign-in');
  await page.getByRole('link', { name: 'Request an account' }).click();
  await page.getByLabel('First name').fill('Esi');
  await page.getByLabel('Last name').fill('Owusu');
  await page.getByLabel('Work email').fill('esi@assistance.test');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByText('Intern', { exact: true }).click();
  await page.getByLabel('Job title').fill('Marketing intern');
  await page.getByRole('button', { name: 'Send request' }).click();
  await expect(page.getByRole('heading', { name: 'Thank you, Esi' })).toBeVisible();
  await expect(page.getByText('Please wait for an administrator to approve it.')).toBeVisible();
  const reg = state.calls.find((c) => c.path === '/auth/register');
  expect(reg?.body).toEqual({
    first_name: 'Esi',
    last_name: 'Owusu',
    email: 'esi@assistance.test',
    employee_type: 'intern',
    job_title: 'Marketing intern',
  });
});

test('first sign-in: code, forced password change, profile completion, then home', async ({
  page,
}) => {
  const state = newState({ must_change_password: true });
  await mockApi(page, state);
  await signInUi(page);
  await expect(page).toHaveURL(/\/welcome\/code$/);
  // The code typed at sign-in is not asked again (kept in memory only).
  await expect(page.getByLabel('Identification code (from the email)')).toHaveCount(0);
  // The app cannot be reached before the code is replaced. After a full reload
  // the code is no longer in memory, so the form asks for it.
  await page.goto('/app/profile');
  await expect(page).toHaveURL(/\/welcome\/code$/);
  await page.getByLabel('Identification code (from the email)').fill('CODE123456');
  await expect(page.getByText('Weak:', { exact: false })).toHaveCount(0);
  await page.getByLabel('New password', { exact: true }).fill('abc');
  await expect(page.getByText(/^Weak:/)).toBeVisible();
  await page.getByLabel('New password', { exact: true }).fill('mysecret2026');
  await page.getByLabel('Confirm new password').fill('mysecret2026');
  await page.getByRole('button', { name: 'Save my password' }).click();
  await expect(page.getByRole('heading', { name: 'Complete your profile' })).toBeVisible();
  await page.getByLabel('Phone').fill('+233 24 123 4567');
  await page.getByRole('button', { name: 'Save and continue' }).click();
  // Employees then set up Face ID (needed to check in); it can be done later.
  await expect(page.getByRole('heading', { name: 'Face ID is ready' })).toBeVisible();
  await page.getByRole('button', { name: 'Continue to check-in' }).click();
  await expect(page.getByRole('heading', { name: 'Hello Ama' })).toBeVisible();
  const login = state.calls.find((c) => c.path === '/auth/login')?.body as Record<string, unknown>;
  expect(String(login.device_id)).toMatch(/^[A-Za-z0-9_-]{16,128}$/);
  expect(state.calls.find((c) => c.path === '/me' && c.method === 'PATCH')?.body).toMatchObject({
    phone: '+233 24 123 4567',
  });
});

test('first sign-in without reload sends the remembered code', async ({ page }) => {
  const state = newState({ must_change_password: true });
  await mockApi(page, state);
  await signInUi(page);
  await expect(page).toHaveURL(/\/welcome\/code$/);
  await expect(page.getByLabel('Identification code (from the email)')).toHaveCount(0);
  await page.getByLabel('New password', { exact: true }).fill('mysecret2026');
  await page.getByLabel('Confirm new password').fill('mysecret2026');
  await page.getByRole('button', { name: 'Save my password' }).click();
  await expect(page.getByRole('heading', { name: 'Complete your profile' })).toBeVisible();
  expect(state.calls.find((c) => c.path === '/me/password')?.body).toMatchObject({
    current_password: 'CODE123456',
  });
});

test('session survives a reload; network errors never sign out; logout does', async ({ page }) => {
  const state = newState();
  await mockApi(page, state);
  await signInUi(page);
  await expect(page.getByRole('heading', { name: /Ama/ })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: /Ama/ })).toBeVisible();
  await page.route('http://localhost:8000/api/me', (r) => r.fulfill({ status: 503, body: '{}' }));
  await page.reload();
  await expect(page.getByText('We could not load your account.')).toBeVisible({ timeout: 20_000 });
  await page.unroute('http://localhost:8000/api/me');
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByRole('heading', { name: /Ama/ })).toBeVisible();
  await page.goto('/app/profile');
  await page.getByRole('button', { name: 'Sign out of this device' }).click();
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  await page.goto('/app');
  await expect(page).toHaveURL(/\/sign-in$/);
});

test('a 401 signs out; reauth_limit shows a clear reason', async ({ page }) => {
  const state = newState();
  await mockApi(page, state);
  await signInUi(page);
  await page.goto('/app/profile');
  await page.route('http://localhost:8000/api/me/password', (r) =>
    r.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'x', code: 'reauth_limit' }),
    }),
  );
  await page.getByLabel('Current code or password').fill('wrong1');
  await page.getByLabel('New password', { exact: true }).fill('abcdef12345');
  await page.getByLabel('Confirm new password').fill('abcdef12345');
  await page.getByRole('button', { name: 'Change password' }).click();
  await expect(
    page.getByText(/signed out after too many incorrect password attempts/),
  ).toBeVisible();
});

test('lockout: remaining time shown and generic messages', async ({ page }) => {
  const state = newState();
  state.loginReply = { status: 401, body: { message: 'x', code: 'invalid_credentials' } };
  await mockApi(page, state);
  await trySignIn(page, 'nobody@assistance.test', 'bad');
  await expect(page.getByText('The email or code is incorrect.')).toBeVisible();
  state.loginReply = {
    status: 429,
    body: { message: 'x', code: 'login_blocked', retry_after_seconds: 600 },
  };
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('button', { name: /Try again in (9|10) min/ })).toBeDisabled();
  // UX2-23: the countdown survives a reload in the same tab.
  await page.reload();
  await expect(page.getByRole('button', { name: /Try again in (9|10) min/ })).toBeDisabled();
  await page.evaluate(() => sessionStorage.clear());
  state.loginReply = { status: 423, body: { message: 'x', code: 'account_locked' } };
  await trySignIn(page, 'ama@assistance.test', 'x');
  await expect(page.getByText(/Ask an administrator to unlock your account/)).toBeVisible();
});

test('super admin: email, one-time code, sign in; recovery link page', async ({ page }) => {
  const state = newState(SUPER);
  await mockApi(page, state);
  await page.goto('/sign-in');
  await page.getByRole('link', { name: 'Super admin sign-in' }).click();
  await page.getByLabel('Email').fill('kofi@assistance.test');
  await page.getByRole('button', { name: 'Send me a code' }).click();
  await page.getByLabel('One-time code').fill('12345678');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('heading', { name: /Kofi/ })).toBeVisible();
  const login = state.calls.find((c) => c.path === '/auth/login')?.body as Record<string, unknown>;
  expect(login.password).toBe('12345678');

  const s2 = newState();
  const p2 = await page
    .context()
    .browser()!
    .newPage({ baseURL: new URL(page.url()).origin });
  await mockApi(p2, s2);
  await p2.goto('/recover?token=abc123');
  await expect(p2.getByText('Access restored.', { exact: false })).toBeVisible();
  expect(p2.url()).not.toContain('token=');
  await p2.close();
});

test('profile: edit details, photo with preview, email change', async ({ page }) => {
  const state = newState({}, [makeUser()]);
  await mockApi(page, state);
  await signInUi(page);
  await page.goto('/app/profile');
  await page.getByLabel('WhatsApp').fill('+233 20 000 0000');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByText('Profile saved.')).toBeVisible();
  await page.getByLabel('Choose a profile photo').setInputFiles({
    name: 'me.png',
    mimeType: 'image/png',
    buffer: Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64',
    ),
  });
  await expect(page.getByRole('dialog', { name: 'New profile photo' })).toBeVisible();
  await page.getByRole('button', { name: 'Use this photo' }).click();
  await expect(page.getByText('Profile photo updated.')).toBeVisible();
  await page.getByLabel('New email').fill('ama.new@assistance.test');
  await page.getByLabel('Current password').fill('mysecret2026');
  await page.getByRole('button', { name: 'Send confirmation link' }).click();
  await expect(page.getByText(/confirmation link is on its way/)).toBeVisible();
});
