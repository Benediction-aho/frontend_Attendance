import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { renderAt } from '../../../test/render';
import { api, errorMessage } from '../../../lib/api';
import { employeeDetail } from '../../../lib/attendance';
import { formatDayEnGb } from '../../../lib/format';
import { Input } from '../../../ui/Field';
import { AppPrefixRedirect } from '../../../app/AppPrefixRedirect';
import { WeekPicker } from '../MyAttendancePages';
import { AttemptsPage } from './MissionsPage';

function stub(map: Record<string, { status?: number; body: unknown }>) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      const path = new URL(url, 'http://x').pathname;
      const r = map[path] ?? { body: { data: [] } };
      return new Response(JSON.stringify(r.body), {
        status: r.status ?? 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }),
  );
}

afterEach(() => vi.unstubAllGlobals());

describe('phase 3-4 admin fixes', () => {
  it('tells homonyms apart with job title and email (UX34-04)', () => {
    expect(
      employeeDetail({
        id: 1,
        first_name: 'Ama',
        last_name: 'Mensah',
        job_title: 'Officer',
        email: 'a@x.org',
      }),
    ).toBe('Officer · a@x.org');
    expect(employeeDetail({ id: 1, first_name: 'A', last_name: 'B', job_title: null })).toBe('');
  });

  it('shows dates as en-GB in date fields (UI34-05)', () => {
    expect(formatDayEnGb('2026-11-12')).toBe('12 Nov 2026');
    render(<Input label="Date" type="date" value="2026-11-12" onChange={() => {}} />);
    expect(screen.getByTestId('date-display')).toHaveTextContent('12 Nov 2026');
    expect(screen.getByLabelText('Date')).toHaveValue('2026-11-12');
  });

  it('redirects old /admin links to /app/admin (UX34-05)', async () => {
    const { router } = renderAt(<AppPrefixRedirect />, '/admin/users/43', {
      '/app/admin/users/:id': <p>user page</p>,
    });
    expect(await screen.findByText('user page')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/app/admin/users/43');
  });

  it('lists refused attempts as stacked rows with the employee (UI34-03)', async () => {
    stub({
      '/admin/attendance/attempts': {
        body: {
          data: [
            {
              id: 1,
              user_id: 3,
              user: { id: 3, first_name: 'Ama', last_name: 'Mensah', job_title: 'Officer' },
              work_date: '2026-11-12',
              outcome: 'out_of_perimeter',
              distance_m: 3200,
              accuracy_m: 12,
              created_at: '2026-11-12T07:55:00Z',
            },
          ],
          meta: { total: 1, current_page: 1, last_page: 1 },
        },
      },
    });
    renderAt(<AttemptsPage />, '/');
    const list = await screen.findByTestId('attempts-stacked');
    expect(list).toHaveTextContent('Ama Mensah');
    expect(list).toHaveTextContent('7:55 AM · 3.2 km · ± 12 m');
  });

  it('explains when the schedule limit is reached (UI34-12)', () => {
    render(
      <WeekPicker
        info={{
          working_days: [1, 2, 3, 4, 5],
          max_days_off_per_week: 1,
          max_remote_days_per_week: 1,
        }}
        daysOff={[5]}
        remote={[]}
        onChange={() => {}}
      />,
    );
    expect(screen.getByTestId('limit-hint')).toHaveTextContent('You have chosen your 1 day off.');
  });

  it('shows the server message for an encrypted PDF as is', async () => {
    stub({
      '/x': {
        status: 422,
        body: {
          code: 'pdf_encrypted',
          message: 'This PDF is password-protected. Remove the password and upload it again.',
        },
      },
    });
    const e = await api.post('/x', {}).catch((x: unknown) => x);
    expect(errorMessage(e)).toBe(
      'This PDF is password-protected. Remove the password and upload it again.',
    );
  });

  it('omits a missing distance in refused check-ins (UI34-20)', async () => {
    stub({
      '/admin/attendance/attempts': {
        body: {
          data: [
            {
              id: 2,
              user_id: 3,
              user: { id: 3, first_name: 'Ama', last_name: 'Mensah', job_title: 'Officer' },
              work_date: '2026-11-12',
              outcome: 'low_accuracy',
              distance_m: null,
              accuracy_m: 120,
              created_at: '2026-11-12T08:01:00Z',
            },
          ],
          meta: { total: 1, current_page: 1, last_page: 1 },
        },
      },
    });
    renderAt(<AttemptsPage />, '/');
    const list = await screen.findByTestId('attempts-stacked');
    expect(list).toHaveTextContent('8:01 AM · ± 120 m');
    expect(list.textContent).not.toContain('· –');
  });
});
