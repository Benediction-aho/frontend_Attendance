import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { renderAt } from '../../test/render';
import { ApiError } from '../../lib/api';
import {
  countdown,
  formatSize,
  hasGrace,
  pdfFileHint,
  uploadErrorMessage,
  windowPhase,
  writeErrorMessage,
  type SubmissionStatus,
} from '../../lib/reports';
import { submissionState, SubmissionCard } from './ReportPages';
import { WorkPage } from './WorkPage';
import { WeeklySummaryView } from './parts';

const err = (status: number, body: Record<string, unknown>) =>
  new ApiError(
    'client',
    status,
    String(body.message ?? 'The request could not be completed.'),
    body,
  );

const status = (o: Partial<SubmissionStatus> = {}): SubmissionStatus => ({
  can_submit: true,
  week_start: '2026-11-09',
  window_date: '2026-11-13',
  opens_at: '2026-11-13T16:00:00Z',
  closes_at: '2026-11-13T17:00:00Z',
  deadline: '2026-11-13T17:00:00Z',
  is_late_now: false,
  expected: true,
  max_size_mb: 10,
  current: null,
  versions: [],
  ...o,
});

type Handler = (path: string, init?: RequestInit) => { status?: number; body: unknown };
function stubApi(handler: Handler) {
  const fn = vi.fn(async (url: string, init?: RequestInit) => {
    const path = new URL(url, 'http://x').pathname;
    const r = handler(path, init);
    return new Response(r.status === 204 ? null : JSON.stringify(r.body), {
      status: r.status ?? 200,
      headers: { 'Content-Type': 'application/json' },
    });
  });
  vi.stubGlobal('fetch', fn);
  return fn;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('report helpers', () => {
  it('formats sizes and countdowns', () => {
    expect(formatSize(350 * 1024)).toBe('350 KB');
    expect(formatSize(1.5 * 1024 * 1024)).toBe('1.5 MB');
    const now = new Date('2026-11-13T15:00:00Z');
    expect(countdown('2026-11-13T16:00:00Z', now)).toBe('1 h 00 min');
    expect(countdown('2026-11-13T15:02:05Z', now)).toBe('2 min 05 s');
    expect(countdown('2026-11-13T14:00:00Z', now)).toBe('0 s');
  });

  it('places now in the window returned by the API', () => {
    const s = status();
    expect(windowPhase(s, new Date('2026-11-13T15:59:59Z'))).toBe('before');
    expect(windowPhase(s, new Date('2026-11-13T16:00:00Z'))).toBe('open');
    expect(windowPhase(s, new Date('2026-11-13T17:00:00Z'))).toBe('after');
    expect(hasGrace(s)).toBe(false);
    expect(hasGrace(status({ deadline: '2026-11-16T17:00:00Z' }))).toBe(true);
  });

  it('gives client-side file hints', () => {
    expect(pdfFileHint({ name: 'r.pdf', size: 0, type: 'application/pdf' }, 10).block).toMatch(
      /empty/,
    );
    expect(
      pdfFileHint({ name: 'r.pdf', size: 11 * 1024 * 1024, type: 'application/pdf' }, 10).block,
    ).toMatch(/maximum is 10 MB/);
    expect(pdfFileHint({ name: 'r.docx', size: 10, type: 'x' }, 10).warn).toMatch(/PDF/);
    expect(pdfFileHint({ name: 'r.pdf', size: 10, type: 'application/pdf' }, 10)).toEqual({});
  });

  it('has a clear message for every upload code', () => {
    expect(uploadErrorMessage(err(413, {}), 10)).toMatch(/10 MB/);
    for (const code of [
      'invalid_pdf',
      'pdf_encrypted',
      'pdf_active_content',
      'too_many_versions',
      'checkin_required',
      'invalid_characters',
    ])
      expect(uploadErrorMessage(err(422, { code }), 10).length).toBeGreaterThan(10);
    // Server message shown as-is.
    expect(
      uploadErrorMessage(
        err(422, {
          code: 'pdf_encrypted',
          message:
            'Password-protected PDFs are not accepted. Please export the report without a password.',
        }),
        10,
      ),
    ).toBe(
      'Password-protected PDFs are not accepted. Please export the report without a password.',
    );
    expect(
      uploadErrorMessage(
        err(422, { code: 'window_not_open', opens_at: '2026-11-13T16:00:00Z' }),
        10,
      ),
    ).toMatch(/opens on Friday 13 Nov at 16:00/);
    expect(writeErrorMessage(err(422, { code: 'invalid_characters' }))).toMatch(/not allowed/);
  });

  it('describes the weekly PDF state from server data only', () => {
    const before = new Date('2026-11-13T15:00:00Z');
    expect(submissionState(status({ can_submit: false }), before).title).toBe('Not open yet');
    expect(submissionState(status({ can_submit: false }), before).text).toMatch(
      /Opens in 1 h 00 min/,
    );
    expect(submissionState(status(), new Date('2026-11-13T16:30:00Z')).text).toMatch(
      /Closes in 30 min 00 s/,
    );
    expect(submissionState(status(), new Date('2026-11-13T17:30:00Z')).title).toBe(
      'Deadline passed',
    );
    expect(
      submissionState(
        status({ deadline: '2026-11-16T17:00:00Z' }),
        new Date('2026-11-13T17:30:00Z'),
      ).title,
    ).toMatch(/absent/);
    expect(submissionState(status({ expected: false }), before).title).toBe('No report expected');
  });
});

describe('weekly summary', () => {
  const week = {
    week_start: '2026-11-09',
    week_end: '2026-11-13',
    days: [
      { work_date: '2026-11-09', tasks_planned: 3, tasks_done: 2, clients_count: 1, services: [] },
    ],
    tasks_planned: 3,
    tasks_done: 2,
    clients_count: 1,
    services: [{ service: 'Residence Permit', service_key: 'residence permit', quantity: 2 }],
  };
  it('shows client names only when returned, as plain text', () => {
    const { unmount } = renderAt(<WeeklySummaryView week={week} />);
    expect(screen.queryByTestId('weekly-clients')).toBeNull();
    expect(screen.getByText('Residence Permit')).toBeTruthy();
    unmount();
    renderAt(
      <WeeklySummaryView
        week={{
          ...week,
          clients: [
            { work_date: '2026-11-09', name: '<b>Kwame</b>', service: 'Visa', quantity: 2 },
          ],
        }}
      />,
    );
    expect(screen.getByText('<b>Kwame</b>')).toBeTruthy();
  });
});

describe('work page', () => {
  const today = (checked_in: boolean) => ({
    server_time: '2026-11-13T09:00:00Z',
    server_timestamp_ms: Date.parse('2026-11-13T09:00:00Z'),
    timezone: 'Africa/Accra',
    work_date: '2026-11-13',
    day_status: 'working',
    expected: true,
    holiday_name: null,
    checked_in,
    checked_out: false,
    attendance: null,
    available_check_ins: [],
    rules: {},
  });

  it('plans a task, ticks it and adds a client with a suggested service', async () => {
    let tasks: Record<string, unknown>[] = [];
    const fetchMock = stubApi((path, init) => {
      const method = init?.method ?? 'GET';
      if (path.endsWith('/attendance/today')) return { body: today(true) };
      if (path.endsWith('/me/tasks') && method === 'POST') {
        const b = JSON.parse(String(init?.body));
        const t = {
          id: 1,
          title: b.title,
          status: b.done ? 'done' : 'planned',
          completed_at: null,
        };
        tasks = [t];
        return { status: 201, body: { data: t } };
      }
      if (path.endsWith('/me/tasks/1')) {
        tasks = [{ ...tasks[0], status: 'done', completed_at: '2026-11-13T10:00:00Z' }];
        return { body: { data: tasks[0] } };
      }
      if (path.endsWith('/me/tasks')) return { body: { work_date: '2026-11-13', data: tasks } };
      if (path.endsWith('/clients/services'))
        return {
          body: { data: [{ service: 'Residence Permit', service_key: 'residence permit' }] },
        };
      if (path.endsWith('/me/clients') && method === 'POST')
        return { status: 201, body: { data: { id: 5 } } };
      if (path.endsWith('/me/clients'))
        return { body: { work_date: '2026-11-13', data: [], services: [] } };
      return { status: 404, body: {} };
    });
    renderAt(<WorkPage />);
    fireEvent.change(await screen.findByLabelText('New task'), {
      target: { value: 'Call embassy' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Plan task' }));
    const box = await screen.findByRole('checkbox', { name: /Call embassy/ });
    fireEvent.click(box);
    await waitFor(() => expect(screen.getByText(/Done at/)).toBeTruthy());

    fireEvent.change(screen.getByLabelText('Client name'), { target: { value: 'Kofi' } });
    const service = screen.getByLabelText(/^Service/);
    fireEvent.focus(service);
    fireEvent.change(service, { target: { value: 'res' } });
    fireEvent.click(
      await screen.findByRole('button', { name: 'Residence Permit' }, { timeout: 2000 }),
    );
    fireEvent.change(screen.getByLabelText('Quantity'), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add client' }));
    await waitFor(() => {
      const post = fetchMock.mock.calls.find(
        (c) => String(c[0]).endsWith('/me/clients') && c[1]?.method === 'POST',
      );
      expect(JSON.parse(String(post?.[1]?.body))).toEqual({
        name: 'Kofi',
        service: 'Residence Permit',
        quantity: 2,
      });
    });
    // Nothing time-related is sent: the server sets the work date and completion time.
    const patch = fetchMock.mock.calls.find((c) => String(c[0]).endsWith('/me/tasks/1'));
    expect(JSON.parse(String(patch?.[1]?.body))).toEqual({ done: true });
  });

  it('locks writes before the check-in', async () => {
    stubApi((path) => {
      if (path.endsWith('/attendance/today')) return { body: today(false) };
      if (path.endsWith('/me/tasks')) return { body: { work_date: '2026-11-13', data: [] } };
      if (path.endsWith('/me/clients'))
        return { body: { work_date: '2026-11-13', data: [], services: [] } };
      return { status: 404, body: {} };
    });
    renderAt(<WorkPage />);
    expect(await screen.findByText('Check in first')).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Plan task' }) as HTMLButtonElement).disabled).toBe(
      true,
    );
    expect((screen.getByLabelText('Client name') as HTMLInputElement).disabled).toBe(true);
  });
});

describe('weekly PDF upload', () => {
  it('blocks an oversized file and shows the server message on refusal', async () => {
    stubApi((path, init) => {
      if (path.endsWith('/me/reports/weekly/submission') && init?.method === 'POST')
        return {
          status: 422,
          body: { code: 'pdf_active_content', message: 'This PDF contains active content.' },
        };
      if (path.endsWith('/me/reports/weekly/submission')) return { body: { data: status() } };
      return { status: 404, body: {} };
    });
    renderAt(<SubmissionCard />);
    const input = (await screen.findByTestId('pdf-input')) as HTMLInputElement;
    const big = new File(['x'], 'big.pdf', { type: 'application/pdf' });
    Object.defineProperty(big, 'size', { value: 11 * 1024 * 1024 });
    fireEvent.change(input, { target: { files: [big] } });
    expect(await screen.findByText(/The maximum is 10 MB/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Send report' })).toBeNull();

    fireEvent.change(input, {
      target: { files: [new File(['%PDF-1.4'], 'week.pdf', { type: 'application/pdf' })] },
    });
    fireEvent.click(await screen.findByRole('button', { name: 'Send report' }));
    expect(await screen.findByText('This PDF contains active content.')).toBeTruthy();
  });

  it('lists versions with temporary links and the late flag', async () => {
    const v = {
      id: 3,
      week_start: '2026-11-09',
      window_date: '2026-11-13',
      version: 2,
      is_current: true,
      file_name: 'r.pdf',
      size_bytes: 2048,
      submitted_at: '2026-11-13T17:10:00Z',
      is_late: true,
      forwarded_at: null,
      file_url: 'https://api.test/files/3?signature=abc',
    };
    stubApi(() => ({ body: { data: status({ current: v, versions: [v] }) } }));
    renderAt(<SubmissionCard />);
    expect(await screen.findByText('Report sent')).toBeTruthy();
    expect(screen.getByText('Late')).toBeTruthy();
    expect(screen.getByRole('link', { name: /Open PDF/ }).getAttribute('href')).toBe(v.file_url);
    expect(screen.getByRole('button', { name: 'Replace the PDF' })).toBeTruthy();
  });
});
