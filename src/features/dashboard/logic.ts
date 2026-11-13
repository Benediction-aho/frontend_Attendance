import { formatDateTime } from '../../lib/format';
import type { MyDashboard } from './types';

/** "3 Nov – 9 Nov 2026" from two ISO days (server values). */
export function periodLabel(start: string, end: string): string {
  const f = (iso: string, year: boolean) =>
    new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'short',
      ...(year ? { year: 'numeric' } : {}),
      timeZone: 'UTC',
    }).format(new Date(`${iso}T12:00:00Z`));
  return `${f(start, false)} – ${f(end, true)}`;
}

type WR = MyDashboard['week']['weekly_report'];

/** Wording of the weekly report status returned by the server (no rule computed here). */
export function weeklyReportText(r: WR): {
  label: string;
  hint?: string;
  action?: string;
  attention: boolean;
} {
  switch (r.status) {
    case 'submitted':
      return {
        label: r.is_late ? 'Sent late' : 'Sent',
        hint: r.submitted_at ? `On ${formatDateTime(r.submitted_at)}` : undefined,
        action: 'See my weekly report',
        attention: false,
      };
    case 'open':
      return {
        label: 'To send',
        hint: r.deadline ? `Before ${formatDateTime(r.deadline)}` : undefined,
        action: 'Send my weekly report',
        attention: true,
      };
    case 'missing':
      return {
        label: 'Not sent',
        hint: r.deadline ? `It was due ${formatDateTime(r.deadline)}` : undefined,
        action: 'Send my weekly report',
        attention: true,
      };
    case 'not_open':
      return {
        label: 'Not open yet',
        hint: r.opens_at ? `Opens ${formatDateTime(r.opens_at)}` : undefined,
        action: 'See my weekly report',
        attention: false,
      };
    default:
      return { label: 'Not required', hint: 'No weekly report this week.', attention: false };
  }
}

/** "4 of 5" style ratio; undefined if either side is absent from the API. */
export function ratio(a: number | undefined, b: number | undefined): string | undefined {
  return a === undefined || b === undefined ? undefined : `${a} of ${b}`;
}
