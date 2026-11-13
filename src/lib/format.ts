const dateFmt = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'Africa/Accra',
});
const dateTimeFmt = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Africa/Accra',
});

/** Formats a server timestamp in the office time zone (Africa/Accra). */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '–';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '–' : dateTimeFmt.format(d);
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
export const TYPE_LABEL = { intern: 'Intern', employee: 'Employee' } as const;
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
