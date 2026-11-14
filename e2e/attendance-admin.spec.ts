import { expect, test, type Page, type Route } from '@playwright/test';
import { API, makeUser, mockApi, newState, signInUi, SUPER, type MockState } from './mockApi';

const ama = {
  id: 5,
  first_name: 'Ama',
  last_name: 'Mensah',
  job_title: 'Accountant',
  employee_type: 'employee',
};
const yaw = {
  id: 6,
  first_name: 'Yaw',
  last_name: 'Asante',
  job_title: 'IT intern',
  employee_type: 'intern',
};

async function mockAdmin(page: Page, state: MockState) {
  const db = {
    day: [
      {
        user: ama,
        day_status: 'working',
        expected: true,
        attendance: {
          id: 1,
          work_date: '2026-11-12',
          day_status: 'working',
          check_in_type: 'gps',
          check_in_at: '2026-11-12T08:20:00Z',
          is_late: true,
          check_out_at: null,
        },
      },
      { user: yaw, day_status: 'working', expected: true, attendance: null as unknown },
    ],
    missions: [
      {
        id: 9,
        work_date: '2026-11-12',
        check_in_type: 'mission',
        check_in_at: '2026-11-12T08:05:00Z',
        mission_status: 'pending',
        reason: '<img src=x onerror=alert(1)> Client visit',
        user: { id: 5, first_name: 'Ama', last_name: 'Mensah' },
      },
    ],
    devices: [
      {
        id: 3,
        name: 'iPhone – Safari',
        status: 'pending',
        device: { id: 2, name: 'iPhone – Safari' },
        created_at: '2026-11-12T07:00:00Z',
        user: { id: 6, first_name: 'Yaw', last_name: 'Asante' },
        registration: {
          device_id: 2,
          registered_at: '2026-11-12T07:00:00Z',
          ip: '41.66.1.2',
          platform: 'iOS',
          browser: 'Safari',
          user_agent: 'Mozilla/5.0 (iPhone)',
          device_first_seen_at: '2026-11-12T06:58:00Z',
        },
      },
      {
        id: 4,
        name: 'Android – Chrome',
        status: 'approved',
        device: null,
        created_at: '2026-10-01T07:00:00Z',
        user: { id: 5, first_name: 'Ama', last_name: 'Mensah' },
      },
    ],
    holidays: [] as { id: number; date: string; name: string }[],
  };
  await page.route(`${API}/**`, async (route: Route) => {
    const req = route.request();
    const url = new URL(req.url());
    const path = url.pathname.replace(/^\/api/, '');
    const method = req.method();
    if (method === 'OPTIONS') return route.fallback();
    const send = (status: number, json: unknown) =>
      route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify(json),
        headers: { 'Access-Control-Allow-Origin': '*' },
      });
    let body: unknown = null;
    try {
      body = req.postDataJSON();
    } catch {
      body = null;
    }
    const log = () => state.calls.push({ method, path, body });
    const meta = (n: number) => ({ current_page: 1, last_page: 1, total: n });
    if (path === '/admin/attendance/day')
      return send(200, { date: '2026-11-12', server_time: new Date().toISOString(), data: db.day });
    if (path === '/admin/users/6/check-in') {
      log();
      const a = {
        id: 2,
        work_date: '2026-11-12',
        day_status: 'working',
        check_in_type: 'admin_on_behalf',
        check_in_at: '2026-11-12T09:00:00Z',
        check_out_at: null,
      };
      db.day[1].attendance = a;
      return send(201, { data: a });
    }
    if (path === '/admin/attendance/missions') {
      const st = url.searchParams.get('status') ?? 'pending';
      const list = db.missions.filter((m) => m.mission_status === st);
      return send(200, { data: list, meta: meta(list.length) });
    }
    const mm = path.match(/^\/admin\/attendance\/(\d+)\/mission\/(approve|reject)$/);
    if (mm) {
      log();
      const m = db.missions.find((x) => x.id === Number(mm[1]))!;
      m.mission_status = mm[2] === 'approve' ? 'approved' : 'rejected';
      return send(200, { data: m });
    }
    if (path === '/admin/faceid/credentials') {
      const st = url.searchParams.get('status') ?? 'pending';
      const list = db.devices.filter((d) => d.status === st);
      return send(200, { data: list, meta: meta(list.length) });
    }
    const fm = path.match(/^\/admin\/faceid\/credentials\/(\d+)\/(approve|reject|revoke)$/);
    if (fm) {
      log();
      const d = db.devices.find((x) => x.id === Number(fm[1]))!;
      d.status = fm[2] === 'approve' ? 'approved' : 'revoked';
      return send(200, { data: d });
    }
    if (path === '/holidays') return send(200, { data: db.holidays });
    if (path === '/admin/holidays' && method === 'POST') {
      log();
      const b = body as { date: string; name: string };
      db.holidays.push({ id: 1, ...b });
      return send(201, { data: db.holidays[0] });
    }
    if (path === '/admin/leaves') return send(200, { data: [], meta: meta(0) });
    if (path === '/admin/users/6/leaves') {
      log();
      return send(201, { data: { id: 1 } });
    }
    return route.fallback();
  });
}

test('daily attendance: lateness shown, check-in on behalf with a reason', async ({ page }) => {
  const state = newState(SUPER);
  await mockApi(page, state);
  await mockAdmin(page, state);
  await signInUi(page, 'kofi@assistance.test');
  await page.goto('/app/admin/attendance');
  await expect(page.getByText('Ama Mensah')).toBeVisible();
  await expect(page.getByText('Late', { exact: true }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Check in for them' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Check in now' }).click();
  await expect(dialog.getByText(/at least 3 characters/)).toBeVisible();
  await dialog.getByLabel('Reason').fill('Phone broken');
  await dialog.getByRole('button', { name: 'Check in now' }).click();
  await expect(page.getByText('Yaw Asante checked in at', { exact: false })).toBeVisible();
  expect(state.calls.find((c) => c.path === '/admin/users/6/check-in')?.body).toEqual({
    reason: 'Phone broken',
  });
});

test('mission approval shows the reason as plain text', async ({ page }) => {
  const state = newState(SUPER);
  await mockApi(page, state);
  await mockAdmin(page, state);
  await signInUi(page, 'kofi@assistance.test');
  await page.goto('/app/admin/attendance/missions');
  await expect(page.getByText('<img src=x onerror=alert(1)> Client visit')).toBeVisible();
  await page.getByRole('button', { name: 'Approve' }).click();
  await expect(page.getByText('Mission approved.')).toBeVisible();
  await expect(page.getByText('Nothing to review')).toBeVisible();
});

test('Face ID devices: details, approve, and super admin revoke', async ({ page }) => {
  const state = newState(SUPER);
  await mockApi(page, state);
  await mockAdmin(page, state);
  await signInUi(page, 'kofi@assistance.test');
  await page.goto('/app/admin/faceid-devices');
  await expect(page.getByText('Yaw Asante')).toBeVisible();
  await expect(page.getByText('41.66.1.2')).toBeVisible();
  await expect(page.getByText('iOS')).toBeVisible();
  await page.getByRole('button', { name: 'Approve device' }).click();
  await expect(page.getByText('Device approved', { exact: false })).toBeVisible();
  await page.getByRole('tab', { name: 'Approved' }).click();
  await page.getByRole('button', { name: 'Revoke' }).first().click();
  await page.getByRole('dialog').getByRole('button', { name: 'Revoke' }).click();
  await expect(page.getByText('Face ID revoked', { exact: false })).toBeVisible();
  expect(state.calls.some((c) => c.path.endsWith('/revoke'))).toBe(true);
});

test('admin with the Face ID tier approves and rejects but cannot revoke or see other sections', async ({
  page,
}) => {
  const admin = makeUser({
    id: 2,
    role: 'admin',
    permissions: ['approve_faceid_devices'],
    first_name: 'Abena',
  });
  const state = newState(admin);
  await mockApi(page, state);
  await mockAdmin(page, state);
  await signInUi(page);
  await page.goto('/app/admin/faceid-devices');
  await page.getByRole('button', { name: 'Reject' }).click();
  await expect(page.getByText('Request rejected.')).toBeVisible();
  await page.getByRole('tab', { name: 'Approved' }).click();
  await expect(page.getByText('Ama Mensah')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Revoke' })).toHaveCount(0);
  await page.goto('/app/admin/attendance');
  await expect(page.getByText('You do not have access to this page')).toBeVisible();
});

test('leave and holidays', async ({ page }) => {
  const admin = makeUser({
    id: 2,
    role: 'admin',
    permissions: ['manage_leaves'],
    first_name: 'Abena',
  });
  const state = newState(admin);
  await mockApi(page, state);
  await mockAdmin(page, state);
  await signInUi(page);
  await page.goto('/app/admin/leave');
  await page.getByLabel('Employee').selectOption('6');
  await page.getByLabel('First day').fill('2026-12-01');
  await page.getByLabel('Last day').fill('2026-12-05');
  await page.getByRole('button', { name: 'Add leave' }).click();
  await expect(page.getByText('Leave added.')).toBeVisible();
  expect(state.calls.find((c) => c.path === '/admin/users/6/leaves')?.body).toMatchObject({
    start_date: '2026-12-01',
    end_date: '2026-12-05',
  });
  await page.getByLabel('Date', { exact: true }).fill('2026-12-25');
  await page.getByLabel('Name').fill('Christmas Day');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(page.getByText('Christmas Day')).toBeVisible();
});
