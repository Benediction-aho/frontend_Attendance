import { expect, test } from '@playwright/test';

test('placeholder landing renders with logo, title and manifest', async ({ page }) => {
  const messages: string[] = [];
  page.on('console', (m) => messages.push(m.text()));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Assistance Ghana Attendance' })).toBeVisible();
  await expect(page.getByAltText('Assistance Ghana')).toBeVisible();
  await expect(page.locator('link[rel="manifest"]')).toHaveCount(1);
  const html = await page.content();
  expect(html).not.toMatch(/react|vite|tailwind/i);
  expect(messages).toEqual([]);
});

test('unknown routes fall back to the app (SPA)', async ({ page }) => {
  await page.goto('/some/deep/link');
  await expect(page.getByRole('heading', { name: 'Assistance Ghana Attendance' })).toBeVisible();
});
