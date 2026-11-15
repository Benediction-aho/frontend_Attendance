import type { Setting, SettingGroup, SettingType } from './types';
import { SETTINGS_SECTIONS, type SettingsSection } from './permissions';
import { formatDayEnGb, formatHhmm, parseTimeInput } from './format';

export const isSettingsSection = (v: string | undefined): v is SettingsSection =>
  (SETTINGS_SECTIONS as readonly string[]).includes(v ?? '');

export const SECTION_INFO: Record<SettingsSection, { title: string; description: string }> = {
  attendance: {
    title: 'Attendance',
    description: 'Office location, check-in perimeter and working hours.',
  },
  reports: { title: 'Reports', description: 'When reports are generated and sent.' },
  security: {
    title: 'Security',
    description: 'Sign-in protection, codes, sessions, storage and logs.',
  },
};

/** Part a setting belongs to; the API field wins, the group is a fallback (system → security). */
export function sectionOf(s: Pick<Setting, 'section' | 'group'>): SettingsSection {
  if (s.section) return s.section;
  return s.group === 'attendance' || s.group === 'reports' ? s.group : 'security';
}

/**
 * Normalises what was typed in a time field for display: "8.10pm" → "8:10 PM",
 * "17:00" → "5:00 PM". Anything unreadable is returned unchanged (validation reports it).
 */
export function normalizeTime(raw: string): string {
  const t = parseTimeInput(raw);
  return t ? formatHhmm(t) : raw.trim();
}

export const GROUPS: { key: SettingGroup; title: string; description: string }[] = [
  {
    key: 'attendance',
    title: 'Attendance',
    description: 'Office location, check-in perimeter and working hours.',
  },
  { key: 'reports', title: 'Reports', description: 'When reports are generated and sent.' },
  { key: 'security', title: 'Security', description: 'Sign-in protection, codes and sessions.' },
  { key: 'system', title: 'System', description: 'Storage, logs and files.' },
];

/** Value as shown in a form control. */
export function toInput(value: unknown, type: SettingType): string | boolean {
  if (type === 'bool') return Boolean(value);
  if (type === 'int_list') return Array.isArray(value) ? value.join(', ') : '';
  if (value === null || value === undefined) return '';
  if (type === 'date' && typeof value === 'string') return value.slice(0, 10);
  if (type === 'time' && typeof value === 'string') return formatHhmm(value);
  return String(value);
}

export interface Bounds {
  min?: number | null;
  max?: number | null;
}

/** "Between 10 and 5000." – shown as a hint under numeric settings. */
export function boundsHint(b: Bounds): string | null {
  const min = b.min ?? null;
  const max = b.max ?? null;
  if (min !== null && max !== null) return `Between ${min} and ${max}.`;
  if (min !== null) return `Minimum ${min}.`;
  if (max !== null) return `Maximum ${max}.`;
  return null;
}

/**
 * Parses a form value back to the API type and checks the bounds the API gave
 * for this setting (the server validates again).
 */
export function parseInput(
  raw: string | boolean,
  type: SettingType,
  bounds: Bounds & { nullable?: boolean } = {},
): { ok: true; value: unknown } | { ok: false; error: string } {
  const r = parseType(raw, type, bounds.nullable === true);
  if (!r.ok) return r;
  const min = bounds.min ?? null;
  const max = bounds.max ?? null;
  const nums =
    type === 'int' || type === 'float'
      ? [r.value as number]
      : type === 'int_list'
        ? (r.value as number[])
        : [];
  for (const n of nums) {
    if (min !== null && n < min) return { ok: false, error: `Minimum ${min}.` };
    if (max !== null && n > max) return { ok: false, error: `Maximum ${max}.` };
  }
  return r;
}

/** Plain-English version of a server validation message (never shows field keys). */
export function friendlyServerMessage(message: string): string {
  let m: RegExpMatchArray | null;
  if ((m = message.match(/must not be greater than (-?\d+(?:\.\d+)?)/i))) return `Maximum ${m[1]}.`;
  if ((m = message.match(/must be at least (-?\d+(?:\.\d+)?)/i))) return `Minimum ${m[1]}.`;
  if ((m = message.match(/must be between (-?\d+(?:\.\d+)?) and (-?\d+(?:\.\d+)?)/i)))
    return `Enter a value between ${m[1]} and ${m[2]}.`;
  if (/after or equal to|must be a date after/i.test(message))
    return 'Choose today or a later date.';
  if (/must be an integer/i.test(message)) return 'Enter a whole number.';
  if (/must be a number|must be numeric/i.test(message)) return 'Enter a number.';
  if (/does not match the format/i.test(message)) return 'Enter a time such as 8:10 AM or 5:00 PM.';
  if (/duplicate|distinct/i.test(message)) return 'Each value can appear only once.';
  if (/selected .* is invalid|is invalid/i.test(message)) return 'This value is not accepted.';
  if (/is required/i.test(message)) return 'This value is required.';
  // Unknown wording: drop the technical field name ("The values.x y field …").
  return message.replace(/^The [\w.* ]+? field /i, 'This value ');
}

function parseType(
  raw: string | boolean,
  type: SettingType,
  nullable = false,
): { ok: true; value: unknown } | { ok: false; error: string } {
  if (type === 'bool') return { ok: true, value: Boolean(raw) };
  const s = String(raw).trim();
  // An emptied nullable setting is sent as null (e.g. no start date).
  if (s === '' && nullable && type !== 'int_list') return { ok: true, value: null };
  switch (type) {
    case 'int':
      return /^-?\d+$/.test(s)
        ? { ok: true, value: Number(s) }
        : { ok: false, error: 'Enter a whole number.' };
    case 'float':
      return s !== '' && Number.isFinite(Number(s))
        ? { ok: true, value: Number(s) }
        : { ok: false, error: 'Enter a number.' };
    case 'time': {
      const t = parseTimeInput(s);
      return t
        ? { ok: true, value: t }
        : { ok: false, error: 'Enter a time such as 8:10 AM or 5:00 PM.' };
    }
    case 'date':
      return /^\d{4}-\d{2}-\d{2}$/.test(s)
        ? { ok: true, value: s }
        : { ok: false, error: 'Choose a date.' };
    case 'int_list': {
      if (s === '') return { ok: true, value: [] };
      const parts = s.split(/[\s,;]+/).filter(Boolean);
      return parts.every((p) => /^\d+$/.test(p))
        ? { ok: true, value: parts.map(Number) }
        : { ok: false, error: 'Enter whole numbers separated by commas.' };
    }
    default:
      return s ? { ok: true, value: s } : { ok: false, error: 'This value is required.' };
  }
}

export function sameValue(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function displayValue(value: unknown): string {
  if (typeof value === 'boolean') return value ? 'On' : 'Off';
  if (Array.isArray(value)) return value.length ? value.join(', ') : 'None';
  if (value === null || value === undefined || value === '') return '–';
  if (typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value))
    return formatHhmm(value);
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return formatDayEnGb(value);
  return String(value);
}

/** Shown above the perimeter radius and GPS uncertainty settings, which are kept side by side. */
export const PERIMETER_HELP =
  'Perimeter radius: how far from the office. Maximum GPS uncertainty: how imprecise a phone position may be.';

/** Keeps checkin_max_accuracy_m right after checkin_radius_m. */
function pairPerimeter(items: Setting[]): Setting[] {
  const acc = items.find((s) => s.key === 'checkin_max_accuracy_m');
  const radiusAt = items.findIndex((s) => s.key === 'checkin_radius_m');
  if (!acc || radiusAt < 0) return items;
  const rest = items.filter((s) => s !== acc);
  const at = rest.findIndex((s) => s.key === 'checkin_radius_m');
  return [...rest.slice(0, at + 1), acc, ...rest.slice(at + 1)];
}

export function groupSettings(settings: Setting[]) {
  return GROUPS.map((g) => ({
    ...g,
    items: pairPerimeter(settings.filter((s) => s.group === g.key)),
  })).filter((g) => g.items.length);
}

/** Short explanation under settings whose label alone is not enough (display only). */
export const SETTING_HINTS: Record<string, string> = {
  admin_attendance_starts_on:
    'From this date, admins check in, choose their working week and send their reports like employees. Leave it empty and admins do not check in at all. Past days keep the rule that applied then.',
  activity_reports_per_day:
    'Activity reports are PDFs sent at any time, outside the Friday weekly report. A deleted report still counts.',
  activity_report_delete_minutes:
    'How long the author may delete a report after sending it. 0 = never.',
  activity_report_email:
    'Readers always get an in-app notification. Turn this on to e-mail them as well.',
};

/** Shorter labels for the settings added on 2026-11-14 (the API label is kept as a fallback). */
export const SETTING_LABELS: Record<string, string> = {
  admin_attendance_starts_on: 'Admins check in from',
  activity_reports_per_day: 'Activity reports per person per day',
  activity_report_delete_minutes: 'Activity report deletion window (minutes)',
  activity_report_email: 'E-mail readers about each activity report',
};
