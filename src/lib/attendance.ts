import { HOUR_CYCLE } from './format';
/**
 * Attendance data as returned by the API. The client never computes lateness,
 * work dates or perimeter validity: it only displays what the server sends.
 */
export type DayStatus = 'working' | 'remote' | 'day_off' | 'holiday' | 'leave' | 'non_working';
export type CheckInType = 'gps' | 'mission' | 'remote' | 'admin_on_behalf';
export type FaceIdState = 'ready' | 'not_registered' | 'pending_approval' | 'other_device';

export interface Attendance {
  id: number;
  work_date: string;
  day_status: DayStatus;
  check_in_type: CheckInType;
  check_in_at: string;
  check_in_distance_m?: number | null;
  is_late?: boolean;
  late_after?: string;
  faceid_verified?: boolean;
  reason?: string | null;
  mission_status?: 'pending' | 'approved' | 'rejected' | null;
  mission_note?: string | null;
  check_out_at?: string | null;
  check_out_type?: 'manual' | 'auto_midnight' | null;
  checkout_forgotten?: boolean;
  check_out_distance_m?: number | null;
  check_out_position_available?: boolean | null;
  check_out_at_office?: boolean | null;
  early_leave?: boolean;
  early_leave_reason?: string | null;
  user_id?: number;
  user?: EmployeeSummary;
  checked_in_by?: { id: number; name: string } | number | null;
}

export interface TodayRules {
  radius_m?: number;
  max_accuracy_m?: number;
  late_after?: string;
  end_of_day?: string;
  early_checkout_reason_required?: boolean;
  faceid_required?: boolean;
}

export interface Today {
  server_time: string;
  server_timestamp_ms: number;
  timezone: string;
  work_date: string;
  day_status: DayStatus;
  expected: boolean;
  holiday_name: string | null;
  checked_in: boolean;
  checked_out: boolean;
  attendance: Attendance | null;
  available_check_ins: ('gps' | 'mission' | 'remote')[];
  rules: TodayRules;
  faceid_state?: FaceIdState;
}

export interface IntentResponse {
  intent_id: string;
  type: string;
  expires_at: string;
  distance_m: number | null;
  faceid_required: boolean;
  faceid_options: { challenge_id: string; public_key: Record<string, unknown> } | null;
}

export interface WorkSchedule {
  days_off: number[];
  remote_days: number[];
  effective_from?: string;
}

export interface WorkScheduleInfo {
  selected: boolean;
  locked: boolean;
  max_days_off_per_week: number;
  max_remote_days_per_week: number;
  working_days: number[];
  current: WorkSchedule | null;
  upcoming: WorkSchedule[];
}

export interface Leave {
  id: number;
  user_id?: number;
  user?: EmployeeSummary;
  start_date: string;
  end_date: string;
  note: string | null;
  created_by?: unknown;
}

export interface Holiday {
  id: number;
  date: string;
  name: string;
}

/** Employee identity in admin lists (email only for admins allowed to list users). */
export interface EmployeeSummary {
  id: number;
  first_name: string;
  last_name: string;
  job_title?: string | null;
  employee_type?: string | null;
  email?: string | null;
}

/** "Officer · ama@x.org": tells homonyms apart in admin lists. */
export function employeeDetail(u: Partial<EmployeeSummary> | null | undefined): string {
  if (!u) return '';
  return [u.job_title, u.email].filter(Boolean).join(' · ');
}

export interface DayRow {
  user: EmployeeSummary;
  day_status: DayStatus;
  expected: boolean;
  attendance: Attendance | null;
}

export interface RefusedAttempt {
  id: number;
  user_id: number;
  work_date: string;
  user?: EmployeeSummary;
  outcome: 'out_of_perimeter' | 'low_accuracy';
  distance_m: number | null;
  accuracy_m: number | null;
  created_at: string;
}

export const WEEKDAYS = [
  { n: 1, short: 'Mon', long: 'Monday' },
  { n: 2, short: 'Tue', long: 'Tuesday' },
  { n: 3, short: 'Wed', long: 'Wednesday' },
  { n: 4, short: 'Thu', long: 'Thursday' },
  { n: 5, short: 'Fri', long: 'Friday' },
  { n: 6, short: 'Sat', long: 'Saturday' },
  { n: 7, short: 'Sun', long: 'Sunday' },
] as const;

export function weekdayNames(days: number[] | undefined): string {
  if (!days || days.length === 0) return 'None';
  return days
    .slice()
    .sort((a, b) => a - b)
    .map((d) => WEEKDAYS.find((w) => w.n === d)?.long ?? String(d))
    .join(', ');
}

export const DAY_STATUS_LABEL: Record<DayStatus, string> = {
  working: 'Office day',
  remote: 'Remote day',
  day_off: 'Day off',
  holiday: 'Public holiday',
  leave: 'On leave',
  non_working: 'Non-working day',
};

export const CHECK_IN_TYPE_LABEL: Record<CheckInType, string> = {
  gps: 'At the office',
  mission: 'Mission',
  remote: 'Remote',
  admin_on_behalf: 'By an administrator',
};

/** "120 m", "3.2 km" – distances always come from the server. */
export function formatDistance(m: number | null | undefined): string {
  if (m === null || m === undefined || !Number.isFinite(m)) return '–';
  if (m < 1000) return `${Math.round(m)} m`;
  return `${(m / 1000).toFixed(1)} km`;
}

/** Check-out position label for history ("At the office", "3.2 km from the office", "Position not available"). */
export function checkOutPlace(a: Attendance): string | null {
  if (!a.check_out_at) return null;
  if (a.check_out_type === 'auto_midnight' || a.checkout_forgotten) return null;
  if (a.check_out_position_available === false) return 'Position not available';
  if (a.check_out_at_office) return 'At the office';
  if (typeof a.check_out_distance_m === 'number')
    return `${formatDistance(a.check_out_distance_m)} from the office`;
  return null;
}

const timeFmt = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: HOUR_CYCLE,
  timeZone: 'Africa/Accra',
});
const clockFmt = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: HOUR_CYCLE,
  second: '2-digit',
  timeZone: 'Africa/Accra',
});

/** HH:MM of a server timestamp in the office time zone. */
export function formatTime(iso: string | null | undefined): string {
  if (!iso) return '–';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '–' : timeFmt.format(d);
}

export function formatClock(d: Date): string {
  return clockFmt.format(d);
}

/** Mission status label for the employee and admins. */
export function missionLabel(s: Attendance['mission_status']): string | null {
  if (s === 'pending') return 'Waiting for approval';
  if (s === 'approved') return 'Approved';
  if (s === 'rejected') return 'Rejected';
  return null;
}
