import { expect, test, type Page } from '@playwright/test';
import {
  activityReport,
  defaultToday,
  mockApi,
  newState,
  signInUi,
  SUPER,
  type MockState,
} from './mockApi';

const SHOTS = '/home/user/apercu/admin-checkin';

/** Admin who checks in (tracks_attendance from GET /me) with a few admin tiers. */
function adminState(o: Record<string, unknown> = {}): MockState {
  const s = newState({
    id: 2,
    role: 'admin',
    first_name: 'Esi',
    last_name: 'Owusu',
    email: 'esi@assistance.test',
    job_title: 'Office manager',
    permissions: ['view_reports', 'view_lateness', 'approve_users'],
    tracks_attendance: true,
    attendance_starts_on: '2026-11-14',
    ...o,
  });
  s.adminDashboard = {
    server_time: new Date().toISOString(),
    work_date: '2026-11-14',
    pending: { sign_up_requests: 2 },
    today: { expected: 8, checked_in: 5, missing: 3, late: 1 },
  };
  return s;
}

async function shot(page: Page, name: string, enabled: boolean) {
  if (!enabled) return;
  for (const w of [390, 360, 320]) {
    await page.setViewportSize({ width: w, height: 844 });
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${SHOTS}/${w}-${name}.png` });
  }
  await page.setViewportSize({ width: 390, height: 844 });
}

test('admin who tracks attendance: Today first, five-item bar, admin area reachable', async ({
  page,
}, testInfo) => {
  const phone = testInfo.project.name === 'iphone';
  const state = adminState();
  await mockApi(page, state);
  await signInUi(page, 'esi@assistance.test');
  // Lands on Today with the check-in.
  await expect(page.getByRole('button', { name: 'Check in at the office' })).toBeVisible();
  await expect(page.getByText('Hello Esi')).toBeVisible();
  if (phone) {
    const bar = page.getByRole('navigation', { name: 'Bottom menu' });
    await expect(bar.getByRole('link')).toHaveText(['Today', 'My work', 'Notifications', 'Admin']);
    await expect(bar.getByRole('button').last()).toHaveText('Sign out');
    for (const w of [320, 360, 390]) {
      await page.setViewportSize({ width: w, height: 760 });
      const items = bar.locator('a, button');
      const n = await items.count();
      expect(n).toBe(5);
      for (let i = 0; i < n; i++) {
        const box = await items.nth(i).boundingBox();
        expect(box!.height).toBeGreaterThanOrEqual(44);
        expect(box!.width).toBeGreaterThanOrEqual(44);
        // The label is not cut (no ellipsis) and stays on one line.
        const label = items.nth(i).locator('span').last();
        const fits = await label.evaluate(
          (el: { scrollWidth: number; clientWidth: number }) =>
            el.scrollWidth <= el.clientWidth + 1,
        );
        expect(fits, `label ${i} at ${w}px`).toBe(true);
      }
      expect(await page.evaluate('document.documentElement.scrollWidth <= window.innerWidth')).toBe(
        true,
      );
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await shot(page, 'today', true);
    await shot(page, 'bar-today', true);
    await bar.getByRole('link', { name: 'My work' }).click();
    await expect(page.getByRole('heading', { name: 'My work' })).toBeVisible();
    await shot(page, 'bar-my-work', true);
    await bar.getByRole('link', { name: 'Notifications' }).click();
    await shot(page, 'bar-notifications', true);
    await bar.getByRole('link', { name: 'Admin' }).click();
  } else {
    await page
      .getByRole('navigation', { name: 'Sidebar' })
      .getByRole('link', { name: 'Dashboard' })
      .click();
  }
  await expect(page).toHaveURL(/\/app\/admin$/);
  await expect(page.getByRole('heading', { name: 'Administration' })).toBeVisible();
  await expect(page.getByTestId('admin-pending')).toBeVisible();
  await expect(page.getByTestId('admin-today')).toBeVisible();
  if (phone) {
    await shot(page, 'bar-admin', true);
    await page
      .getByRole('navigation', { name: 'Bottom menu' })
      .getByRole('button', { name: 'Sign out' })
      .click();
    await expect(page.getByRole('dialog', { name: 'Sign out of this device?' })).toBeVisible();
  }
  // Deep links still work.
  await page.goto('/app/admin/requests');
  await expect(page.getByRole('heading', { name: 'Sign-up requests' })).toBeVisible();
});

test('admin who does not track attendance keeps Home and no check-in', async ({ page }) => {
  const state = adminState({ tracks_attendance: false, attendance_starts_on: null });
  await mockApi(page, state);
  await signInUi(page, 'esi@assistance.test');
  await expect(page.getByTestId('admin-pending')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Check in at the office' })).toHaveCount(0);
  await page.goto('/app/work');
  await expect(page.getByText('You do not have access to this page')).toBeVisible();
});

test('activity report: upload with field errors, list, delete with confirmation', async ({
  page,
}, testInfo) => {
  const phone = testInfo.project.name === 'iphone';
  const state = adminState();
  state.activityReplies = [
    { status: 422, body: { message: 'Password-protected PDF.', code: 'pdf_encrypted' } },
  ];
  await mockApi(page, state);
  // Checked in today: the upload is open.
  await page.route('**/api/attendance/today', (r) =>
    r.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify(
        defaultToday({
          checked_in: true,
          attendance: {
            id: 9,
            work_date: '2026-11-14',
            day_status: 'working',
            check_in_type: 'gps',
            check_in_at: new Date().toISOString(),
            is_late: false,
          },
        }),
      ),
    }),
  );
  await signInUi(page, 'esi@assistance.test');
  await page.goto('/app/reports/daily');
  await expect(page.getByTestId('activity-callout')).toContainText('not the Friday weekly report');
  if (phone) await shot(page, 'my-work-upload-button', true);
  await page.getByRole('button', { name: 'Upload a report' }).click();
  const dlg = page.getByRole('dialog', { name: 'Upload an activity report' });
  await dlg.getByRole('button', { name: 'Send report' }).click();
  await expect(dlg.getByText('Give the report a title.')).toBeVisible();
  await dlg.getByLabel('Title').fill('Visit to the bank');
  await dlg.getByTestId('activity-pdf-input').setInputFiles({
    name: 'visit.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4 test'),
  });
  await expect(dlg.getByText(/up to 10 MB/)).toBeVisible();
  if (phone) await shot(page, 'upload-form', true);
  await dlg.getByRole('button', { name: 'Send report' }).click();
  await expect(dlg.getByTestId('activity-file-error')).toContainText('Password-protected');
  await dlg.getByRole('button', { name: 'Send report' }).click();
  await expect(dlg).toBeHidden();
  await page.getByRole('link', { name: 'See sent reports' }).click();
  await expect(page.getByTestId('activity-reports')).toContainText('Visit to the bank');
  await expect(page.getByTestId('activity-quota')).toContainText('1 of 5 sent today · 4 left');
  await expect(page.getByTestId('delete-until')).toBeVisible();
  await page.getByRole('button', { name: /^Delete report Visit to the bank/ }).click();
  await page
    .getByRole('dialog', { name: 'Delete this activity report?' })
    .getByRole('button', { name: 'Delete' })
    .click();
  await expect(page.getByText('No activity report sent yet.')).toBeVisible();
});

test('super admin: Activity reports tab with Admin badge, report page from the notification path', async ({
  page,
}, testInfo) => {
  const phone = testInfo.project.name === 'iphone';
  const state = newState(SUPER);
  state.activityAdmin = [
    activityReport({
      id: 41,
      user: {
        id: 2,
        first_name: 'Esi',
        last_name: 'Owusu',
        role: 'admin',
        job_title: 'Office manager',
      },
    }),
    activityReport({
      id: 42,
      title: 'Client meeting summary',
      note: null,
      user: {
        id: 3,
        first_name: 'Ama',
        last_name: 'Mensah',
        role: 'employee',
        job_title: 'Accountant',
      },
    }),
  ];
  await mockApi(page, state);
  await signInUi(page, 'kofi@assistance.test');
  await page.goto('/app/admin/reports');
  await page
    .getByRole('navigation', { name: 'Report sections' })
    .getByRole('link', { name: 'Activity reports' })
    .click();
  const list = page.getByTestId('admin-activity-reports');
  await expect(list.locator('li')).toHaveCount(2);
  await expect(list.getByTestId('admin-badge')).toHaveCount(1);
  await expect(list.getByRole('link', { name: /Open PDF/ }).first()).toHaveAttribute(
    'href',
    /signature/,
  );
  if (phone) await shot(page, 'admin-activity-reports', true);
  await page.goto('/app/admin/reports/activity/41');
  await expect(page.getByTestId('activity-report')).toContainText('Esi Owusu');
  await expect(page.getByRole('link', { name: 'Open PDF' })).toBeVisible();
  await page.goto('/app/admin/reports/activity/999');
  await expect(page.getByText('This report is not available')).toBeVisible();
});

test('settings: admins start date can be set and emptied', async ({ page }) => {
  const state = newState(SUPER);
  state.settings = [
    {
      key: 'admin_attendance_starts_on',
      label: 'Admins track attendance like employees from this date',
      group: 'attendance',
      section: 'attendance',
      type: 'date',
      nullable: true,
      super_admin_only: true,
      editable: true,
      value: '2026-11-14',
      default: null,
      scheduled: [],
    },
  ];
  await mockApi(page, state);
  await signInUi(page, 'kofi@assistance.test');
  await page.goto('/app/admin/settings/attendance');
  const f = page.getByTestId('setting-admin_attendance_starts_on');
  await expect(f.getByLabel('Admins check in from')).toHaveValue('2026-11-14');
  await expect(f).toContainText('Leave it empty and admins do not check in');
  await f.getByRole('button', { name: 'Clear the date' }).click();
  await expect(f.getByTestId('date-empty')).toBeVisible();
  await page.getByRole('button', { name: 'Save now' }).click();
  await expect
    .poll(() => state.calls.find((c) => c.method === 'PUT' && c.path === '/admin/settings')?.body)
    .toEqual({ values: { admin_attendance_starts_on: null } });
});

test('320 px: employee bar shows "Notifications" in full; My work tabs all visible', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'iphone', 'Phone layout only');
  await page.setViewportSize({ width: 320, height: 700 });
  const state = newState();
  await mockApi(page, state);
  await signInUi(page);
  const bar = page.getByRole('navigation', { name: 'Bottom menu' });
  const label = bar.getByRole('link', { name: 'Notifications' }).locator('span').last();
  expect(
    await label.evaluate(
      (el: { scrollWidth: number; clientWidth: number }) => el.scrollWidth <= el.clientWidth + 1,
    ),
  ).toBe(true);
  await page.goto('/app/work');
  const tabs = page.getByRole('navigation', { name: 'My work sections' }).getByRole('link');
  await expect(tabs).toHaveCount(4);
  for (let i = 0; i < 4; i++) {
    const b = (await tabs.nth(i).boundingBox())!;
    expect(b.x).toBeGreaterThanOrEqual(0);
    expect(b.x + b.width).toBeLessThanOrEqual(320);
  }
  await page.screenshot({ path: `${SHOTS}/320-employee-my-work-tabs.png` });
});
