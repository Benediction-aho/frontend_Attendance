import { createBrowserRouter, Navigate } from 'react-router';
import { AppLayout } from './AppLayout';
import { RequireAuth, RedirectIfSignedIn, Gate } from '../features/auth/guards';
import { SignInPage } from '../features/auth/SignInPage';
import { SignUpPage } from '../features/auth/SignUpPage';
import { SignUpSentPage } from '../features/auth/SignUpSentPage';
import { SuperAdminSignInPage } from '../features/auth/SuperAdminSignInPage';
import { RecoverPage } from '../features/auth/RecoverPage';
import { ConfirmEmailPage } from '../features/auth/ConfirmEmailPage';
import { WelcomeCodePage, WelcomeProfilePage } from '../features/auth/WelcomePages';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { ProfilePage } from '../features/profile/ProfilePage';
import { NotificationsPage } from '../features/notifications/NotificationsPage';
import { AdminHubPage } from '../features/admin/AdminHubPage';
import { RequestsPage } from '../features/admin/RequestsPage';
import { UsersPage } from '../features/admin/UsersPage';
import { UserDetailPage } from '../features/admin/UserDetailPage';
import { CreateUserPage } from '../features/admin/CreateUserPage';
import { SettingsPage } from '../features/admin/SettingsPage';
import { LogsPage } from '../features/admin/LogsPage';
import { useMe } from '../features/auth/useSession';
import { can, canManageAccounts, canViewLogs, isSuperAdmin } from '../lib/permissions';
import type { User } from '../lib/types';

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
