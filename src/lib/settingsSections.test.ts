import { describe, expect, it } from 'vitest';
import { canManageSettings, settingsSections } from './permissions';
import { isSettingsSection, normalizeTime, sectionOf } from './settings';
import { formatDateTime, formatHhmm, parseTimeInput } from './format';
import { formatTime } from './attendance';
import type { User } from './types';

const user = (o: Partial<User>) => ({ id: 1, role: 'admin', permissions: [], ...o }) as User;

describe('settings parts', () => {
  it('super admin manages the three parts', () => {
    expect(settingsSections(user({ role: 'super_admin' }))).toEqual([
      'attendance',
      'reports',
      'security',
    ]);
  });
  it('admin sees only the parts of their tiers', () => {
    const a = user({ permissions: ['manage_settings_reports'] });
    expect(settingsSections(a)).toEqual(['reports']);
    expect(canManageSettings(a)).toBe(true);
    expect(canManageSettings(user({ permissions: ['view_logs'] }))).toBe(false);
    expect(
      canManageSettings(user({ role: 'employee', permissions: ['manage_settings_security'] })),
    ).toBe(false);
  });
  it('uses the API section, falling back to the group', () => {
    expect(sectionOf({ section: 'security', group: 'attendance' })).toBe('security');
    expect(sectionOf({ group: 'reports' })).toBe('reports');
    expect(sectionOf({ group: 'system' })).toBe('security');
    expect(isSettingsSection('reports')).toBe(true);
    expect(isSettingsSection('system')).toBe(false);
  });
});

describe('12-hour times', () => {
  it('normalises typed times to 12-hour display', () => {
    expect(normalizeTime('8:10')).toBe('8:10 AM');
    expect(normalizeTime('810')).toBe('8:10 AM');
    expect(normalizeTime('17.00')).toBe('5:00 PM');
    expect(normalizeTime('8.10pm')).toBe('8:10 PM');
    expect(normalizeTime('8:10 am')).toBe('8:10 AM');
    expect(normalizeTime('nonsense')).toBe('nonsense');
  });
  it('converts 12-hour entry to server HH:MM, edge cases included', () => {
    expect(parseTimeInput('12:00 AM')).toBe('00:00');
    expect(parseTimeInput('12:00 PM')).toBe('12:00');
    expect(parseTimeInput('11:59 PM')).toBe('23:59');
    expect(parseTimeInput('12:30am')).toBe('00:30');
    expect(parseTimeInput('8 pm')).toBe('20:00');
    expect(parseTimeInput('8.10p.m.')).toBe('20:10');
    expect(parseTimeInput('17:00')).toBe('17:00');
    expect(parseTimeInput('0:00')).toBe('00:00');
    expect(parseTimeInput('13:00 PM')).toBeNull();
    expect(parseTimeInput('0:30 AM')).toBeNull();
    expect(parseTimeInput('8:60 AM')).toBeNull();
    expect(parseTimeInput('24:00')).toBeNull();
    expect(parseTimeInput('8')).toBeNull();
  });
  it('displays server HH:MM in 12-hour form', () => {
    expect(formatHhmm('00:00')).toBe('12:00 AM');
    expect(formatHhmm('12:00')).toBe('12:00 PM');
    expect(formatHhmm('23:59')).toBe('11:59 PM');
    expect(formatHhmm('08:10')).toBe('8:10 AM');
  });
  it('formats timestamps with AM/PM in office time', () => {
    expect(formatDateTime('2026-11-13T17:05:00Z')).toBe('13 Nov 2026, 5:05 PM');
    expect(formatTime('2026-11-13T00:05:00Z')).toBe('12:05 AM');
  });
});
