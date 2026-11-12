import type { Page, Route } from '@playwright/test';

export const API = 'http://localhost:8000/api';

type U = Record<string, unknown> & { id: number; status: string; role: string };

export function makeUser(o: Partial<U> = {}): U {
  const first = (o.first_name as string) ?? 'Ama';
  const last = (o.last_name as string) ?? 'Mensah';
  return {
    id: 1,
    first_name: first,
    last_name: last,
    full_name: `${first} ${last}`,
    email: 'ama@assistance.test',
    role: 'employee',
    employee_type: 'employee',
    job_title: 'Accountant',
    status: 'active',
    photo_url: null,
    phone: null,
    whatsapp: null,
    birth_date: null,
    address: null,
    must_change_password: false,
    permissions: [],
    created_at: '2026-11-10T09:00:00Z',
    ...o,
  };
}

export interface MockState {
  me: U;
  users: U[];
  calls: { method: string; path: string; body: unknown }[];
  loginReply?: { status: number; body: unknown };
  settings?: unknown[];
  notifications?: Record<string, unknown>[];
  logs?: Record<string, unknown>[];
}

const page1 = (data: unknown[], extra: object = {}) => ({
  data,
  meta: { current_page: 1, last_page: 1, total: data.length, ...extra },
});

/** Intercepts every API call with an in-memory fake that follows the OpenAPI contract. */
export async function mockApi(page: Page, state: MockState) {
  await page.route(`${API}/**`, async (route: Route) => {
    const req = route.request();
    const url = new URL(req.url());
    const path = url.pathname.replace(/^\/api/, '');
    const method = req.method();
    let body: unknown;
    try {
      body = req.postDataJSON();
    } catch {
      body = null;
    }
    state.calls.push({ method, path, body });
    const send = (status: number, json: unknown) =>
      route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify(json),
        headers: { 'Access-Control-Allow-Origin': '*' },
      });
    if (method === 'OPTIONS')
      return route.fulfill({
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': '*',
          'Access-Control-Allow-Methods': '*',
        },
      });

    if (path === '/auth/register') return send(202, { message: 'ok' });
    if (path === '/auth/recovery/confirm') return send(200, { message: 'ok' });
    if (path === '/auth/super-admin/code' || path === '/auth/recovery')
      return send(202, { message: 'ok' });
    if (path === '/auth/login') {
      if (state.loginReply) return send(state.loginReply.status, state.loginReply.body);
      return send(200, {
        token: 'test-token',
        token_type: 'Bearer',
        must_change_password: state.me.must_change_password,
        user: state.me,
      });
    }
    if (path === '/auth/logout') return send(200, {});
    if (path === '/me' && method === 'GET') return send(200, { data: state.me });
    if (path === '/me' && method === 'PATCH') {
      state.me = { ...state.me, ...(body as object) };
      return send(200, { data: state.me });
    }
    if (path === '/me/password') {
      state.me = { ...state.me, must_change_password: false };
      return send(200, { message: 'ok', data: state.me });
    }
    if (path === '/me/email') return send(202, { message: 'ok' });
    if (path === '/me/photo') {
      state.me = {
        ...state.me,
        photo_url:
          method === 'DELETE'
            ? null
            : 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==',
      };
      return send(200, { data: state.me });
    }
    if (path === '/notifications') {
      const all = state.notifications ?? [];
      const unread = all.filter((n) => !n.read_at);
      const list = url.searchParams.get('unread') ? unread : all;
      return send(200, page1(list, { unread_count: unread.length }));
    }
    if (path === '/notifications/read-all') {
      state.notifications = (state.notifications ?? []).map((n) => ({
        ...n,
        read_at: '2026-11-12T10:00:00Z',
      }));
      return send(200, {});
    }
    const nr = path.match(/^\/notifications\/(.+)\/read$/);
    if (nr) {
      state.notifications = (state.notifications ?? []).map((n) =>
        n.id === nr[1] ? { ...n, read_at: '2026-11-12T10:00:00Z' } : n,
      );
      return send(200, {});
    }
    if (path === '/admin/permissions')
      return send(200, {
        data: [
          { key: 'approve_users', label: 'Approve accounts and send identification codes' },
          { key: 'block_users', label: 'Block, unblock and unlock users' },
          { key: 'view_logs', label: 'View activity logs' },
        ],
      });
    if (path === '/admin/users' && method === 'GET') {
      let list = state.users.filter((u) => u.status !== 'deleted');
      const st = url.searchParams.get('status');
      const q = url.searchParams.get('q');
      if (st) list = list.filter((u) => u.status === st);
      if (q) list = list.filter((u) => String(u.full_name).toLowerCase().includes(q.toLowerCase()));
      return send(200, page1(list));
    }
    if (path === '/admin/users' && method === 'POST') {
      const u = makeUser({ ...(body as object), id: 100 + state.users.length, status: 'active' });
      u.full_name = `${u.first_name} ${u.last_name}`;
      state.users.push(u);
      return send(201, { message: 'ok', data: u });
    }
    const um = path.match(/^\/admin\/users\/(\d+)(?:\/(\w+))?$/);
    if (um) {
      const u = state.users.find((x) => x.id === Number(um[1]));
      if (!u) return send(404, { message: 'Not found.' });
      const act = um[2];
      if (!act && method === 'GET') return send(200, { data: u });
      if (!act && method === 'DELETE') {
        u.status = 'deleted';
        return send(200, {});
      }
      const next: Record<string, string> = {
        approve: 'active',
        block: 'blocked',
        unblock: 'active',
        unlock: 'active',
      };
      if (act === 'reject') {
        state.users = state.users.filter((x) => x !== u);
        return send(200, {});
      }
      if (act && next[act]) u.status = next[act];
      if (act === 'permissions') u.permissions = (body as { permissions: string[] }).permissions;
      if (act === 'role') u.role = (body as { role: string }).role;
      return send(200, { message: 'ok', data: u });
    }
    if (path === '/admin/settings' && method === 'GET')
      return send(200, { data: state.settings ?? [] });
    if (path === '/admin/settings' && method === 'PUT') {
      const values = (body as { values: Record<string, unknown> }).values;
      state.settings = (state.settings ?? []).map((s) => {
        const ss = s as { key: string };
        return ss.key in values ? { ...ss, value: values[ss.key] } : s;
      });
      return send(200, { data: state.settings });
    }
    if (path === '/admin/settings/history') return send(200, page1([]));
    if (path === '/admin/activity-logs') {
      let l = state.logs ?? [];
      const t = url.searchParams.get('type');
      if (t) l = l.filter((x) => x.type === t);
      return send(200, page1(l));
    }
    if (path === '/client-errors') return send(202, {});
    // Defaults so employee pages load in tests that do not exercise attendance.
    if (path === '/attendance/today') return send(200, defaultToday());
    if (path === '/me/work-schedule')
      return send(200, {
        selected: true,
        locked: true,
        max_days_off_per_week: 2,
        max_remote_days_per_week: 2,
        working_days: [1, 2, 3, 4, 5],
        current: { days_off: [], remote_days: [] },
        upcoming: [],
      });
    if (path === '/me/faceid') return send(200, { state: 'ready', data: [] });
    if (path === '/push/public-key') return send(200, { public_key: null });
    return send(404, { message: 'Not found.' });
  });
}

export function defaultToday(o: Record<string, unknown> = {}) {
  const now = Date.now();
  return {
    server_time: new Date(now).toISOString(),
    server_timestamp_ms: now,
    timezone: 'Africa/Accra',
    work_date: '2026-11-12',
    day_status: 'working',
    expected: true,
    holiday_name: null,
    checked_in: false,
    checked_out: false,
    attendance: null,
    available_check_ins: ['gps', 'mission'],
    rules: {
      radius_m: 50,
      max_accuracy_m: 50,
      late_after: '08:10',
      end_of_day: '17:00',
      early_checkout_reason_required: true,
      faceid_required: true,
    },
    faceid_state: 'ready',
    ...o,
  };
}

export function newState(me: Partial<U> = {}, users: U[] = []): MockState {
  return { me: makeUser(me), users, calls: [] };
}

export const SUPER = {
  id: 1,
  role: 'super_admin',
  first_name: 'Kofi',
  last_name: 'Boateng',
  email: 'kofi@assistance.test',
  job_title: 'Director',
};

/** Signs in through the UI (token goes to IndexedDB like on a real device). */
export async function signInUi(page: Page, email = 'ama@assistance.test', code = 'CODE123456') {
  await page.goto('/sign-in');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Identification code or password').fill(code);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/sign-in'));
  // The token is written to IndexedDB asynchronously: wait for it before any reload.
  await page.waitForFunction(
    () =>
      new Promise<boolean>((resolve) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const r = (globalThis as any).indexedDB.open('ag');
        r.onerror = () => resolve(false);
        r.onsuccess = () => {
          try {
            const g = r.result.transaction('kv').objectStore('kv').get('session.token');
            g.onsuccess = () => resolve(Boolean(g.result));
            g.onerror = () => resolve(false);
          } catch {
            resolve(false);
          }
        };
      }),
  );
}

/** Submits the sign-in form without waiting for success (error cases). */
export async function trySignIn(page: Page, email: string, code: string) {
  await page.goto('/sign-in');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Identification code or password').fill(code);
  await page.getByRole('button', { name: 'Sign in' }).click();
}
