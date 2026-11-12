import { useQuery } from '@tanstack/react-query';
import { motion } from 'motion/react';
import { Link } from 'react-router';
import { api, qs } from '../../lib/api';
import { can } from '../../lib/permissions';
import { serverNow } from '../../lib/serverTime';
import type { Paginated, User } from '../../lib/types';
import { Card, CardBody, StatTile } from '../../ui/Card';
import { PageHeader } from '../../ui/PageHeader';
import { Skeleton } from '../../ui/Skeleton';
import { fadeUp, stagger } from '../../ui/motion';
import { useMe } from '../auth/useSession';
import { useUnreadCount } from '../notifications/useNotifications';

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
  // Server-corrected time, never the raw device clock.
  const now = serverNow();

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
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        <motion.div variants={fadeUp}>
          <Link
            to="/app/notifications"
            className="block rounded-card focus-visible:outline-offset-4"
          >
            <StatTile
              label="Unread notifications"
              value={unread.isPending ? <Skeleton className="h-8 w-10" /> : (unread.data ?? 0)}
            />
          </Link>
        </motion.div>
        {approver && (
          <motion.div variants={fadeUp}>
            <Link
              to="/app/admin/requests"
              className="block rounded-card focus-visible:outline-offset-4"
            >
              <StatTile
                label="Sign-up requests waiting"
                value={pending.isPending ? <Skeleton className="h-8 w-10" /> : (pending.data ?? 0)}
                hint={pending.data ? 'Review them now' : undefined}
              />
            </Link>
          </motion.div>
        )}
        <motion.div variants={fadeUp} className="sm:col-span-2 lg:col-span-3">
          <Card>
            <CardBody>
              <h2 className="text-base font-semibold text-ink-900">Attendance</h2>
              <p className="mt-1 text-sm text-ink-600">
                Check-in with GPS and Face ID arrives in the next update. Your profile and
                notifications are already available.
              </p>
              <Link
                to="/app/profile"
                className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-primary-700 hover:underline"
              >
                Review my profile
              </Link>
            </CardBody>
          </Card>
        </motion.div>
      </motion.div>
    </>
  );
}
