import type { Setting, SettingGroup, SettingType } from './types';

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
  return String(value);
}

/** Parses a form value back to the API type. Range rules stay on the server. */
export function parseInput(
  raw: string | boolean,
  type: SettingType,
): { ok: true; value: unknown } | { ok: false; error: string } {
  if (type === 'bool') return { ok: true, value: Boolean(raw) };
  const s = String(raw).trim();
  switch (type) {
    case 'int':
      return /^-?\d+$/.test(s)
        ? { ok: true, value: Number(s) }
        : { ok: false, error: 'Enter a whole number.' };
    case 'float':
      return s !== '' && Number.isFinite(Number(s))
        ? { ok: true, value: Number(s) }
        : { ok: false, error: 'Enter a number.' };
    case 'time':
      return /^([01]\d|2[0-3]):[0-5]\d$/.test(s)
        ? { ok: true, value: s }
        : { ok: false, error: 'Use the HH:MM format.' };
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
  return String(value);
}

export function groupSettings(settings: Setting[]) {
  return GROUPS.map((g) => ({ ...g, items: settings.filter((s) => s.group === g.key) })).filter(
    (g) => g.items.length,
  );
}
