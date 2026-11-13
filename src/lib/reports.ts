import { ApiError, errorMessage } from './api';
import { formatDateTime, formatDayEnGb } from './format';
import { formatTime } from './attendance';

/** Shapes from the API contract (openapi 0.5). Nothing here is computed client-side. */
export interface Task {
  id: number;
  work_date: string;
  title: string;
  status: 'planned' | 'done';
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClientEntry {
  id: number;
  work_date: string;
  name: string;
  service: string;
  service_key: string;
  quantity: number;
}

export interface ServiceTotal {
  service: string;
  service_key: string;
  quantity: number;
}

export interface ServiceSuggestion {
  service: string;
  service_key: string;
}

export interface DailyReport {
  work_date: string;
  tasks: Task[];
  tasks_planned: number;
  tasks_done: number;
  clients: ClientEntry[];
  clients_count: number;
  services: ServiceTotal[];
  generated_at: string | null;
}

export interface WeeklyClient {
  work_date: string;
  name: string;
  service: string;
  quantity: number;
}

export interface WeeklyDay {
  work_date: string;
  tasks_planned: number;
  tasks_done: number;
  clients_count: number;
  services: ServiceTotal[];
}

export interface WeeklySummary {
  week_start: string;
  week_end: string;
  days: WeeklyDay[];
  tasks_planned: number;
  tasks_done: number;
  clients_count: number;
  /** Absent when the viewer may not see client names. */
  clients?: WeeklyClient[];
  services: ServiceTotal[];
}

export interface WeeklySubmission {
  id: number;
  week_start: string;
  window_date: string;
  version: number;
  is_current: boolean;
  file_name: string;
  size_bytes: number;
  submitted_at: string;
  is_late: boolean;
  forwarded_at: string | null;
  /** Temporary download link (expires). */
  file_url: string | null;
}

export interface SubmissionStatus {
  can_submit: boolean;
  week_start: string;
  window_date: string;
  opens_at: string;
  closes_at: string;
  deadline: string;
  is_late_now: boolean;
  expected: boolean;
  max_size_mb: number;
  current: WeeklySubmission | null;
  versions: WeeklySubmission[];
}

export interface EmployeeSummary {
  id: number;
  first_name: string;
  last_name: string;
  job_title?: string | null;
  employee_type?: string;
  email?: string;
}

export interface AdminDailyRow {
  user: EmployeeSummary;
  day_status: string;
  generated_at: string | null;
  tasks_planned: number;
  tasks_done: number;
  clients_count: number;
  services: ServiceTotal[];
  tasks?: Task[];
  clients?: ClientEntry[];
}

export interface AdminWeeklyList {
  week_start: string;
  window_date: string;
  opens_at: string;
  closes_at: string;
  expected_count: number;
  received_count: number;
  data: { user: EmployeeSummary; expected: boolean; submission: WeeklySubmission | null }[];
  /** Expected employees without a report (server list). */
  missing?: EmployeeSummary[];
}

export interface AdminSubmissionDetail extends WeeklySubmission {
  user: EmployeeSummary;
  versions: WeeklySubmission[];
  week: { clients_count: number; services: ServiceTotal[]; clients?: WeeklyClient[] };
}

export const fullName = (u: Pick<EmployeeSummary, 'first_name' | 'last_name'>) =>
  `${u.first_name} ${u.last_name}`;

/** "02 Residence Permit"-like line for a service total. */
export function serviceLine(s: ServiceTotal): string {
  return `${s.quantity} × ${s.service}`;
}

/** "1.2 MB", "350 KB". */
export function formatSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '–';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** "Mon 10 Nov – Fri 14 Nov 2026". */
export function weekLabel(start: string, end: string): string {
  return `${formatDayEnGb(start)} – ${formatDayEnGb(end)}`;
}

const weekdayFmt = new Intl.DateTimeFormat('en-GB', {
  weekday: 'long',
  day: 'numeric',
  month: 'short',
  timeZone: 'Africa/Accra',
});

/** "Friday 14 Nov at 16:00" for a server timestamp. */
export function dayAndTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '–';
  return `${weekdayFmt.format(d)} at ${formatTime(iso)}`;
}

/** Calendar day shifted by n days (YYYY-MM-DD in, YYYY-MM-DD out). */
export function shiftDate(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Client-side hint before an upload (the server checks again and decides).
 * Returns a blocking message for an oversized file, a warning for a doubtful type.
 */
export function pdfFileHint(
  file: Pick<File, 'name' | 'size' | 'type'>,
  maxMb: number,
): { block?: string; warn?: string } {
  if (file.size === 0) return { block: 'This file is empty. Choose your PDF report.' };
  if (maxMb > 0 && file.size > maxMb * 1024 * 1024)
    return {
      block: `This file is ${formatSize(file.size)}. The maximum is ${maxMb} MB. Export a smaller PDF and try again.`,
    };
  const looksPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
  if (!looksPdf) return { warn: 'This does not look like a PDF. Only PDF reports are accepted.' };
  return {};
}

/** Clear English message for every upload refusal. Server messages are shown as-is when given. */
export function uploadErrorMessage(e: unknown, maxMb: number): string {
  if (!(e instanceof ApiError)) return errorMessage(e);
  if (e.status === 413) return `This file is too large. The maximum is ${maxMb} MB.`;
  const fallback: Record<string, string> = {
    invalid_pdf: 'Please upload a PDF file.',
    pdf_encrypted:
      'Password-protected PDFs are not accepted. Please export the report without a password.',
    pdf_active_content:
      'This PDF contains scripts, actions or embedded files. Please export it again as a plain PDF.',
    too_many_versions:
      'You have reached the maximum number of versions for this week. Contact an administrator.',
    checkin_required: 'Please check in first to send your report today.',
    invalid_characters:
      'The file name contains characters that are not allowed. Rename it and try again.',
  };
  const code = e.code;
  if (code === 'window_not_open') {
    const b = e.body as { opens_at?: unknown } | null;
    const at = b && typeof b.opens_at === 'string' ? dayAndTime(b.opens_at) : null;
    return at ? `The upload is not open yet. It opens on ${at}.` : 'The upload is not open yet.';
  }
  if (e.status === 422 && !code) {
    const f = e.fieldErrors.file;
    if (f) return f;
  }
  if (code && e.message && e.message !== 'The request could not be completed.') return e.message;
  if (code && fallback[code]) return fallback[code];
  return errorMessage(e);
}

/** Messages for task/client writes (422 codes from the API). */
export function writeErrorMessage(e: unknown): string {
  if (e instanceof ApiError && e.code === 'invalid_characters')
    return 'Some characters are not allowed. Remove special or invisible characters and try again.';
  if (e instanceof ApiError && e.status === 422) {
    const first = Object.values(e.fieldErrors)[0];
    if (!e.code && first) return first;
  }
  return errorMessage(e);
}

/** Plain-English field errors for a client entry (server 422 messages are Laravel text). */
export function clientFieldErrors(e: unknown): {
  name?: string;
  service?: string;
  quantity?: string;
  max?: number;
} {
  if (!(e instanceof ApiError) || e.status !== 422 || e.code) return {};
  const f = e.fieldErrors;
  const out: { name?: string; service?: string; quantity?: string; max?: number } = {};
  if (f.quantity) {
    const max = /(?:greater than|between 1 and) (\d+)/i.exec(f.quantity)?.[1];
    if (max) {
      out.max = Number(max);
      out.quantity = /between/i.test(f.quantity) ? f.quantity : `Enter a number from 1 to ${max}.`;
    } else if (!/ field /i.test(f.quantity)) out.quantity = f.quantity;
    else if (/at least|minimum|min/i.test(f.quantity))
      out.quantity = 'Quantity must be at least 1.';
    else out.quantity = 'Enter a whole number, 1 or more.';
  }
  // Server messages are plain English now; only rewrite raw framework text.
  const plain = (m: string) => !/ field /i.test(m);
  if (f.name)
    out.name = plain(f.name)
      ? f.name
      : /greater than (\d+)/i.test(f.name)
        ? 'This name is too long.'
        : 'Check the client name.';
  if (f.service)
    out.service = plain(f.service)
      ? f.service
      : /greater than (\d+)/i.test(f.service)
        ? 'This service is too long.'
        : 'Check the service.';
  return out;
}

/** Client-side quantity check; `max` only when the API told us its limit. */
export function quantityError(raw: string, max?: number): string | undefined {
  if (raw.trim() === '') return 'Enter the quantity.';
  const n = Number(raw);
  if (!Number.isFinite(n) || !Number.isInteger(n)) return 'Enter a whole number, 1 or more.';
  if (n < 1) return 'Quantity must be at least 1.';
  if (max !== undefined && n > max) return `Enter a number from 1 to ${max}.`;
  return undefined;
}

export type WindowPhase = 'before' | 'open' | 'after';

/** Where "now" (server time) sits relative to the window the API returned. */
export function windowPhase(
  s: Pick<SubmissionStatus, 'opens_at' | 'closes_at'>,
  now: Date,
): WindowPhase {
  const t = now.getTime();
  if (t < Date.parse(s.opens_at)) return 'before';
  if (t < Date.parse(s.closes_at)) return 'open';
  return 'after';
}

/** "1 h 05 min", "12 min 30 s", "45 s" until a timestamp. */
export function countdown(toIso: string, now: Date): string {
  const s = Math.max(0, Math.ceil((Date.parse(toIso) - now.getTime()) / 1000));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  if (d > 0) return `${d} d ${h} h`;
  if (h > 0) return `${h} h ${String(m).padStart(2, '0')} min`;
  if (m >= 10) return `${m} min`;
  if (m > 0) return `${m} min ${String(r).padStart(2, '0')} s`;
  return `${r} s`;
}

/** Personal deadline later than the window close: absent on the report day (grace). */
export function hasGrace(s: Pick<SubmissionStatus, 'deadline' | 'closes_at'>): boolean {
  return Date.parse(s.deadline) > Date.parse(s.closes_at);
}

export { formatDateTime };

/** UX5-11: keeps the day / week the admin came from (validated ISO date only). */
export function backQuery(p: URLSearchParams): string {
  const b = p.get('back') ?? '';
  return /^\d{4}-\d{2}-\d{2}$/.test(b) ? `?date=${b}` : '';
}
