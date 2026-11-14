import { describe, expect, it } from 'vitest';
import { accountActions, can, canManageAccounts } from './permissions';
import { displayValue, parseInput, toInput } from './settings';
import { fitWithin } from './image';
import { formatCountdown } from './format';
import { describeLoginError } from '../features/auth/loginErrors';
import { ApiError } from './api';
import type { User } from './types';

const user = (o: Partial<User>): User => ({
  id: 1,
  first_name: 'Ama',
  last_name: 'Mensah',
  full_name: 'Ama Mensah',
  email: 'a@x.test',
  role: 'employee',
  employee_type: 'employee',
  job_title: 'Accountant',
  status: 'active',
  ...o,
});

describe('permissions (display only)', () => {
  it('super admin can everything, admin only its tiers, employee nothing', () => {
    expect(can(user({ role: 'super_admin' }), 'view_logs')).toBe(true);
    expect(can(user({ role: 'admin', permissions: ['block_users'] }), 'block_users')).toBe(true);
    expect(can(user({ role: 'admin', permissions: ['block_users'] }), 'delete_users')).toBe(false);
    expect(can(user({ role: 'employee', permissions: ['block_users'] }), 'block_users')).toBe(
      false,
    );
    expect(canManageAccounts(user({ role: 'admin', permissions: ['approve_users'] }))).toBe(true);
  });

  it('admins cannot act on staff accounts; nobody blocks or deletes themselves', () => {
    const admin = user({ id: 9, role: 'admin', permissions: ['block_users', 'delete_users'] });
    expect(accountActions(admin, user({ id: 2 })).block).toBe(true);
    expect(accountActions(admin, user({ id: 3, role: 'admin' })).block).toBe(false);
    const sa = user({ id: 5, role: 'super_admin' });
    expect(accountActions(sa, sa).block).toBe(false);
    expect(accountActions(sa, sa).remove).toBe(false);
    expect(accountActions(sa, sa).changeRole).toBe(false);
    expect(accountActions(sa, user({ id: 2, status: 'locked' })).unlock).toBe(true);
    expect(accountActions(sa, user({ id: 2, status: 'pending' })).approve).toBe(true);
  });
});

describe('settings values', () => {
  it('round-trips each type', () => {
    expect(parseInput('60', 'int')).toEqual({ ok: true, value: 60 });
    expect(parseInput('6.5', 'int').ok).toBe(false);
    expect(parseInput('-0.2167', 'float')).toEqual({ ok: true, value: -0.2167 });
    expect(parseInput('08:15', 'time')).toEqual({ ok: true, value: '08:15' });
    // 24-hour entry is normalised; AM/PM is never accepted.
    expect(parseInput('8:15', 'time')).toEqual({ ok: true, value: '08:15' });
    expect(parseInput('1700', 'time')).toEqual({ ok: true, value: '17:00' });
    expect(parseInput('5:00 PM', 'time')).toEqual({ ok: true, value: '17:00' });
    expect(parseInput('13:00 PM', 'time').ok).toBe(false);
    expect(parseInput('24:00', 'time').ok).toBe(false);
    expect(parseInput('10, 20 30', 'int_list')).toEqual({ ok: true, value: [10, 20, 30] });
    expect(parseInput('10,x', 'int_list').ok).toBe(false);
    expect(parseInput(true, 'bool')).toEqual({ ok: true, value: true });
    expect(toInput([10, 20], 'int_list')).toBe('10, 20');
    expect(displayValue(false)).toBe('Off');
    expect(displayValue([])).toBe('None');
  });
});

describe('helpers', () => {
  it('fits photos without upscaling', () => {
    expect(fitWithin(4000, 3000, 1024)).toEqual({ width: 1024, height: 768 });
    expect(fitWithin(500, 800, 1024)).toEqual({ width: 500, height: 800 });
  });
  it('formats countdowns', () => {
    expect(formatCountdown(45)).toBe('45 s');
    expect(formatCountdown(605)).toBe('10 min 05 s');
  });
});

describe('login errors', () => {
  const err = (status: number, body: object) => new ApiError('client', status, 'x', body);
  it('maps lockout codes with remaining time', () => {
    expect(
      describeLoginError(err(429, { code: 'login_blocked', retry_after_seconds: 600 })),
    ).toMatchObject({ retryAfter: 600 });
    expect(describeLoginError(err(423, { code: 'account_locked' })).locked).toBe(true);
  });
  it('never reveals whether the email exists', () => {
    expect(describeLoginError(err(401, { code: 'invalid_credentials' })).message).toBe(
      'The email or code is incorrect.',
    );
  });
  it('treats network errors as offline, not as a wrong code', () => {
    expect(describeLoginError(new ApiError('network', null, 'x')).message).toMatch(/offline/);
  });
});

describe('dashboard refresh after writes (UX6-01 / UX6-02)', () => {
  it('invalidates both dashboards', async () => {
    const { QueryClient } = await import('@tanstack/react-query');
    const { invalidateDashboards } = await import('./queryClient');
    const qc = new QueryClient();
    qc.setQueryData(['me', 'dashboard'], { a: 1 });
    qc.setQueryData(['admin', 'dashboard'], { a: 1 });
    qc.setQueryData(['other'], { a: 1 });
    invalidateDashboards(qc);
    expect(qc.getQueryState(['me', 'dashboard'])?.isInvalidated).toBe(true);
    expect(qc.getQueryState(['admin', 'dashboard'])?.isInvalidated).toBe(true);
    expect(qc.getQueryState(['other'])?.isInvalidated).toBe(false);
  });
});
