import { expect, test, type BrowserContext, type Page, type Route } from '@playwright/test';
import {
  API,
  defaultToday,
  makeUser,
  mockApi,
  newState,
  signInUi,
  type MockState,
} from './mockApi';

/** Attendance part of the fake API (registered after mockApi, so it is matched first). */
interface Att {
  today: Record<string, unknown>;
  faceState: string;
  intentReplies: { status: number; body: unknown }[];
  checkoutReplies: { status: number; body: unknown }[];
  schedule: Record<string, unknown>;
  history: Record<string, unknown>[];
}

const attendance = (o: Record<string, unknown> = {}) => ({
  id: 11,
  work_date: '2026-11-12',
  day_status: 'working',
  check_in_type: 'gps',
  check_in_at: '2026-11-12T08:02:00Z',
  check_in_distance_m: 12,
  faceid_verified: true,
  reason: null,
  mission_status: null,
  check_out_at: null,
  checkout_forgotten: false,
  ...o,
});

function b64url(bytes: number[]) {
  return Buffer.from(bytes).toString('base64url');
}

async function mockAttendance(page: Page, state: MockState, att: Att) {
  await page.route(`${API}/**`, async (route: Route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname.replace(/^\/api/, '');
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

    if (path === '/attendance/today') {
      log();
      return send(200, {
        ...att.today,
        faceid_state: att.faceState,
        server_timestamp_ms: Date.now(),
      });
    }
    if (path === '/me/faceid') return send(200, { state: att.faceState, data: [] });
    if (path === '/me/faceid/register/options') {
      log();
      return send(201, {
        challenge_id: 'c-reg',
        expires_at: new Date(Date.now() + 120_000).toISOString(),
        public_key: {
          rp: { id: 'localhost', name: 'Attendance' },
          user: {
            id: b64url([1, 2, 3, 4]),
            name: 'ama@assistance.test',
            displayName: 'Ama Mensah',
          },
          challenge: b64url([9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9]),
          pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            residentKey: 'required',
            userVerification: 'required',
          },
          attestation: 'none',
          timeout: 60000,
        },
      });
    }
    if (path === '/me/faceid/register') {
      log();
      att.faceState = 'ready';
      return send(201, { data: { id: 1, status: 'approved' }, state: 'ready' });
    }
    if (path === '/attendance/check-in/intent') {
      log();
      const r = att.intentReplies.shift();
      if (r) return send(r.status, r.body);
      return send(201, {
        intent_id: 'i-1',
        type: (body as { type: string }).type,
        expires_at: new Date(Date.now() + 120_000).toISOString(),
        distance_m: 12,
        faceid_required: true,
        faceid_options: {
          challenge_id: 'c-1',
          public_key: {
            challenge: b64url([7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7]),
            rpId: 'localhost',
            allowCredentials: [],
            userVerification: 'required',
            timeout: 60000,
          },
        },
      });
    }
    if (path === '/attendance/check-in/confirm') {
      log();
      const type = state.calls.filter((c) => c.path === '/attendance/check-in/intent').at(-1)
        ?.body as { type: string; reason?: string };
      const a = attendance({
        check_in_type: type.type,
        reason: type.reason ?? null,
        mission_status: type.type === 'mission' ? 'pending' : null,
      });
      att.today = { ...att.today, checked_in: true, attendance: a, available_check_ins: [] };
      return send(201, { data: a, created: true });
    }
    if (path === '/attendance/check-out') {
      log();
      const r = att.checkoutReplies.shift();
      if (r) return send(r.status, r.body);
      const a = {
        ...(att.today.attendance as object),
        check_out_at: '2026-11-12T15:30:00Z',
        check_out_type: 'manual',
        check_out_distance_m: 3200,
        check_out_at_office: false,
        check_out_position_available: true,
        early_leave: true,
        early_leave_reason: (body as { reason?: string }).reason ?? null,
      };
      att.today = { ...att.today, checked_out: true, attendance: a };
      return send(200, { data: a });
    }
    if (path === '/me/work-schedule' && method === 'GET') return send(200, att.schedule);
    if (path === '/me/work-schedule' && method === 'POST') {
      log();
      const b = body as { days_off: number[]; remote_days: number[] };
      att.schedule = {
        ...att.schedule,
        selected: true,
        locked: true,
        upcoming: [{ ...b, effective_from: '2026-11-13' }],
      };
      return send(201, att.schedule);
    }
    if (path === '/me/leaves') return send(200, { data: [] });
    if (path === '/holidays')
      return send(200, { data: [{ id: 1, date: '2026-12-25', name: 'Christmas Day' }] });
    if (path === '/attendance/history')
      return send(200, {
        data: att.history,
        meta: { current_page: 1, last_page: 1, total: att.history.length },
      });
    return route.fallback();
  });
}

function newAtt(o: Partial<Att> = {}): Att {
  return {
    today: defaultToday(),
    faceState: 'ready',
    intentReplies: [],
    checkoutReplies: [],
    schedule: {
      selected: true,
      locked: true,
      max_days_off_per_week: 2,
      max_remote_days_per_week: 2,
      working_days: [1, 2, 3, 4, 5],
      current: { days_off: [3], remote_days: [5] },
      upcoming: [],
    },
    history: [],
    ...o,
  };
}

/** Virtual platform authenticator with Face ID always succeeding (Chromium DevTools protocol). */
async function addFaceId(page: Page) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('WebAuthn.enable');
  const { authenticatorId } = await cdp.send('WebAuthn.addVirtualAuthenticator', {
    options: {
      protocol: 'ctap2',
      transport: 'internal',
      hasResidentKey: true,
      hasUserVerification: true,
      isUserVerified: true,
      automaticPresenceSimulation: true,
    },
  });
  return { cdp, authenticatorId };
}

async function atOffice(context: BrowserContext, accuracy = 10) {
  await context.grantPermissions(['geolocation']);
  await context.setGeolocation({ latitude: 5.6037, longitude: -0.187, accuracy });
}

const employee = { id: 5, first_name: 'Ama', role: 'employee' };

test('first sign-in registers Face ID, then GPS check-in with accuracy retry and Face ID', async ({
  page,
  context,
}) => {
  const state = newState(employee);
  const att = newAtt({
    faceState: 'not_registered',
    intentReplies: [
      {
        status: 422,
        body: { code: 'low_accuracy', message: 'x', accuracy_m: 80, max_accuracy_m: 50 },
      },
    ],
  });
  await mockApi(page, state);
  await mockAttendance(page, state, att);
  await atOffice(context);
  await signInUi(page);
  await addFaceId(page);

  await expect(page.getByTestId('server-clock')).toBeVisible();
  await page.getByRole('button', { name: 'Set up Face ID' }).click();
  await expect(page.getByRole('button', { name: 'Check in at the office' })).toBeVisible();
  const reg = state.calls.find((c) => c.path === '/me/faceid/register')?.body as {
    credential: { response: { attestationObject: string } };
    name: string;
  };
  expect(reg.credential.response.attestationObject).toBeTruthy();
  expect(reg.name.length).toBeGreaterThan(0);

  await page.getByRole('button', { name: 'Check in at the office' }).click();
  await expect(page.getByText('You are checked in')).toBeVisible();
  await expect(page.getByText('12 m from the office', { exact: false })).toBeVisible();

  const intents = state.calls.filter((c) => c.path === '/attendance/check-in/intent');
  expect(intents).toHaveLength(2); // low accuracy refused once, retried automatically
  const ib = intents[1].body as Record<string, unknown>;
  expect(ib.type).toBe('gps');
  expect(typeof ib.latitude).toBe('number');
  expect(typeof ib.accuracy).toBe('number');
  // No time or date is ever sent by the client.
  expect(JSON.stringify(intents.map((i) => i.body))).not.toMatch(/time|date/i);
  const confirm = state.calls.find((c) => c.path === '/attendance/check-in/confirm')?.body as {
    intent_id: string;
    assertion: { response: { signature: string } };
  };
  expect(confirm.intent_id).toBe('i-1');
  expect(confirm.assertion.response.signature).toBeTruthy();
});

test('out of the perimeter shows the distance, then a mission check-in waits for approval', async ({
  page,
  context,
}) => {
  const state = newState(employee);
  const att = newAtt({
    intentReplies: [
      {
        status: 422,
        body: { code: 'out_of_perimeter', message: 'x', distance_m: 3240, radius_m: 50 },
      },
    ],
  });
  await mockApi(page, state);
  await mockAttendance(page, state, att);
  await atOffice(context);
  await signInUi(page);
  await addFaceId(page);
  // A passkey must exist for the assertion: register one through the virtual authenticator.
  att.faceState = 'not_registered';
  await page.reload();
  await page.getByRole('button', { name: 'Set up Face ID' }).click();

  await page.getByRole('button', { name: 'Check in at the office' }).click();
  await expect(page.getByText('You are not at the office')).toBeVisible();
  await expect(
    page.getByText(/You are 3\.2 km from the office; check-in is allowed within 50 m/),
  ).toBeVisible();

  await page.getByRole('button', { name: /Mission check-in/ }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Continue to Face ID' }).click();
  await expect(dialog.getByText(/at least 3 characters/)).toBeVisible();
  await dialog.getByLabel('Reason').fill('<script>alert(1)</script> client visit in Tema');
  await dialog.getByRole('button', { name: 'Continue to Face ID' }).click();
  await expect(page.getByText('Mission: waiting for approval')).toBeVisible();
  // Free text is displayed as plain text.
  await expect(page.getByText('<script>alert(1)</script> client visit in Tema')).toBeVisible();
  const mission = state.calls.filter((c) => c.path === '/attendance/check-in/intent').at(-1)
    ?.body as Record<string, unknown>;
  expect(mission.type).toBe('mission');
});

test('remote day: one-tap remote check-in, then early check-out asks for a reason and shows the distance', async ({
  page,
  context,
}) => {
  const state = newState(employee);
  const att = newAtt({
    today: defaultToday({
      day_status: 'remote',
      available_check_ins: ['gps', 'mission', 'remote'],
      rules: { ...defaultToday().rules, end_of_day: '00:00' },
    }),
    checkoutReplies: [
      { status: 422, body: { code: 'reason_required', message: 'Reason required.' } },
    ],
  });
  await mockApi(page, state);
  await mockAttendance(page, state, att);
  await atOffice(context);
  await signInUi(page);
  await addFaceId(page);
  att.faceState = 'not_registered';
  await page.reload();
  await page.getByRole('button', { name: 'Set up Face ID' }).click();

  await page.getByRole('button', { name: 'Check in remotely' }).click();
  await expect(page.getByText('You are checked in')).toBeVisible();
  const remote = state.calls.find((c) => c.path === '/attendance/check-in/intent')?.body as Record<
    string,
    unknown
  >;
  expect(remote).toEqual({ type: 'remote' });

  await page.getByRole('button', { name: 'Check out' }).click();
  const dialog = page.getByRole('dialog');
  // The server decides: its 422 reason_required reveals the reason field.
  await expect(dialog.getByLabel('Reason for leaving early')).toHaveCount(0);
  await dialog.getByRole('button', { name: 'Check out now' }).click();
  await expect(dialog.getByLabel('Reason for leaving early')).toBeVisible();
  await dialog.getByLabel('Reason for leaving early').fill('Doctor appointment');
  await dialog.getByRole('button', { name: 'Check out now' }).click();
  await expect(page.getByText(/3\.2 km from the office/).first()).toBeVisible();
  await expect(page.getByText('Your day is complete')).toBeVisible();
  const co = state.calls.filter((c) => c.path === '/attendance/check-out').at(-1)?.body as Record<
    string,
    unknown
  >;
  expect(co.reason).toBe('Doctor appointment');
  expect(typeof co.latitude).toBe('number');
});

test('clear messages: location blocked, offline, Face ID waiting for approval', async ({
  page,
  context,
}) => {
  const state = newState(employee);
  const att = newAtt();
  await mockApi(page, state);
  await mockAttendance(page, state, att);
  await signInUi(page);
  await context.clearPermissions();
  await page.getByRole('button', { name: 'Check in at the office' }).click();
  await expect(page.getByText('Location needed')).toBeVisible();
  await expect(page.getByText(/Location access is blocked/)).toBeVisible();

  await context.setOffline(true);
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByText('You are offline')).toBeVisible();
  await expect(page.getByText(/the time comes from the server/)).toBeVisible();
  await context.setOffline(false);

  att.faceState = 'pending_approval';
  await page.reload();
  await expect(page.getByText('Waiting for approval')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Check in at the office' })).toHaveCount(0);
});

test('work schedule: chosen once within the limits, then read-only', async ({ page }) => {
  const state = newState(employee);
  const att = newAtt({
    schedule: {
      selected: false,
      locked: false,
      max_days_off_per_week: 1,
      max_remote_days_per_week: 1,
      working_days: [1, 2, 3, 4, 5],
      current: null,
      upcoming: [],
    },
  });
  await mockApi(page, state);
  await mockAttendance(page, state, att);
  await signInUi(page);
  await page.getByRole('link', { name: 'Choose my days' }).click();
  await page.getByLabel('Wednesday: Day off').check({ force: true });
  await expect(page.getByLabel('Thursday: Day off')).toBeDisabled();
  await page.getByLabel('Friday: Remote').check({ force: true });
  await page.getByRole('button', { name: 'Save my days' }).click();
  await expect(page.getByRole('dialog').getByText('Wednesday')).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('They apply from tomorrow', { exact: false })).toBeVisible();
  const saved = state.calls.find((c) => c.path === '/me/work-schedule' && c.method === 'POST');
  expect(saved?.body).toEqual({ days_off: [3], remote_days: [5] });
  await page.goto('/app/attendance/schedule');
  await expect(
    page.getByText('Only an administrator can change them', { exact: false }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save my days' })).toHaveCount(0);
});

test('history shows lateness only when returned and "check-out forgotten"', async ({ page }) => {
  const state = newState(employee);
  const att = newAtt({
    history: [
      attendance({
        id: 1,
        work_date: '2026-11-11',
        checkout_forgotten: true,
        check_out_type: 'auto_midnight',
        check_out_at: '2026-11-12T00:00:00Z',
      }),
      attendance({
        id: 2,
        work_date: '2026-11-10',
        check_out_at: '2026-11-10T17:10:00Z',
        check_out_at_office: true,
      }),
    ],
  });
  await mockApi(page, state);
  await mockAttendance(page, state, att);
  await signInUi(page);
  await page.goto('/app/attendance/history');
  await expect(page.getByText('Check-out forgotten')).toBeVisible();
  await expect(page.getByText('Closed automatically at midnight')).toBeVisible();
  await expect(page.getByText('At the office').first()).toBeVisible();
  await expect(page.getByText('Late', { exact: true })).toHaveCount(0);
});

test('403 checkin_required sends the employee to the check-in screen', async ({ page }) => {
  const state = newState(employee);
  await mockApi(page, state);
  await mockAttendance(page, state, newAtt());
  await page.route(`${API}/notifications**`, (route) =>
    route.request().method() === 'OPTIONS'
      ? route.fallback()
      : route.fulfill({
          status: 403,
          contentType: 'application/json',
          headers: { 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({ code: 'checkin_required', message: 'Please check in.' }),
        }),
  );
  await signInUi(page);
  await page.goto('/app/notifications');
  await expect(page).toHaveURL(/\/app$/);
  await expect(page.getByText('Please check in first', { exact: false }).first()).toBeVisible();
});

test('in-app browser (WhatsApp) shows how to open Safari', async ({ browser }) => {
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 WhatsApp/24.1.0',
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  await mockApi(page, newState(employee));
  await page.goto('/sign-in');
  await expect(page.getByText(/You opened this page inside WhatsApp/)).toBeVisible();
  await expect(page.getByText(/Open in Safari/).first()).toBeVisible();
  await context.close();
});

test('install guide for iPhone and Android', async ({ page }) => {
  await mockApi(page, newState(employee));
  await signInUi(page);
  await page.goto('/app/install');
  await page.getByText('iPhone', { exact: true }).click();
  await expect(page.getByText(/Tap the Share button/)).toBeVisible();
  await expect(page.getByText('Scroll down and tap "Add to Home Screen".')).toBeVisible();
  await page.getByText('Android', { exact: true }).click();
  await expect(page.getByText(/Tap "Install app"/)).toBeVisible();
});

test('staff accounts do not see the employee check-in screen', async ({ page }) => {
  const admin = makeUser({
    id: 2,
    role: 'admin',
    permissions: ['view_lateness'],
    first_name: 'Abena',
  });
  const state = newState(admin);
  await mockApi(page, state);
  await signInUi(page);
  await expect(page.getByRole('button', { name: 'Check in at the office' })).toHaveCount(0);
  expect(state.calls.some((c) => c.path === '/attendance/today')).toBe(false);
});
