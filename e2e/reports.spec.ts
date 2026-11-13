import { expect, test, type Page, type Route } from '@playwright/test';
import {
  API,
  defaultToday,
  makeUser,
  mockApi,
  newState,
  signInUi,
  SUPER,
  type MockState,
} from './mockApi';

/** Phase 5 part of the fake API (registered after mockApi, so it is matched first). */
interface Rep {
  checkedIn: boolean;
  tasks: Record<string, unknown>[];
  clients: Record<string, unknown>[];
  submission: Record<string, unknown>;
  uploadReplies: { status: number; body: unknown }[];
}

const version = (o: Record<string, unknown> = {}) => ({
  id: 31,
  week_start: '2026-11-09',
  window_date: '2026-11-13',
  version: 1,
  is_current: true,
  file_name: 'report.pdf',
  size_bytes: 120_000,
  submitted_at: '2026-11-13T16:20:00Z',
  is_late: false,
  forwarded_at: null,
  file_url: 'http://localhost:8000/api/files/31?signature=tmp',
  ...o,
});

function openWindow() {
  const now = Date.now();
  return {
    can_submit: true,
    week_start: '2026-11-09',
    window_date: '2026-11-13',
    opens_at: new Date(now - 10 * 60_000).toISOString(),
    closes_at: new Date(now + 50 * 60_000).toISOString(),
    deadline: new Date(now + 50 * 60_000).toISOString(),
    is_late_now: false,
    expected: true,
    max_size_mb: 10,
    current: null,
    versions: [],
  };
}

const ama = { id: 1, first_name: 'Ama', last_name: 'Mensah', job_title: 'Accountant' };
const yaw = { id: 6, first_name: 'Yaw', last_name: 'Asante', job_title: 'Officer' };

async function mockReports(page: Page, state: MockState, rep: Rep) {
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
    const gate = () =>
      rep.checkedIn ? null : send(403, { code: 'checkin_required', message: 'Check in first.' });

    if (path === '/attendance/today')
      return send(200, {
        ...defaultToday({ checked_in: rep.checkedIn }),
        server_timestamp_ms: Date.now(),
      });
    if (path === '/me/tasks' && method === 'GET')
      return send(200, { work_date: '2026-11-12', data: rep.tasks });
    if (path === '/me/tasks' && method === 'POST') {
      log();
      const g = gate();
      if (g) return g;
      const b = body as { title: string; done: boolean };
      const t = {
        id: rep.tasks.length + 1,
        work_date: '2026-11-12',
        title: b.title,
        status: b.done ? 'done' : 'planned',
        completed_at: b.done ? new Date().toISOString() : null,
      };
      rep.tasks.push(t);
      return send(201, { data: t });
    }
    const tm = path.match(/^\/me\/tasks\/(\d+)$/);
    if (tm) {
      log();
      const i = rep.tasks.findIndex((t) => t.id === Number(tm[1]));
      if (method === 'DELETE') {
        rep.tasks.splice(i, 1);
        return route.fulfill({ status: 204, headers: { 'Access-Control-Allow-Origin': '*' } });
      }
      const b = body as { title?: string; done?: boolean };
      rep.tasks[i] = {
        ...rep.tasks[i],
        ...(b.title ? { title: b.title } : {}),
        ...(b.done !== undefined
          ? {
              status: b.done ? 'done' : 'planned',
              completed_at: b.done ? new Date().toISOString() : null,
            }
          : {}),
      };
      return send(200, { data: rep.tasks[i] });
    }
    if (path === '/clients/services')
      return send(200, {
        data: [{ service: 'Residence Permit', service_key: 'residence permit' }],
      });
    if (path === '/me/clients' && method === 'GET') {
      const qty = rep.clients.reduce((n, c) => n + Number(c.quantity), 0);
      return send(200, {
        work_date: '2026-11-12',
        data: rep.clients,
        services: rep.clients.length
          ? [{ service: 'Residence Permit', service_key: 'residence permit', quantity: qty }]
          : [],
      });
    }
    if (path === '/me/clients' && method === 'POST') {
      log();
      const g = gate();
      if (g) return g;
      const c = {
        id: rep.clients.length + 1,
        work_date: '2026-11-12',
        service_key: 'x',
        ...(body as object),
      };
      rep.clients.push(c);
      return send(201, { data: c });
    }
    if (path === '/me/reports/daily')
      return send(200, {
        data: {
          work_date: '2026-11-12',
          tasks: rep.tasks,
          tasks_planned: rep.tasks.length,
          tasks_done: rep.tasks.filter((t) => t.status === 'done').length,
          clients: rep.clients,
          clients_count: rep.clients.length,
          services: [],
          generated_at: null,
        },
      });
    if (path === '/me/reports/weekly')
      return send(200, {
        data: {
          week_start: '2026-11-09',
          week_end: '2026-11-13',
          days: [],
          tasks_planned: 0,
          tasks_done: 0,
          clients_count: rep.clients.length,
          clients: rep.clients.map((c) => ({ ...c, work_date: '2026-11-12' })),
          services: [],
        },
      });
    if (path === '/me/reports/weekly/submission' && method === 'GET')
      return send(200, { data: rep.submission });
    if (path === '/me/reports/weekly/submission' && method === 'POST') {
      state.calls.push({ method, path, body: null });
      const r = rep.uploadReplies.shift();
      if (r) return send(r.status, r.body);
      const v = version();
      rep.submission = { ...rep.submission, current: v, versions: [v] };
      return send(201, { data: v });
    }

    // Admin views.
    if (path === '/admin/reports/daily')
      return send(200, {
        work_date: '2026-11-12',
        data: [
          {
            user: ama,
            day_status: 'working',
            generated_at: null,
            tasks_planned: 2,
            tasks_done: 1,
            clients_count: 1,
            services: [{ service: 'Visa', service_key: 'visa', quantity: 1 }],
            tasks: [
              {
                id: 1,
                title: 'Call embassy',
                status: 'done',
                completed_at: '2026-11-12T10:00:00Z',
              },
            ],
          },
        ],
      });
    if (path === '/admin/reports/weekly')
      return send(200, {
        week_start: '2026-11-09',
        window_date: '2026-11-13',
        opens_at: '2026-11-13T16:00:00Z',
        closes_at: '2026-11-13T17:00:00Z',
        expected_count: 2,
        received_count: 1,
        data: [
          { user: ama, expected: true, submission: version({ is_late: true }) },
          { user: yaw, expected: true, submission: null },
        ],
        missing: [yaw],
      });
    if (path === '/admin/reports/weekly/submissions/31') {
      const canClients = state.me.role === 'super_admin';
      return send(200, {
        data: {
          ...version(),
          user: ama,
          versions: [version()],
          week: {
            clients_count: 1,
            services: [{ service: 'Visa', service_key: 'visa', quantity: 1 }],
            ...(canClients
              ? {
                  clients: [
                    { work_date: '2026-11-12', name: 'Kwame Owusu', service: 'Visa', quantity: 1 },
                  ],
                }
              : {}),
          },
        },
      });
    }
    if (/^\/admin\/users\/\d+\/reports\/weekly$/.test(path))
      return send(200, {
        user: ama,
        data: {
          week_start: '2026-11-09',
          week_end: '2026-11-13',
          days: [
            {
              work_date: '2026-11-09',
              tasks_planned: 2,
              tasks_done: 2,
              clients_count: 1,
              services: [],
            },
          ],
          tasks_planned: 2,
          tasks_done: 2,
          clients_count: 1,
          services: [{ service: 'Visa', service_key: 'visa', quantity: 1 }],
        },
      });
    return route.fallback();
  });
}

const newRep = (o: Partial<Rep> = {}): Rep => ({
  checkedIn: true,
  tasks: [],
  clients: [],
  submission: openWindow(),
  uploadReplies: [],
  ...o,
});

test('employee plans tasks, ticks one, records a client and sees the daily report', async ({
  page,
}) => {
  const state = newState();
  const rep = newRep();
  await mockApi(page, state);
  await mockReports(page, state, rep);
  await signInUi(page);
  await page.goto('/app/work');
  await page.getByLabel('New task').fill('Call embassy');
  await page.getByRole('button', { name: 'Plan task' }).click();
  await expect(page.getByText('Task planned.')).toBeVisible();
  await page.getByLabel('New task').fill('Send invoices');
  await page.getByRole('button', { name: 'Add as done' }).click();
  const box = page.getByRole('checkbox', { name: /Call embassy/ });
  await box.click();
  await expect(box).toBeChecked();
  await expect(page.getByText('2 of 2 done')).toBeVisible();

  await page.getByLabel('Client name').fill('Kwame Owusu');
  await page.getByLabel(/^Service/).fill('res');
  await page.getByRole('button', { name: 'Residence Permit' }).click();
  await page.getByLabel('Quantity').fill('2');
  await page.getByRole('button', { name: 'Add client' }).click();
  await expect(page.getByTestId('clients').getByText('Kwame Owusu', { exact: true })).toBeVisible();
  expect(state.calls.find((c) => c.path === '/me/clients')?.body).toEqual({
    name: 'Kwame Owusu',
    service: 'Residence Permit',
    quantity: 2,
  });

  await page.getByRole('link', { name: 'Daily report' }).click();
  await expect(page.getByText('2 / 2')).toBeVisible();
  await expect(
    page.getByTestId('report-clients').getByText('Kwame Owusu', { exact: true }),
  ).toBeVisible();
});

test('before the check-in, work writes are locked', async ({ page }) => {
  const state = newState();
  await mockApi(page, state);
  await mockReports(page, state, newRep({ checkedIn: false }));
  await signInUi(page);
  await page.goto('/app/work');
  await expect(page.getByText('Check in first')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Plan task' })).toBeDisabled();
});

test('weekly PDF: countdown, refusal message, then upload and version listed', async ({ page }) => {
  const state = newState();
  const rep = newRep({
    uploadReplies: [
      {
        status: 422,
        body: {
          code: 'pdf_encrypted',
          message:
            'Password-protected PDFs are not accepted. Please export the report without a password.',
        },
      },
    ],
  });
  await mockApi(page, state);
  await mockReports(page, state, rep);
  await signInUi(page);
  await page.goto('/app/reports/weekly');
  await expect(page.getByText('Your weekly report is due')).toBeVisible();
  await expect(page.getByText(/Closes in \d+ min/)).toBeVisible();
  const pdf = { name: 'week.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\n') };
  await page.getByTestId('pdf-input').setInputFiles(pdf);
  await page.getByRole('button', { name: 'Send report' }).click();
  await expect(
    page.getByText('Password-protected PDFs are not accepted.', { exact: false }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Send report' }).click();
  await expect(page.getByText('Report sent')).toBeVisible();
  await expect(page.getByTestId('versions').getByText(/^Version 1/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Replace the PDF' })).toBeVisible();
});

test('super admin: daily details, weekly N of M with missing names, submission with clients', async ({
  page,
}) => {
  const state = newState(SUPER);
  await mockApi(page, state);
  await mockReports(page, state, newRep());
  await signInUi(page, 'kofi@assistance.test');
  await page.goto('/app/admin/reports');
  await page.getByRole('button', { name: /Details/ }).click();
  await expect(page.getByText('Call embassy')).toBeVisible();
  await page.getByRole('link', { name: 'Weekly reports' }).click();
  await expect(page.getByText('1 of 2')).toBeVisible();
  await expect(page.getByTestId('missing').getByText('Yaw Asante', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: /Open report/ }).click();
  await expect(page.getByRole('heading', { name: 'Ama Mensah' })).toBeVisible();
  await expect(page.getByText('Kwame Owusu')).toBeVisible();
  await expect(page.getByRole('link', { name: /Open PDF/ })).toHaveAttribute(
    'href',
    /signature=tmp/,
  );
});

test('weekly-recipient admin: no daily tab, no client names when not returned', async ({
  page,
}) => {
  const admin = makeUser({
    id: 2,
    role: 'admin',
    permissions: ['receive_weekly_reports'],
    first_name: 'Abena',
  });
  const state = newState(admin);
  await mockApi(page, state);
  await mockReports(page, state, newRep());
  await signInUi(page);
  await page.goto('/app/admin/reports');
  await expect(page).toHaveURL(/\/app\/admin\/reports\/weekly$/);
  await expect(page.getByRole('link', { name: 'Daily reports' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: /Week summary/ })).toHaveCount(0);
  await page.getByRole('link', { name: /Open report/ }).click();
  await expect(page.getByText('Visa').first()).toBeVisible();
  await expect(page.getByText('Kwame Owusu')).toHaveCount(0);
});

const LONG = 'X'.repeat(160);

test('360 px: long unbroken task/client text wraps, no horizontal overflow; Options sheet on phones', async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 740 });
  const state = newState();
  const rep = newRep({
    tasks: [{ id: 1, work_date: '2026-11-12', title: LONG, status: 'planned', completed_at: null }],
    clients: [
      {
        id: 1,
        work_date: '2026-11-12',
        name: LONG,
        service: `https://ex.test/${LONG}`,
        quantity: 1,
        service_key: 'x',
      },
    ],
  });
  await mockApi(page, state);
  await mockReports(page, state, rep);
  await signInUi(page);
  const noOverflow = async () =>
    expect(await page.evaluate('document.documentElement.scrollWidth <= window.innerWidth')).toBe(
      true,
    );
  await page.goto('/app/work');
  await expect(page.getByTestId('tasks')).toBeVisible();
  await expect(page.getByTestId('clients')).toBeVisible();
  await noOverflow();
  await expect(page.getByRole('button', { name: /^Delete/ })).toHaveCount(0);
  await page.getByRole('button', { name: /Options for task/ }).click();
  await expect(page.getByTestId('row-options')).toBeVisible();
  await page.getByRole('button', { name: 'Delete task' }).click();
  await expect(page.getByText('Delete this task?')).toBeVisible();
  await expect(page.getByTestId('row-options')).toHaveCount(0);
  await page.getByRole('button', { name: 'Cancel' }).click();
  await page.goto('/app/reports/daily');
  await expect(page.getByTestId('report-tasks')).toBeVisible();
  await noOverflow();
  await page.goto('/app/reports/weekly');
  await expect(page.getByTestId('weekly-clients')).toBeVisible();
  await noOverflow();
});

test('quantity 0 is refused with a clear message', async ({ page }) => {
  const state = newState();
  await mockApi(page, state);
  await mockReports(page, state, newRep());
  await signInUi(page);
  await page.goto('/app/work');
  await page.getByLabel('Client name').fill('Kofi');
  await page.getByLabel(/^Service/).fill('Visa');
  await page.getByLabel('Quantity').fill('0');
  await page.getByRole('button', { name: 'Add client' }).click();
  await expect(page.getByText('Quantity must be at least 1.')).toBeVisible();
  expect(state.calls.find((c) => c.path === '/me/clients')).toBeUndefined();
});

test('offline upload: clear message, sent automatically when back online', async ({
  page,
  context,
}) => {
  const state = newState();
  await mockApi(page, state);
  await mockReports(page, state, newRep());
  await signInUi(page);
  await page.goto('/app/reports/weekly');
  await page.getByTestId('pdf-input').setInputFiles({
    name: 'w.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4\n'),
  });
  await context.setOffline(true);
  await page.getByRole('button', { name: 'Send report' }).click();
  await expect(page.getByText(/You are offline\. Your report was not sent yet/)).toBeVisible();
  await context.setOffline(false);
  await expect(page.getByText(/Report received \(version 1\)/)).toBeVisible();
  await expect(page.getByText('Report sent')).toBeVisible();
});

test('admin: missing list with job title; week summary from daily goes back to daily', async ({
  page,
}) => {
  const state = newState(SUPER);
  await mockApi(page, state);
  await mockReports(page, state, newRep());
  await signInUi(page, 'kofi@assistance.test');
  await page.goto('/app/admin/reports');
  await expect(page.getByText(/1 of 1 employee recorded/)).toBeVisible();
  await page.getByRole('button', { name: /Details/ }).click();
  await page.getByRole('link', { name: /Week summary/ }).click();
  await expect(page.getByRole('link', { name: 'Back to daily reports' })).toBeVisible();
  // Filled state (UI5-15): the mock follows the contract path /admin/users/{id}/reports/weekly.
  await expect(page.getByTestId('week-days')).toContainText('Mon');
  await expect(page.getByText('2 / 2').first()).toBeVisible();
  await page.goto('/app/admin/reports/weekly');
  await expect(page.getByTestId('missing').getByText('Officer')).toBeVisible();
  // UI5-13: a missing employee is listed once, with the week summary link in "Not received".
  await expect(page.getByTestId('weekly-rows')).not.toContainText('Missing');
  await page
    .getByTestId('missing')
    .getByRole('link', { name: /Week summary/ })
    .click();
  await expect(page).toHaveURL(/\/app\/admin\/reports\/users\/\d+\/weekly\?date=2026-11-09/);
});
