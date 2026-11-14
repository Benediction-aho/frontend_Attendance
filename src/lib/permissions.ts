import type { User } from './types';

/**
 * Display-only gating: hides what the user cannot do. The server remains the
 * authority and re-checks every request.
 */
export function can(user: User | null | undefined, permission: string): boolean {
  if (!user) return false;
  if (user.role === 'super_admin') return true;
  return user.role === 'admin' && (user.permissions ?? []).includes(permission);
}

export const isSuperAdmin = (u: User | null | undefined) => u?.role === 'super_admin';

export const ACCOUNT_TIERS = ['create_users', 'approve_users', 'block_users', 'delete_users'];

export function canManageAccounts(user: User | null | undefined): boolean {
  return ACCOUNT_TIERS.some((p) => can(user, p));
}

export function canViewLogs(user: User | null | undefined): boolean {
  return can(user, 'view_logs');
}

/** Actions on a target account, mirroring the server rules for display only. */
export function accountActions(actor: User | null | undefined, target: User) {
  const staff = target.role !== 'employee';
  const superA = isSuperAdmin(actor);
  const self = actor?.id === target.id;
  const onTarget = (tier: string) => (staff ? superA : can(actor, tier));
  return {
    approve: target.status === 'pending' && can(actor, 'approve_users'),
    reject: target.status === 'pending' && can(actor, 'approve_users'),
    block: !self && target.status === 'active' && onTarget('block_users'),
    unblock: target.status === 'blocked' && onTarget('block_users'),
    unlock: target.status === 'locked' && onTarget('block_users'),
    newCode:
      !self &&
      (target.status === 'active' || target.status === 'locked') &&
      target.role !== 'super_admin' &&
      (staff ? superA : can(actor, 'approve_users') || can(actor, 'block_users')),
    remove: !self && target.status !== 'deleted' && onTarget('delete_users'),
    changeRole: superA && !self && target.status === 'active',
    editPermissions: superA && target.role === 'admin',
  };
}

/** Tiers that open the admin attendance views (mirrors the server gate `view-attendance`). */
export const ATTENDANCE_TIERS = [
  'view_lateness',
  'view_activities',
  'view_performance',
  'approve_mission_checkins',
  'checkin_for_employee',
  'manage_leaves',
  'manage_work_schedules',
];

export function canViewAttendance(user: User | null | undefined): boolean {
  return ATTENDANCE_TIERS.some((p) => can(user, p));
}

export const isEmployee = (u: User | null | undefined) => u?.role === 'employee';

/** Daily reports and per-employee weekly summaries (server tier `view_reports`). */
export const canViewReports = (u: User | null | undefined) => can(u, 'view_reports');

/** Weekly PDF list and files (server: `view_reports` or `receive_weekly_reports`). */
export const canSeeWeeklyPdfs = (u: User | null | undefined) =>
  can(u, 'view_reports') || can(u, 'receive_weekly_reports');

/** The three configuration parts and the tier that opens each one. */
export const SETTINGS_SECTIONS = ['attendance', 'reports', 'security'] as const;
export type SettingsSection = (typeof SETTINGS_SECTIONS)[number];
export const SETTINGS_TIER: Record<SettingsSection, string> = {
  attendance: 'manage_settings_attendance',
  reports: 'manage_settings_reports',
  security: 'manage_settings_security',
};

/** Parts of the settings the user may open (super admins: all three). Display only. */
export function settingsSections(user: User | null | undefined): SettingsSection[] {
  return SETTINGS_SECTIONS.filter((s) => can(user, SETTINGS_TIER[s]));
}

export const canManageSettings = (u: User | null | undefined) => settingsSections(u).length > 0;
