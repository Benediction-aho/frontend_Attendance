// UX exploratory helpers (phase 2). Real API on :8000, front on :4173, mail log mailer.
import { chromium, devices } from '@playwright/test';
import { readFileSync, statSync } from 'node:fs';
export const LOG =
  process.env.E2E_MAIL_LOG ?? '/home/user/backend_Attendance/storage/logs/laravel.log';
export const SHOTS = '/home/user/frontend_Attendance/docs/reports/screens/phase-2';
export const BASE = 'http://localhost:4173';
export const logSize = () => statSync(LOG).size;
export async function mailAfter(offset, subject, to) {
  for (let i = 0; i < 40; i++) {
    const t = readFileSync(LOG).subarray(offset).toString('utf8');
    const parts = t
      .split(/(?=From: .*\nTo: )/)
      .filter((p) => subject.test(p) && (!to || p.includes(to)));
    if (parts.length) return parts[parts.length - 1];
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error('mail not found ' + subject);
}
export const codeIn = (mail) =>
  mail
    .split('\n')
    .map((l) => l.trim())
    .find((l) => /^[A-Za-z0-9]{6,20}$/.test(l) && /\d/.test(l));
export const linkIn = (mail) =>
  (mail
    .replace(/=\r?\n/g, '')
    .replace(/=3D/g, '=')
    .match(/https?:\/\/[^\s"<>]+(token|confirm|recover)[^\s"<>]*/) || [])[0];
export async function launch() {
  return chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
}
export const DEV = {
  iphone: devices['iPhone 13'],
  android: { ...devices['Galaxy S9+'], viewport: { width: 360, height: 740 } },
  desktop: devices['Desktop Chrome'],
};
export async function shot(page, name) {
  await page.screenshot({ path: `${SHOTS}/ux-${name}.png`, fullPage: true });
}
export async function superSignIn(page, email = 'boss@e2e.test') {
  await page.goto(BASE + '/sign-in/super-admin');
  await page.getByLabel('Email').fill(email);
  const o = logSize();
  await page.getByRole('button', { name: 'Send me a code' }).click();
  const m = await mailAfter(o, /Subject: Your sign-in code/, email);
  await page.getByLabel('One-time code').fill(codeIn(m));
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL(/\/app/);
}
