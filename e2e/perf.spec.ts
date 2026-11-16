import { expect, test, type Page, type Route } from '@playwright/test';
import { API, mockApi, newState, signInUi } from './mockApi';

/** Delays every API answer (cold server on the free hosting) by `ms` when `slow.on`. */
async function slowApi(page: Page, slow: { on: boolean; ms: number }) {
  await page.route(`${API}/**`, async (route: Route) => {
    if (slow.on) await new Promise((r) => setTimeout(r, slow.ms));
    await route.fallback();
  });
}

test.describe('returning user, slow or waking server', () => {
  test('reopening the app shows today from the device at once, actions wait for the server', async ({
    page,
  }) => {
    const state = newState();
    await mockApi(page, state);
    const slow = { on: false, ms: 6000 };
    await slowApi(page, slow);
    await signInUi(page);
    await expect(page.getByTestId('today-card')).toBeVisible();
    // Let the persisted cache be written (throttled).
    await page.waitForTimeout(1500);

    slow.on = true;
    const started = Date.now();
    await page.reload();
    await expect(page.getByTestId('today-card')).toBeVisible({ timeout: 5000 });
    const shownMs = Date.now() - started;
    test.info().annotations.push({ type: 'today-card-ms', description: String(shownMs) });
    expect(shownMs).toBeLessThan(4000);
    // Restored data: the check-in button is visible but disabled until the server answers.
    const btn = page.getByRole('button', { name: 'Check in at the office' });
    await expect(btn).toBeDisabled();
    await expect(page.getByTestId('today-updating')).toBeVisible();
    // The request is slow: a friendly notice, no error.
    await expect(page.getByTestId('wake-banner')).toBeVisible({ timeout: 6000 });
    await expect(page.getByTestId('wake-banner')).toContainText('Waking up the server');
    await expect(btn).toBeEnabled({ timeout: 15000 });
    await expect(page.getByTestId('wake-banner')).toBeHidden({ timeout: 15000 });
  });

  test('signing out erases the screens kept on the device', async ({ page }) => {
    const state = newState();
    await mockApi(page, state);
    await signInUi(page);
    await expect(page.getByTestId('today-card')).toBeVisible();
    await page.waitForTimeout(1500);
    const read = () =>
      page.evaluate(
        () =>
          new Promise<string | null>((resolve) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const r = (globalThis as any).indexedDB.open('ag');
            r.onsuccess = () => {
              const g = r.result.transaction('kv').objectStore('kv').get('rq.cache');
              g.onsuccess = () => resolve((g.result as string | undefined) ?? null);
              g.onerror = () => resolve(null);
            };
            r.onerror = () => resolve(null);
          }),
      );
    const stored = await read();
    expect(stored).toContain('"attendance","today"');
    expect(stored).not.toContain('session.token');
    expect(stored).not.toMatch(/CODE123456|"token"/);
    await page.goto('/app/profile');
    await page.getByRole('button', { name: 'Sign out of this device' }).click();
    await page.waitForURL(/sign-in/);
    // Nothing of the account remains, even after the throttled cache write.
    await page.waitForTimeout(2000);
    const after = await read();
    expect(after === null || !after.includes('"attendance","today"')).toBe(true);
    expect(after ?? '').not.toContain('Ama');
  });
});
