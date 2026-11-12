import { useEffect } from 'react';
import { Link, Navigate, Outlet, useLocation } from 'react-router';
import { ApiError, onPasswordChangeRequired } from '../../lib/api';
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

export const STARTUP_RETRY_MS = 5000;

function startupProblem(e: unknown): string {
  const offline = globalThis.navigator?.onLine === false;
  if (offline || (e instanceof ApiError && e.kind === 'network'))
    return 'You appear to be offline. Check your connection.';
  return 'The service is temporarily unavailable.';
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

  const failed = me.isError || (!me.isPending && !me.data);
  const { refetch } = me;
  // Start-up failure: retry by itself every few seconds and as soon as the device is back online.
  useEffect(() => {
    if (!failed || !token) return;
    const id = setInterval(() => void refetch(), STARTUP_RETRY_MS);
    const onOnline = () => void refetch();
    window.addEventListener('online', onOnline);
    return () => {
      clearInterval(id);
      window.removeEventListener('online', onOnline);
    };
  }, [failed, token, refetch]);

  if (!token) return <Navigate to="/sign-in" replace state={{ from: location.pathname }} />;
  if (me.isPending) return <Loading />;
  if (me.isError || !me.data)
    return (
      <FullScreen>
        <Logo variant="signin" />
        <div>
          <p className="font-semibold text-ink-800">We could not load your account.</p>
          <p className="mt-1 text-sm text-ink-500">
            {startupProblem(me.error)} You are still signed in. We will try again automatically.
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

/** Shown when a link opens a page the user's permissions do not cover. */
export function NoAccess() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-16 text-center">
      <h1 className="text-xl font-semibold text-ink-900">You do not have access to this page</h1>
      <p className="text-sm text-ink-500">
        Your account does not include this section. If you need it, ask a super admin to update your
        permissions.
      </p>
      <Link
        to="/app"
        className="mt-2 inline-flex min-h-11 items-center rounded-control bg-primary-600 px-5 font-semibold text-white hover:bg-primary-700"
      >
        Go to Home
      </Link>
    </div>
  );
}

/** Display-only gate (the server re-checks every request). */
export function Gate({ allowed, children }: { allowed: boolean; children: React.ReactNode }) {
  if (!allowed) return <NoAccess />;
  return <>{children}</>;
}
