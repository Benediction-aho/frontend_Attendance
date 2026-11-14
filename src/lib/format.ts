/**
 * Clock format used everywhere times are shown (owner decision: 12-hour, e.g. 8:10 AM).
 * Server values stay HH:MM (24-hour) on the wire; only the display uses this.
 */
export const HOUR_CYCLE: 'h23' | 'h12' = 'h12';
/** Locale whose 12-hour output reads "8:10 AM" (en-GB would give "8:10 am"). */
export const TIME_LOCALE = HOUR_CYCLE === 'h12' ? 'en-US' : 'en-GB';
const HOUR_STYLE = HOUR_CYCLE === 'h12' ? 'numeric' : '2-digit';

/** Shared options for every displayed time of day. */
export const TIME_OPTIONS: Intl.DateTimeFormatOptions = {
  hour: HOUR_STYLE,
  minute: '2-digit',
  hourCycle: HOUR_CYCLE,
  timeZone: 'Africa/Accra',
};

/** "17:00" (server HH:MM) → "5:00 PM". Anything not HH:MM is returned unchanged. */
export function formatHhmm(hhmm: string | null | undefined): string {
  if (!hhmm) return '–';
  const m = /^([01]?\d|2[0-3]):([0-5]\d)(?::\d{2})?$/.exec(hhmm.trim());
  if (!m) return hhmm;
  const h = Number(m[1]);
  if (HOUR_CYCLE === 'h23') return `${String(h).padStart(2, '0')}:${m[2]}`;
  return `${h % 12 === 0 ? 12 : h % 12}:${m[2]} ${h < 12 ? 'AM' : 'PM'}`;
}

/**
 * Parses what an admin typed as a time and returns server HH:MM (24-hour), or null.
 * Accepts "8:10 am", "8.10pm", "8 pm", "810pm", "17:00", "1700", "8:10".
 */
export function parseTimeInput(raw: string): string | null {
  const s = raw.trim().toLowerCase().replace(/\s+/g, ' ');
  const m = /^(\d{1,2})(?:[:.h ]?(\d{2}))? ?([ap])?\.? ?(?:m\.?)?$/.exec(s);
  if (!m) return null;
  let h = Number(m[1]);
  const min = m[2] === undefined ? 0 : Number(m[2]);
  if (min > 59) return null;
  const ap = m[3];
  if (ap) {
    if (h < 1 || h > 12) return null;
    h = (h % 12) + (ap === 'p' ? 12 : 0);
  } else {
    if (m[2] === undefined || h > 23) return null;
  }
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

const dateFmt = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'Africa/Accra',
});
const timeOfDayFmt = new Intl.DateTimeFormat(TIME_LOCALE, TIME_OPTIONS);

/** Formats a server timestamp in the office time zone (Africa/Accra). */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '–';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '–' : `${dateFmt.format(d)}, ${timeOfDayFmt.format(d)}`;
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '–';
  const d = new Date(iso.length === 10 ? `${iso}T12:00:00Z` : iso);
  return Number.isNaN(d.getTime()) ? '–' : dateFmt.format(d);
}

const isoDayFmt = new Intl.DateTimeFormat('en-CA', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  timeZone: 'Africa/Accra',
});
/** YYYY-MM-DD of a date in the office time zone (pass the server-synchronised now). */
export function isoDay(d: Date): string {
  return isoDayFmt.format(d);
}

/** "9 min 05 s", "45 s" – for lockout countdowns. */
export function formatCountdown(totalSeconds: number): string {
  const s = Math.max(0, Math.ceil(totalSeconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (m === 0) return `${r} s`;
  return `${m} min ${String(r).padStart(2, '0')} s`;
}

export const ROLE_LABEL = {
  super_admin: 'Super admin',
  admin: 'Admin',
  employee: 'Staff',
} as const;
export const STATUS_LABEL = {
  pending: 'Pending',
  active: 'Active',
  blocked: 'Blocked',
  locked: 'Locked',
  deleted: 'Deleted',
} as const;

export function initials(first?: string, last?: string): string {
  return `${(first ?? '').charAt(0)}${(last ?? '').charAt(0)}`.toUpperCase() || '?';
}

const dayFmt = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

/** "2026-11-12" → "12 Nov 2026" (calendar day, no time zone shift). */
export function formatDayEnGb(iso: string): string {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? iso : dayFmt.format(d);
}

const longDayFmt = new Intl.DateTimeFormat('en-GB', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  timeZone: 'UTC',
});

/** "Friday 13 November" from a server work date (YYYY-MM-DD); same on both homes (UI6-08). */
export function formatLongDay(iso: string | null | undefined): string {
  if (!iso) return '–';
  const d = new Date(iso.length === 10 ? `${iso}T12:00:00Z` : iso);
  return Number.isNaN(d.getTime()) ? '–' : longDayFmt.format(d).replace(',', '');
}
