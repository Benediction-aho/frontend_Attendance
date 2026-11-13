import { describe, expect, it } from 'vitest';
import { canManageSettings, settingsSections } from './permissions';
import { isSettingsSection, normalizeTime, sectionOf } from './settings';
import { formatDateTime } from './format';
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

describe('24-hour times', () => {
  it('normalises typed times', () => {
    expect(normalizeTime('8:10')).toBe('08:10');
    expect(normalizeTime('810')).toBe('08:10');
    expect(normalizeTime('17.00')).toBe('17:00');
    expect(normalizeTime('17:00')).toBe('17:00');
  });
  it('formats timestamps without AM/PM', () => {
    const s = formatDateTime('2026-11-13T17:05:00Z');
    expect(s).toContain('17:05');
    expect(s).not.toMatch(/am|pm/i);
  });
});
