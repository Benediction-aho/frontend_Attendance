/** Shapes of GET /me/dashboard and GET /admin/dashboard (phase 6). Every figure is server-computed. */
export type WeeklyReportStatus = 'submitted' | 'not_open' | 'open' | 'missing' | 'not_expected';

export interface MyDashboard {
  server_time: string;
  work_date: string;
  today: {
    day_status: string;
    expected: boolean;
    checked_in: boolean;
    checked_out: boolean;
    check_in_at: string | null;
    check_in_type: string | null;
    is_late: boolean | null;
    mission_status: string | null;
    tasks_planned: number;
    tasks_done: number;
    clients_count: number;
  };
  week: {
    week_start: string;
    week_end: string;
    presence_days: number;
    expected_days_so_far: number;
    late_count: number;
    tasks_planned: number;
    tasks_done: number;
    clients_count: number;
    weekly_report: {
      status: WeeklyReportStatus;
      expected: boolean;
      window_date: string | null;
      opens_at: string | null;
      deadline: string | null;
      submitted_at: string | null;
      is_late: boolean | null;
      version: number | null;
    };
  };
  month: {
    period_start: string;
    period_end: string;
    presence_days: number;
    late_count: number;
    clients_count: number;
  };
}

/** Any section or field may be absent when the viewer lacks the tier (never 0). */
export interface AdminDashboard {
  server_time: string;
  work_date: string;
  today?: {
    expected?: number;
    checked_in?: number;
    missing?: number;
    on_leave?: number;
    remote?: number;
    /** Everyone not expected today (leave + day off + holiday). */
    not_working?: number;
    /** Distinct counts (UX6-03), when the API sends them. */
    day_off?: number;
    holiday?: number;
    /** Checked in although not expected (day off, leave, holiday). */
    checked_in_not_expected?: number;
    late?: number;
    refused_attempts?: number;
    missions_pending?: number;
  };
  week?: {
    week_start: string;
    week_end?: string;
    window_date?: string;
    closes_at?: string;
    closed?: boolean;
    weekly_reports_received?: number;
    weekly_reports_expected?: number;
  };
  month?: {
    period_start: string;
    period_end: string;
    to_date?: string;
    late_count?: number;
    clients_count?: number;
    services_top?: { service: string; service_key: string; quantity: number }[];
  };
  pending?: {
    sign_up_requests?: number;
    faceid_devices?: number;
    missions?: number;
  };
}
