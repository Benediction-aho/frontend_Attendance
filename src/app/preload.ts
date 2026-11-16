/**
 * Makes the next screen instant: downloads its code early (route chunks) and warms
 * the data it will show (TanStack Query prefetch, which skips anything still fresh).
 * Display data only; check-in decisions are always taken by the server at the moment
 * of the check-in (useCheckIn never reads this cache).
 */
import { queryClient } from '../lib/queryClient';
import { hasAdminArea, tracksAttendance } from '../lib/permissions';
import type { User } from '../lib/types';
import type { Today } from '../lib/attendance';
import { isFreshThisRun } from '../lib/persist';
import { getToken, subscribe } from '../lib/session';
import {
  fetchToday,
  fetchSchedule,
  SCHEDULE_KEY,
  TODAY_KEY,
} from '../features/attendance/useAttendance';
import {
  ADMIN_DASHBOARD_KEY,
  MY_DASHBOARD_KEY,
  fetchAdminDashboard,
  fetchMyDashboard,
} from '../features/dashboard/useDashboard';
import { CLIENTS_KEY, TASKS_KEY, fetchClients, fetchTasks } from '../features/reports/useReports';
import { UNREAD_KEY, fetchUnread } from '../features/notifications/useNotifications';

type Preload = () => Promise<unknown>;
const routes = new Map<string, Preload>();
const home: Preload[] = [];

/** Registers the chunk loader of a route (router.tsx). */
export function registerRoute(path: string, preload: Preload): void {
  routes.set(path, preload);
}

/** Registers a chunk needed by the first screen after sign-in (Today, Dashboard). */
export function registerHome(preload: Preload): void {
  home.push(preload);
}

export function preloadHome(): void {
  home.forEach((p) => void p());
}

/** Longest registered route that `path` starts with. */
export function routeFor(path: string): string | undefined {
  let best: string | undefined;
  for (const r of routes.keys()) {
    if ((path === r || path.startsWith(`${r}/`)) && (!best || r.length > best.length)) best = r;
  }
  return best;
}

const prefetch = (queryKey: readonly unknown[], queryFn: () => Promise<unknown>) =>
  void queryClient.prefetchQuery({ queryKey, queryFn, staleTime: 30_000 });

/**
 * My work is refused by the server before today's check-in (and the refusal sends the
 * user to Today): prefetch it only once the server said the user is checked in.
 */
function checkedInToday(): boolean {
  const t = queryClient.getQueryState<Today>(TODAY_KEY);
  return Boolean(t?.data?.checked_in && isFreshThisRun(t.dataUpdatedAt));
}

/** Data shown by the screen at `path` (only what the user may see). */
export function prefetchData(path: string, user: User | undefined): void {
  if (!user) return;
  const employee = tracksAttendance(user);
  if (path === '/app') {
    if (employee) {
      prefetch(TODAY_KEY, fetchToday);
      prefetch(MY_DASHBOARD_KEY, fetchMyDashboard);
    } else if (hasAdminArea(user)) prefetch(ADMIN_DASHBOARD_KEY, fetchAdminDashboard);
  } else if (path === '/app/work' && employee && checkedInToday()) {
    prefetch(TASKS_KEY, fetchTasks);
    prefetch(CLIENTS_KEY, fetchClients);
  } else if (path === '/app/notifications') {
    prefetch(UNREAD_KEY, fetchUnread);
  } else if (path.startsWith('/app/attendance/schedule') && employee) {
    prefetch(SCHEDULE_KEY, fetchSchedule);
  }
}

/** Hover, focus or touch on a menu entry: code and data of that screen. */
export function preloadPath(path: string, user: User | undefined): void {
  const r = routeFor(path);
  if (r) void routes.get(r)?.();
  prefetchData(path, user);
}

let warmedFor: number | null = null;
// Signing out (or a session ended by the server) lets the next sign-in warm up again.
subscribe(() => {
  if (!getToken()) warmedFor = null;
});

/**
 * After sign-in (or opening the app signed in): the main data and the code of the
 * screens people open next, fetched quietly once the first screen is on its way.
 */
export function warmAfterSignIn(user: User | undefined, nextPaths: string[]): void {
  if (!user || warmedFor === user.id) return;
  warmedFor = user.id;
  preloadHome();
  prefetchData('/app', user);
  prefetch(UNREAD_KEY, fetchUnread);
  const idle = (cb: () => void) =>
    typeof requestIdleCallback === 'function'
      ? requestIdleCallback(cb, { timeout: 2500 })
      : setTimeout(cb, 1200);
  idle(() => {
    if (tracksAttendance(user)) prefetchData('/app/work', user);
    for (const p of nextPaths) {
      const r = routeFor(p);
      if (r) void routes.get(r)?.();
    }
  });
}

/** Test helper. */
export function __resetPreload(): void {
  routes.clear();
  home.length = 0;
  warmedFor = null;
}
