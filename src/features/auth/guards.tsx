import { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';
import { onPasswordChangeRequired } from '../../lib/api';
import { queryClient } from '../../lib/queryClient';
import type { User } from '../../lib/types';
import { Button } from '../../ui/Button';
import { Logo } from '../../ui/Logo';
import { Spinner } from '../../ui/Spinner';
import { ME_KEY, useMe, useToken } from './useSession';

function FullScreen({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4 text-center">
      {children}
    </div>
  );
}

function Loading() {
  return (
    <FullScreen>
      <Logo variant="signin" />
      <span className="text-primary-600">
        <Spinner label="Loading your account" />
      </span>
    </FullScreen>
  );
}

/** Requires a device token and a loaded profile. Never signs out on network/5xx errors. */
export function RequireAuth() {
  const token = useToken();
  const location = useLocation();
  const me = useMe();

  useEffect(
    () =>
      onPasswordChangeRequired(() => {
        queryClient.setQueryData<User>(ME_KEY, (u) =>
          u ? { ...u, must_change_password: true } : u,
        );
      }),
    [],
  );

  if (!token) return <Navigate to="/sign-in" replace state={{ from: location.pathname }} />;
  if (me.isPending) return <Loading />;
  if (me.isError || !me.data)
    return (
      <FullScreen>
        <Logo variant="signin" />
        <div>
          <p className="font-semibold text-ink-800">We could not load your account.</p>
          <p className="mt-1 text-sm text-ink-500">
            Check your connection. You are still signed in.
          </p>
        </div>
        <Button onClick={() => void me.refetch()} loading={me.isFetching}>
          Try again
        </Button>
      </FullScreen>
    );
  const mustChange = me.data.must_change_password === true;
  if (mustChange && location.pathname !== '/welcome/code')
    return <Navigate to="/welcome/code" replace />;
  return <Outlet />;
}

/** Public auth pages: a signed-in user goes straight to the app. */
export function RedirectIfSignedIn() {
  const token = useToken();
  if (token) return <Navigate to="/app" replace />;
  return <Outlet />;
}

/** Display-only gate (the server re-checks every request). */
export function Gate({ allowed, children }: { allowed: boolean; children: React.ReactNode }) {
  if (!allowed) return <Navigate to="/app" replace />;
  return <>{children}</>;
}
