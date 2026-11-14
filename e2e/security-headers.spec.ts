import { expect, test } from '@playwright/test';
import { mockApi, newState, signInUi, SUPER } from './mockApi';

// The preview server applies the same headers as vercel.json (vite.config.ts).
test('security headers are served and the app runs without CSP violations', async ({ page }) => {
  // Chromium reports every CSP violation as a console error starting with "Refused to".
  const violations: string[] = [];
  page.on('console', (m) => {
    if (/Content Security Policy|Refused to/i.test(m.text())) violations.push(m.text());
  });
  const response = await page.goto('/');
  const h = response!.headers();
  expect(h['content-security-policy']).toContain("frame-ancestors 'none'");
  expect(h['content-security-policy']).toContain("script-src 'self'");
  expect(h['content-security-policy']).not.toContain('unsafe-eval');
  expect(h['x-frame-options']).toBe('DENY');
  expect(h['x-content-type-options']).toBe('nosniff');
  expect(h['referrer-policy']).toBe('strict-origin-when-cross-origin');
  expect(h['permissions-policy']).toContain('publickey-credentials-get=(self)');

  const state = newState(SUPER);
  await mockApi(page, state);
  await signInUi(page, 'kofi@assistance.test');
  for (const path of ['/app', '/app/attendance', '/app/settings']) {
    await page.goto(path);
    await page.waitForLoadState('networkidle');
  }
  expect(violations).toEqual([]);
});
