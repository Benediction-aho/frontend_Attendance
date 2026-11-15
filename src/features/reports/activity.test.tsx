import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { renderAt } from '../../test/render';
import { ApiError } from '../../lib/api';
import { activityDeleteError, activityUploadErrors } from '../../lib/reports';
import { navFor } from '../../app/AppLayout';
import { tracksAttendance } from '../../lib/permissions';
import { parseInput, toInput, displayValue } from '../../lib/settings';
import type { User } from '../../lib/types';
import { ActivityReportsPage, quotaLine } from './ActivityReports';

const err = (status: number, body: Record<string, unknown>) =>
  new ApiError(
    'client',
    status,
    String(body.message ?? 'The request could not be completed.'),
    body,
  );
const user = (o: Partial<User>) => ({ id: 1, role: 'employee', permissions: [], ...o }) as User;

afterEach(() => vi.unstubAllGlobals());

describe('tracks_attendance drives the employee features', () => {
  it('uses the server flag, falls back to the role', () => {
    expect(tracksAttendance(user({ role: 'admin', tracks_attendance: true }))).toBe(true);
    expect(tracksAttendance(user({ role: 'employee', tracks_attendance: false }))).toBe(false);
    expect(tracksAttendance(user({ role: 'admin' }))).toBe(false);
    expect(tracksAttendance(user({}))).toBe(true);
  });
  it('admin who tracks: Today, My work, Notifications, Admin (+ Sign out)', () => {
    const u = user({ role: 'admin', tracks_attendance: true, permissions: ['view_reports'] });
    expect(navFor(u).mobile.map((i) => i.label)).toEqual([
      'Today',
      'My work',
      'Notifications',
      'Admin',
    ]);
    expect(navFor(u).admin[0]?.label).toBe('Dashboard');
  });
  it('admin who does not track keeps Home', () => {
    const u = user({ role: 'admin', tracks_attendance: false, permissions: ['view_reports'] });
    expect(navFor(u).mobile.map((i) => i.label)).toEqual(['Home', 'Notifications', 'Admin']);
  });
});

describe('activity report errors', () => {
  it('maps server codes to fields', () => {
    expect(activityUploadErrors(err(422, { code: 'invalid_pdf' }), 10).file).toMatch(/PDF/);
    expect(activityUploadErrors(err(422, { code: 'pdf_encrypted' }), 10).file).toMatch(/Password/);
    expect(activityUploadErrors(err(422, { code: 'pdf_active_content' }), 10).file).toMatch(
      /scripts/,
    );
    expect(
      activityUploadErrors(err(422, { code: 'too_many_activity_reports', limit: 5 }), 10).form,
    ).toMatch(/limit of 5/);
    expect(activityUploadErrors(err(403, { code: 'checkin_required' }), 10).form).toMatch(
      /check in/,
    );
    expect(activityUploadErrors(err(413, {}), 10).file).toMatch(/10 MB/);
    expect(
      activityUploadErrors(
        err(422, { message: 'x', errors: { title: ['The title cannot contain a link.'] } }),
        10,
      ).title,
    ).toMatch(/link/);
    expect(activityDeleteError(err(422, { code: 'delete_window_closed' }))).toMatch(
      /no longer be deleted/,
    );
  });
  it('quota line', () => {
    expect(
      quotaLine({
        per_day: 5,
        sent_today: 2,
        remaining_today: 3,
        delete_minutes: 30,
        max_size_mb: 10,
      }),
    ).toBe('2 of 5 sent today · 3 left');
  });
});

describe('date settings', () => {
  it('parses, empties to null and displays', () => {
    expect(parseInput('2026-12-01', 'date', { nullable: true })).toEqual({
      ok: true,
      value: '2026-12-01',
    });
    expect(parseInput('', 'date', { nullable: true })).toEqual({ ok: true, value: null });
    expect(parseInput('', 'date', {}).ok).toBe(false);
    expect(toInput(null, 'date')).toBe('');
    expect(displayValue('2026-12-01')).toBe('1 Dec 2026');
  });
});

describe('Activity reports page', () => {
  it('lists reports, shows quota and deletes with confirmation', async () => {
    let rows = [
      {
        id: 7,
        title: 'Visit to immigration',
        note: 'All good',
        work_date: '2026-11-14',
        file_name: 'a.pdf',
        size_bytes: 2048,
        submitted_at: '2026-11-14T10:00:00Z',
        file_url: 'http://x/f',
        can_delete: true,
        delete_until: '2099-01-01T00:00:00Z',
      },
    ];
    const calls: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init?: RequestInit) => {
        const path = new URL(url, 'http://x').pathname;
        calls.push(`${init?.method ?? 'GET'} ${path}`);
        if (path === '/me/reports/activity/7') {
          rows = [];
          return new Response(null, { status: 204 });
        }
        const body =
          path === '/attendance/today'
            ? { expected: true, checked_in: true, rules: {}, available_check_ins: [] }
            : {
                data: rows,
                meta: { current_page: 1, last_page: 1, total: rows.length },
                limits: {
                  per_day: 5,
                  sent_today: 1,
                  remaining_today: 4,
                  delete_minutes: 30,
                  max_size_mb: 10,
                },
              };
        return new Response(JSON.stringify(body), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }),
    );
    renderAt(<ActivityReportsPage />, '/');
    expect(await screen.findByText('Visit to immigration')).toBeInTheDocument();
    expect(screen.getByTestId('activity-quota')).toHaveTextContent('1 of 5 sent today · 4 left');
    fireEvent.click(screen.getByText('Delete', { selector: 'button > span' }).closest('button')!);
    fireEvent.click(await screen.findByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(calls).toContain('DELETE /me/reports/activity/7'));
    expect(await screen.findByText('No activity report sent yet.')).toBeInTheDocument();
  });
});

describe('0.7.1 statuses', () => {
  it('weekly not_expected shows no "To send"', async () => {
    const { weeklyReportText } = await import('../dashboard/logic');
    expect(weeklyReportText({ status: 'not_expected' } as never).label).toBe(
      'Not expected this week',
    );
  });
});
