import { createBrowserRouter, Navigate } from 'react-router';
import { AppLayout } from './AppLayout';
import { RequireAuth, RedirectIfSignedIn, Gate } from '../features/auth/guards';
import { SignInPage } from '../features/auth/SignInPage';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { useMe } from '../features/auth/useSession';
import { lazyPage } from './lazyPage';
import { can, canManageAccounts, canViewLogs, isSuperAdmin } from '../lib/permissions';
import type { User } from '../lib/types';

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

const anyAdmin = (u: User | undefined) =>
  can(u, 'approve_users') || canManageAccounts(u) || canViewLogs(u);

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
  { path: '/confirm-email', element: <ConfirmEmailPage /> },
  {
    element: <RequireAuth />,
    children: [
      { path: '/welcome/code', element: <WelcomeCodePage /> },
      { path: '/welcome/profile', element: <WelcomeProfilePage /> },
    ],
  },
  {
    element: <RequireAuth />,
    children: [
      {
        path: '/app',
        element: <AppLayout />,
        children: [
          { index: true, element: <DashboardPage /> },
          { path: 'profile', element: <ProfilePage /> },
          { path: 'notifications', element: <NotificationsPage /> },
          {
            path: 'admin',
            element: (
              <Allowed check={anyAdmin}>
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
          {
            path: 'admin/settings',
            element: (
              <Allowed check={isSuperAdmin}>
                <SettingsPage />
              </Allowed>
            ),
          },
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
