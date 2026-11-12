/**
 * Runs against a real local API (E2E_REAL_API=1, backend on :8000 with MAIL_MAILER=log,
 * QUEUE_CONNECTION=sync, a super admin boss@e2e.test). Codes are read from the mail log.
 */
import { readFileSync, statSync } from 'node:fs';
import { expect, test } from '@playwright/test';

const LOG = process.env.E2E_MAIL_LOG ?? '/home/user/backend_Attendance/storage/logs/laravel.log';
const SUPER_EMAIL = process.env.E2E_SUPER_EMAIL ?? 'boss@e2e.test';

const logSize = () => statSync(LOG).size;
async function codeAfter(offset: number, subject: RegExp): Promise<string> {
  for (let i = 0; i < 40; i++) {
    const text = readFileSync(LOG, 'utf8').slice(offset);
    const at = text.search(subject);
    if (at >= 0) {
      const m = text
        .slice(at)
        .split('\n')
        .map((l) => l.trim())
        .find((l) => /^[A-Za-z0-9]{8,20}$/.test(l));
      if (m) return m;
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error('code not found in mail log');
}

test.describe.configure({ mode: 'serial' });
test.skip(() => test.info().project.name !== 'desktop', 'one run is enough');

test('real API: sign-up, approval by super admin, first sign-in, code change, profile', async ({
  browser,
}) => {
  const email = `new.${Date.now()}@e2e.test`;
  const employee = await browser.newPage();
  await employee.goto('/sign-up');
  await employee.getByLabel('First name').fill('Esi');
  await employee.getByLabel('Last name').fill('Owusu');
  await employee.getByLabel('Work email').fill(email);
  await employee.getByRole('button', { name: 'Continue' }).click();
  await employee.getByText('Employee', { exact: true }).click();
  await employee.getByLabel('Job title').fill('Accountant');
  await employee.getByRole('button', { name: 'Send request' }).click();
  await expect(employee.getByText('Please wait for an administrator to approve it.')).toBeVisible();

  const admin = await browser.newPage();
  await admin.goto('/sign-in/super-admin');
  await admin.getByLabel('Email').fill(SUPER_EMAIL);
  let offset = logSize();
  await admin.getByRole('button', { name: 'Send me a code' }).click();
  const otp = await codeAfter(offset, /Subject: Your sign-in code/);
  await admin.getByLabel('One-time code').fill(otp);
  await admin.getByRole('button', { name: 'Sign in' }).click();
  await expect(admin.getByRole('heading', { name: /Kofi/ })).toBeVisible();
  await admin.goto('/app/admin/requests');
  const row = admin.getByRole('listitem').filter({ hasText: email });
  offset = logSize();
  await row.getByRole('button', { name: 'Approve' }).click();
  await expect(admin.getByText('Esi Owusu approved.', { exact: false })).toBeVisible();
  const code = await codeAfter(offset, /Subject: .*(identification|account is ready|approved)/i);

  await employee.goto('/sign-in');
  await employee.getByLabel('Email').fill(email);
  await employee.getByLabel('Identification code or password').fill(code);
  await employee.getByRole('button', { name: 'Sign in' }).click();
  await expect(employee).toHaveURL(/\/welcome\/code$/);
  // The code typed at sign-in is reused; it is not asked again.
  await expect(employee.getByLabel('Identification code (from the email)')).toHaveCount(0);
  await employee.getByLabel('New password', { exact: true }).fill('Kumasi2026pass');
  await employee.getByLabel('Confirm new password').fill('Kumasi2026pass');
  await employee.getByRole('button', { name: 'Save my password' }).click();
  await expect(employee.getByRole('heading', { name: 'Complete your profile' })).toBeVisible();
  await employee.getByLabel('Phone').fill('+233 24 123 4567');
  await employee.getByRole('button', { name: 'Save and continue' }).click();
  await expect(employee.getByRole('heading', { name: /Esi/ })).toBeVisible();
});
