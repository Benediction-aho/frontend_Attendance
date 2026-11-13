import { useQuery } from '@tanstack/react-query';
import { motion } from 'motion/react';
import { Link } from 'react-router';
import { api, qs } from '../../lib/api';
import { can, canViewAttendance } from '../../lib/permissions';
import { serverNow } from '../../lib/serverTime';
import type { Paginated, User } from '../../lib/types';
import { StatTile } from '../../ui/Card';
import { PageHeader } from '../../ui/PageHeader';
import { Skeleton } from '../../ui/Skeleton';
import { fadeUp, stagger } from '../../ui/motion';
import { useMe } from '../auth/useSession';
import { useUnreadCount } from '../notifications/useNotifications';
import { useDay } from '../attendance/admin/useDay';
import { isoDay } from '../../lib/format';

function greeting(hour: number) {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

const accraHour = (d: Date) =>
  Number(
    new Intl.DateTimeFormat('en-GB', {
      hour: 'numeric',
      hour12: false,
      timeZone: 'Africa/Accra',
    }).format(d),
  );
const accraDate = (d: Date) =>
  new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'Africa/Accra',
  }).format(d);

export function DashboardPage() {
  const { data: me } = useMe();
  const unread = useUnreadCount();
  const approver = can(me, 'approve_users');
  const pending = useQuery({
    queryKey: ['admin', 'users', 'pending-count'],
    queryFn: () =>
      api.get<Paginated<User>>(`/admin/users${qs({ status: 'pending', per_page: 1 })}`),
    enabled: approver,
    select: (r) => r.meta.total,
  });
  const missions = useQuery({
    queryKey: ['admin', 'missions', 'pending-count'],
    queryFn: () => api.get<Paginated<unknown>>('/admin/attendance/missions?status=pending'),
    enabled: can(me, 'approve_mission_checkins'),
    select: (r) => r.meta.total,
  });
  const devices = useQuery({
    queryKey: ['admin', 'faceid', 'pending-count'],
    queryFn: () => api.get<Paginated<unknown>>('/admin/faceid/credentials?status=pending'),
    enabled: can(me, 'approve_faceid_devices'),
    select: (r) => r.meta.total,
  });
  // Server-corrected time, never the raw device clock.
  const now = serverNow();
  // Figures as returned by the day list (no business rule computed here).
  const day = useDay(isoDay(now), canViewAttendance(me));
  const rows = day.data?.data ?? [];
  const expected = rows.filter((r) => r.expected).length;
  const present = rows.filter((r) => r.attendance).length;
  const late = rows.filter((r) => r.attendance?.is_late === true).length;
  const showLate = rows.some((r) => typeof r.attendance?.is_late === 'boolean');

  return (
    <>
      <PageHeader
        title={`${greeting(accraHour(now))}, ${me?.first_name ?? ''}`}
        description={accraDate(now)}
      />
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="grid items-stretch gap-4 sm:grid-cols-2"
      >
        {canViewAttendance(me) && (
          <motion.div variants={fadeUp} className="h-full">
            <Link
              to="/app/admin/attendance"
              className="block h-full rounded-card focus-visible:outline-offset-4"
              data-testid="attendance-tile"
            >
              <StatTile
                label="Checked in today"
                value={
                  day.isPending ? <Skeleton className="h-8 w-16" /> : `${present} / ${expected}`
                }
                hint={!day.isPending && showLate ? `Late ${late}` : undefined}
                cta="Open today's attendance"
              />
            </Link>
          </motion.div>
        )}
        {approver && (
          <motion.div variants={fadeUp} className="h-full">
            <Link
              to="/app/admin/requests"
              className="block h-full rounded-card focus-visible:outline-offset-4"
            >
              <StatTile
                label="Sign-up requests waiting"
                value={pending.isPending ? <Skeleton className="h-8 w-10" /> : (pending.data ?? 0)}
                highlight={Boolean(pending.data)}
                hint={pending.data ? 'Waiting for your approval.' : 'Nothing to review.'}
                cta={pending.data ? 'Review requests' : undefined}
              />
            </Link>
          </motion.div>
        )}
        {can(me, 'approve_mission_checkins') && (
          <motion.div variants={fadeUp} className="h-full">
            <Link
              to="/app/admin/attendance/missions"
              className="block h-full rounded-card focus-visible:outline-offset-4"
            >
              <StatTile
                label="Mission check-ins waiting"
                value={
                  missions.isPending ? <Skeleton className="h-8 w-10" /> : (missions.data ?? 0)
                }
                highlight={Boolean(missions.data)}
                hint={
                  missions.data ? 'Employees working outside the office.' : 'Nothing to review.'
                }
                cta={missions.data ? 'Review missions' : undefined}
              />
            </Link>
          </motion.div>
        )}
        {can(me, 'approve_faceid_devices') && (
          <motion.div variants={fadeUp} className="h-full">
            <Link
              to="/app/admin/faceid-devices"
              className="block h-full rounded-card focus-visible:outline-offset-4"
            >
              <StatTile
                label="Face ID devices waiting"
                value={devices.isPending ? <Skeleton className="h-8 w-10" /> : (devices.data ?? 0)}
                highlight={Boolean(devices.data)}
                hint={devices.data ? 'New phones to approve.' : 'Nothing to review.'}
                cta={devices.data ? 'Review devices' : undefined}
              />
            </Link>
          </motion.div>
        )}
      </motion.div>
      {(unread.data ?? 0) > 0 && (
        <Link
          to="/app/notifications"
          className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-primary-700 hover:underline"
        >
          {unread.data} unread notification{unread.data === 1 ? '' : 's'}
        </Link>
      )}
    </>
  );
}
