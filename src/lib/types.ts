export type Role = 'super_admin' | 'admin' | 'employee';
export type EmployeeType = 'intern' | 'employee' | 'other';
export type UserStatus = 'pending' | 'active' | 'blocked' | 'locked' | 'deleted';

export interface User {
  id: number;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  role: Role;
  employee_type: EmployeeType | null;
  /** The person's own words when the type is "other". */
  employee_type_other?: string | null;
  job_title: string | null;
  status: UserStatus;
  photo_url?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  birth_date?: string | null;
  address?: string | null;
  must_change_password?: boolean;
  permissions?: string[];
  code_pending?: boolean;
  code_expires_at?: string | null;
  approved_at?: string | null;
  last_login_at?: string | null;
  created_at?: string;
  /** Password policy from the API settings (when provided). */
  password_min_length?: number;
}

export interface PageMeta {
  current_page: number;
  last_page: number;
  total: number;
}

export interface Paginated<T> {
  data: T[];
  meta: PageMeta;
}

export interface LoginResponse {
  token: string;
  token_type: 'Bearer';
  must_change_password: boolean;
  user: User;
}

export type SettingType = 'int' | 'float' | 'bool' | 'time' | 'string' | 'int_list';
export type SettingGroup = 'attendance' | 'reports' | 'system' | 'security';

export interface Setting {
  key: string;
  label: string;
  group: SettingGroup;
  /** Configuration part the setting belongs to (decides who may manage it). */
  section?: 'attendance' | 'reports' | 'security';
  type: SettingType;
  /** Only super admins may change it (shown read-only to admins). */
  super_admin_only?: boolean;
  editable: boolean;
  value: unknown;
  default: unknown;
  scheduled: { value: unknown; effective_from: string }[];
  /** Bounds from the setting definition, when the API provides them. */
  min?: number | null;
  max?: number | null;
}

export interface SettingHistoryEntry {
  key: string;
  old_value: unknown;
  new_value: unknown;
  effective_from: string;
  changed_at: string;
  changed_by: { id: number; name: string } | null;
}

export interface AppNotification {
  id: string;
  data: { kind?: string; title?: string; body?: string; path?: string };
  read_at: string | null;
  created_at: string;
}

export interface NotificationPage extends Paginated<AppNotification> {
  meta: PageMeta & { unread_count: number };
}

export interface ActivityLog {
  id: number;
  created_at: string;
  type: 'action' | 'error' | 'security' | 'automatic';
  level: 'info' | 'warning' | 'error' | 'critical';
  event: string;
  description: string;
  user: { id: number; name: string; email: string; deleted: boolean } | null;
  actor: { id: number; name: string } | null;
  context: Record<string, unknown> | null;
  ip: string | null;
  device_id: string | null;
  user_agent: string | null;
}

export interface PermissionTier {
  key: string;
  label: string;
  description?: string;
}
