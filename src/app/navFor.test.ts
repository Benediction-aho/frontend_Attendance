import { describe, expect, it } from 'vitest';
import { navFor } from './AppLayout';
import type { User } from '../lib/types';

const user = (o: Partial<User>) => ({ id: 1, role: 'employee', permissions: [], ...o }) as User;

describe('navFor (floating phone bar)', () => {
  it('employee: Today, My work, Notifications; no Profile tab', () => {
    expect(navFor(user({})).mobile.map((i) => i.label)).toEqual([
      'Today',
      'My work',
      'Notifications',
    ]);
    expect(navFor(user({})).main.some((i) => i.label === 'Profile')).toBe(false);
  });
  it('admin: Home, Notifications, Admin', () => {
    expect(navFor(user({ role: 'super_admin' })).mobile.map((i) => i.label)).toEqual([
      'Home',
      'Notifications',
      'Admin',
    ]);
  });
  it('never more than four links (Sign out is added by the bar)', () => {
    const u = user({ permissions: ['approve_users', 'view_attendance'] });
    expect(navFor(u).mobile.length).toBeLessThanOrEqual(4);
  });
});
