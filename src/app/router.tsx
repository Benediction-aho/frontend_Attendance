import { createBrowserRouter, Navigate, useParams } from 'react-router';
import { AppPrefixRedirect } from './AppPrefixRedirect';
import { RequireAuth, RedirectIfSignedIn, Gate } from '../features/auth/guards';
import { SignInPage } from '../features/auth/SignInPage';
import { useMe } from '../features/auth/useSession';
import { lazyPage } from './lazyPage';
import { registerHome, registerRoute } from './preload';
import {
  can,
  canManageAccounts,
  canSeeWeeklyPdfs,
  canViewAttendance,
  canViewReports,
  canViewLogs,
  hasAdminArea,
  isSuperAdmin,
  settingsSections,
  tracksAttendance,
} from '../lib/permissions';
import { isSettingsSection } from '../lib/settings';
import type { User } from '../lib/types';

// First screen after sign-in: split from the sign-in bundle, preloaded as soon as a
// session exists (main.tsx) and precached by the service worker.
const TodayPage = lazyPage(() => import('../features/attendance/TodayPage'), 'TodayPage');
const DashboardPage = lazyPage(
  () => import('../features/dashboard/DashboardPage'),
  'DashboardPage',
);
// The signed-in shell (menu, icons) is not needed by the sign-in screen either.
const AppLayout = lazyPage(() => import('./AppLayout'), 'AppLayout');
registerHome(AppLayout.preload);
registerHome(TodayPage.preload);
registerHome(DashboardPage.preload);

const SignUpPage = lazyPage(() => import('../features/auth/SignUpPage'), 'SignUpPage');
const SignUpSentPage = lazyPage(() => import('../features/auth/SignUpSentPage'), 'SignUpSentPage');
const SuperAdminSignInPage = lazyPage(
  () => import('../features/auth/SuperAdminSignInPage'),
  'SuperAdminSignInPage',
);
const RecoverPage = lazyPage(() => import('../features/auth/RecoverPage'), 'RecoverPage');
const ConfirmEmailPage = lazyPage(
  () => import('../features/auth/ConfirmEmailPage'),
  'ConfirmEmailPage',
);
const WelcomeCodePage = lazyPage(() => import('../features/auth/WelcomePages'), 'WelcomeCodePage');
const WelcomeProfilePage = lazyPage(
  () => import('../features/auth/WelcomePages'),
  'WelcomeProfilePage',
);
const ProfilePage = lazyPage(() => import('../features/profile/ProfilePage'), 'ProfilePage');
const NotificationsPage = lazyPage(
  () => import('../features/notifications/NotificationsPage'),
  'NotificationsPage',
);
const AdminHubPage = lazyPage(() => import('../features/admin/AdminHubPage'), 'AdminHubPage');
const RequestsPage = lazyPage(() => import('../features/admin/RequestsPage'), 'RequestsPage');
const UsersPage = lazyPage(() => import('../features/admin/UsersPage'), 'UsersPage');
const UserDetailPage = lazyPage(() => import('../features/admin/UserDetailPage'), 'UserDetailPage');
const CreateUserPage = lazyPage(() => import('../features/admin/CreateUserPage'), 'CreateUserPage');
const SettingsPage = lazyPage(() => import('../features/admin/SettingsPage'), 'SettingsPage');
const LogsPage = lazyPage(() => import('../features/admin/LogsPage'), 'LogsPage');
const WelcomeFaceIdPage = lazyPage(
  () => import('../features/auth/WelcomePages'),
  'WelcomeFaceIdPage',
);
const MyHistoryPage = lazyPage(
  () => import('../features/attendance/MyAttendancePages'),
  'MyHistoryPage',
);
const SchedulePage = lazyPage(
  () => import('../features/attendance/MyAttendancePages'),
  'SchedulePage',
);
const AdminAttendancePage = lazyPage(
  () => import('../features/attendance/admin/AdminAttendancePage'),
  'AdminAttendancePage',
);
const EmployeeAttendancePage = lazyPage(
  () => import('../features/attendance/admin/EmployeeAttendancePage'),
  'EmployeeAttendancePage',
);
const MissionsPage = lazyPage(
  () => import('../features/attendance/admin/MissionsPage'),
  'MissionsPage',
);
const AttemptsPage = lazyPage(
  () => import('../features/attendance/admin/MissionsPage'),
  'AttemptsPage',
);
const LeavePage = lazyPage(() => import('../features/attendance/admin/LeavePage'), 'LeavePage');
const FaceIdDevicesPage = lazyPage(
  () => import('../features/faceid/FaceIdDevicesPage'),
  'FaceIdDevicesPage',
);
const WorkPage = lazyPage(() => import('../features/reports/WorkPage'), 'WorkPage');
const DailyReportPage = lazyPage(
  () => import('../features/reports/ReportPages'),
  'DailyReportPage',
);
const WeeklyReportPage = lazyPage(
  () => import('../features/reports/ReportPages'),
  'WeeklyReportPage',
);
const AdminDailyReportsPage = lazyPage(
  () => import('../features/reports/admin/AdminReportsPages'),
  'AdminDailyReportsPage',
);
const AdminWeeklyReportsPage = lazyPage(
  () => import('../features/reports/admin/AdminReportsPages'),
  'AdminWeeklyReportsPage',
);
const AdminSubmissionPage = lazyPage(
  () => import('../features/reports/admin/AdminReportsPages'),
  'AdminSubmissionPage',
);
const AdminUserWeeklyPage = lazyPage(
  () => import('../features/reports/admin/AdminReportsPages'),
  'AdminUserWeeklyPage',
);
const ActivityReportsPage = lazyPage(
  () => import('../features/reports/ActivityReports'),
  'ActivityReportsPage',
);
const AdminActivityReportsPage = lazyPage(
  () => import('../features/reports/admin/AdminActivityReports'),
  'AdminActivityReportsPage',
);
const AdminActivityReportPage = lazyPage(
  () => import('../features/reports/admin/AdminActivityReports'),
  'AdminActivityReportPage',
);
const InstallPage = lazyPage(() => import('../features/pwa/InstallGuide'), 'InstallPage');

// Menu entries: their code is fetched on hover, focus or touch (AppLayout).
registerRoute('/app/attendance/history', MyHistoryPage.preload);
registerRoute('/app/attendance/schedule', SchedulePage.preload);
registerRoute('/app/notifications', NotificationsPage.preload);
registerRoute('/app/work', WorkPage.preload);
registerRoute('/app/reports/daily', DailyReportPage.preload);
registerRoute('/app/reports/weekly', WeeklyReportPage.preload);
registerRoute('/app/reports/activity', ActivityReportsPage.preload);
registerRoute('/app/profile', ProfilePage.preload);
registerRoute('/app/admin', AdminHubPage.preload);
registerRoute('/app/admin/attendance', AdminAttendancePage.preload);
registerRoute('/app/admin/reports', AdminDailyReportsPage.preload);
registerRoute('/app/admin/faceid-devices', FaceIdDevicesPage.preload);
registerRoute('/app/admin/leave', LeavePage.preload);
registerRoute('/app/admin/requests', RequestsPage.preload);
registerRoute('/app/admin/users', UsersPage.preload);
registerRoute('/app/admin/settings', SettingsPage.preload);
registerRoute('/app/admin/logs', LogsPage.preload);

/**
 * Everyone who checks in (employees, and admins from their start date) lands on today's
 * check-in; other staff on their dashboard.
 */
function HomePage() {
  const { data } = useMe();
  return tracksAttendance(data) ? <TodayPage /> : <DashboardPage />;
}

/** /app/attendance (notification target): today for employees, the day list for staff. */
function AttendanceEntry() {
  const { data } = useMe();
  if (tracksAttendance(data)) return <Navigate to="/app" replace />;
  return <Navigate to="/app/admin/attendance" replace />;
}

function Allowed({
  check,
  children,
}: {
  check: (u: User | undefined) => boolean;
  children: React.ReactNode;
}) {
  const { data } = useMe();
  return <Gate allowed={check(data)}>{children}</Gate>;
}

/** /app/admin/settings → the first part the user may manage (or "no access"). */
function SettingsIndex() {
  const { data } = useMe();
  const first = settingsSections(data)[0];
  return first ? (
    <Navigate to={`/app/admin/settings/${first}`} replace />
  ) : (
    <Gate allowed={false}>{null}</Gate>
  );
}

function SettingsPart() {
  const { part } = useParams();
  const { data } = useMe();
  // Unknown part (old or mistyped link): back to the settings the user may open (FIN-06).
  if (!isSettingsSection(part)) return <Navigate to="/app/admin/settings" replace />;
  const ok = settingsSections(data).includes(part);
  return <Gate allowed={ok}>{ok && <SettingsPage />}</Gate>;
}

const leaveAdmin = (u: User | undefined) => can(u, 'manage_leaves');

export const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/app" replace /> },
  {
    element: <RedirectIfSignedIn />,
    children: [
      { path: '/sign-in', element: <SignInPage /> },
      { path: '/sign-in/super-admin', element: <SuperAdminSignInPage /> },
      { path: '/sign-up', element: <SignUpPage /> },
      { path: '/sign-up/sent', element: <SignUpSentPage /> },
      { path: '/recover', element: <RecoverPage /> },
    ],
  },
  { path: '/login', element: <Navigate to="/sign-in" replace /> },
  // Older email links without the /app prefix (UX34-05).
  { path: '/admin/*', element: <AppPrefixRedirect /> },
  { path: '/confirm-email', element: <ConfirmEmailPage /> },
  {
    element: <RequireAuth />,
    children: [
      { path: '/welcome/code', element: <WelcomeCodePage /> },
      { path: '/welcome/profile', element: <WelcomeProfilePage /> },
      { path: '/welcome/faceid', element: <WelcomeFaceIdPage /> },
    ],
  },
  {
    element: <RequireAuth />,
    children: [
      {
        path: '/app',
        element: <AppLayout />,
        children: [
          { index: true, element: <HomePage /> },
          { path: 'install', element: <InstallPage /> },
          { path: 'attendance', element: <AttendanceEntry /> },
          {
            path: 'attendance/history',
            element: (
              <Allowed check={tracksAttendance}>
                <MyHistoryPage />
              </Allowed>
            ),
          },
          {
            path: 'attendance/schedule',
            element: (
              <Allowed check={tracksAttendance}>
                <SchedulePage />
              </Allowed>
            ),
          },
          {
            path: 'admin/attendance',
            element: (
              <Allowed check={canViewAttendance}>
                <AdminAttendancePage />
              </Allowed>
            ),
          },
          {
            path: 'admin/attendance/users/:id',
            element: (
              <Allowed check={canViewAttendance}>
                <EmployeeAttendancePage />
              </Allowed>
            ),
          },
          {
            path: 'admin/attendance/missions',
            element: (
              <Allowed check={(u) => can(u, 'approve_mission_checkins')}>
                <MissionsPage />
              </Allowed>
            ),
          },
          {
            path: 'admin/attendance/attempts',
            element: (
              <Allowed check={(u) => can(u, 'view_lateness')}>
                <AttemptsPage />
              </Allowed>
            ),
          },
          {
            path: 'admin/leave',
            element: (
              <Allowed check={(u) => isSuperAdmin(u) || leaveAdmin(u)}>
                <LeavePage />
              </Allowed>
            ),
          },
          {
            path: 'admin/faceid-devices',
            element: (
              <Allowed check={(u) => can(u, 'approve_faceid_devices')}>
                <FaceIdDevicesPage />
              </Allowed>
            ),
          },
          {
            path: 'work',
            element: (
              <Allowed check={tracksAttendance}>
                <WorkPage />
              </Allowed>
            ),
          },
          {
            path: 'reports/daily',
            element: (
              <Allowed check={tracksAttendance}>
                <DailyReportPage />
              </Allowed>
            ),
          },
          {
            path: 'reports/weekly',
            element: (
              <Allowed check={tracksAttendance}>
                <WeeklyReportPage />
              </Allowed>
            ),
          },
          {
            path: 'reports/activity',
            element: (
              <Allowed check={tracksAttendance}>
                <ActivityReportsPage />
              </Allowed>
            ),
          },
          {
            path: 'admin/reports/activity',
            element: (
              <Allowed check={canSeeWeeklyPdfs}>
                <AdminActivityReportsPage />
              </Allowed>
            ),
          },
          {
            path: 'admin/reports/activity/:id',
            element: (
              <Allowed check={canSeeWeeklyPdfs}>
                <AdminActivityReportPage />
              </Allowed>
            ),
          },
          {
            path: 'admin/reports',
            element: (
              <Allowed check={canSeeWeeklyPdfs}>
                <AdminDailyReportsPage />
              </Allowed>
            ),
          },
          {
            path: 'admin/reports/weekly',
            element: (
              <Allowed check={canSeeWeeklyPdfs}>
                <AdminWeeklyReportsPage />
              </Allowed>
            ),
          },
          {
            path: 'admin/reports/weekly/submissions/:id',
            element: (
              <Allowed check={canSeeWeeklyPdfs}>
                <AdminSubmissionPage />
              </Allowed>
            ),
          },
          {
            path: 'admin/reports/users/:id/weekly',
            element: (
              <Allowed check={canViewReports}>
                <AdminUserWeeklyPage />
              </Allowed>
            ),
          },
          { path: 'profile', element: <ProfilePage /> },
          { path: 'notifications', element: <NotificationsPage /> },
          {
            path: 'admin',
            element: (
              <Allowed check={hasAdminArea}>
                <AdminHubPage />
              </Allowed>
            ),
          },
          {
            path: 'admin/requests',
            element: (
              <Allowed check={(u) => can(u, 'approve_users')}>
                <RequestsPage />
              </Allowed>
            ),
          },
          {
            path: 'admin/users',
            element: (
              <Allowed check={canManageAccounts}>
                <UsersPage />
              </Allowed>
            ),
          },
          {
            path: 'admin/users/new',
            element: (
              <Allowed check={(u) => can(u, 'create_users')}>
                <CreateUserPage />
              </Allowed>
            ),
          },
          {
            path: 'admin/users/:id',
            element: (
              <Allowed check={canManageAccounts}>
                <UserDetailPage />
              </Allowed>
            ),
          },
          { path: 'admin/settings', element: <SettingsIndex /> },
          { path: 'admin/settings/:part', element: <SettingsPart /> },
          {
            path: 'admin/logs',
            element: (
              <Allowed check={canViewLogs}>
                <LogsPage />
              </Allowed>
            ),
          },
          { path: '*', element: <Navigate to="/app" replace /> },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/app" replace /> },
]);
