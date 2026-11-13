import { motion } from 'motion/react';
import { Link } from 'react-router';
import { serverNow } from '../../lib/serverTime';
import { Alert } from '../../ui/Alert';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { EmptyState } from '../../ui/EmptyState';
import { PageHeader } from '../../ui/PageHeader';
import { Skeleton } from '../../ui/Skeleton';
import { fadeUp, stagger } from '../../ui/motion';
import { useMe } from '../auth/useSession';
import { useUnreadCount } from '../notifications/useNotifications';
import { Figures, Section, type FigureItem } from './parts';
import { periodLabel, ratio } from './logic';
import { useAdminDashboard } from './useDashboard';
import { formatDate, formatDateTime } from '../../lib/format';
import type { AdminDashboard } from './types';

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

function TodaySection({ t }: { t: NonNullable<AdminDashboard['today']> }) {
  const items: FigureItem[] = [
    {
      label: 'Checked in',
      value: ratio(t.checked_in, t.expected),
      hint: 'Of expected today',
      testId: 'fig-checked-in',
    },
    { label: 'Not checked in yet', value: t.missing, attention: (t.missing ?? 0) > 0 },
    { label: 'Late', value: t.late, attention: (t.late ?? 0) > 0 },
    { label: 'On leave', value: t.on_leave },
    { label: 'Remote', value: t.remote },
    { label: 'Day off', value: t.not_working },
    {
      label: 'Missions to approve',
      value: t.missions_pending,
      to: t.missions_pending ? '/app/admin/attendance/missions' : undefined,
      attention: (t.missions_pending ?? 0) > 0,
    },
    {
      label: 'Refused check-ins',
      value: t.refused_attempts,
      to: t.refused_attempts ? '/app/admin/attendance/attempts' : undefined,
    },
  ];
  return (
    <Section
      title="Today"
      action={{ to: '/app/admin/attendance', label: "Open today's attendance" }}
      testId="admin-today"
    >
      <Figures items={items} />
    </Section>
  );
}

function WeekSection({ w }: { w: NonNullable<AdminDashboard['week']> }) {
  const value = ratio(w.weekly_reports_received, w.weekly_reports_expected);
  return (
    <Section
      title="Weekly reports"
      description={`Week of ${formatDate(w.week_start)}`}
      action={{
        to: `/app/admin/reports/weekly?date=${w.week_start}`,
        label: 'Open weekly reports',
      }}
      testId="admin-week"
    >
      <Figures
        cols={2}
        items={[
          { label: 'Received', value, testId: 'fig-weekly' },
          {
            label: w.closed ? 'Closed' : 'Closes',
            value:
              w.closes_at === undefined ? undefined : (
                <span className="text-base">{formatDateTime(w.closes_at)}</span>
              ),
          },
        ]}
      />
    </Section>
  );
}

function MonthSection({ m }: { m: NonNullable<AdminDashboard['month']> }) {
  const top = m.services_top ?? [];
  return (
    <Section
      title="This month"
      description={`Report period ${periodLabel(m.period_start, m.period_end)}`}
      testId="admin-month"
    >
      <Figures
        cols={2}
        items={[
          { label: 'Late arrivals', value: m.late_count },
          { label: 'Clients served', value: m.clients_count },
        ]}
      />
      {m.services_top && (
        <div className="border-t border-ink-100 px-5 py-3">
          <p className="text-xs text-ink-500">Top services</p>
          {top.length === 0 ? (
            <p className="mt-1 text-sm text-ink-600">No service recorded yet.</p>
          ) : (
            <table className="mt-1 w-full text-sm" data-testid="services-top">
              <tbody className="divide-y divide-ink-100">
                {top.map((s) => (
                  <tr key={s.service_key}>
                    <td className="py-2 pr-3 wrap-anywhere text-ink-800">{s.service}</td>
                    <td className="py-2 text-right font-semibold tabular-nums text-ink-900">
                      {s.quantity}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </Section>
  );
}

function PendingSection({ p }: { p: NonNullable<AdminDashboard['pending']> }) {
  const rows = [
    { n: p.sign_up_requests, label: 'Sign-up requests', to: '/app/admin/requests' },
    { n: p.faceid_devices, label: 'Face ID devices', to: '/app/admin/faceid-devices' },
    { n: p.missions, label: 'Mission check-ins', to: '/app/admin/attendance/missions' },
  ].filter((r): r is { n: number; label: string; to: string } => r.n !== undefined);
  if (rows.length === 0) return null;
  const total = rows.reduce((a, r) => a + r.n, 0);
  return (
    <Section
      title="Waiting for you"
      description={total === 0 ? 'Nothing to review.' : undefined}
      testId="admin-pending"
    >
      <ul className="divide-y divide-ink-100">
        {rows.map((r) => (
          <li key={r.label}>
            <Link
              to={r.to}
              className="flex min-h-12 items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-surface-muted focus-visible:outline-offset-[-2px]"
            >
              <span className="text-sm text-ink-800">{r.label}</span>
              <span
                className={
                  r.n > 0
                    ? 'rounded-full bg-secondary-50 px-2.5 py-0.5 text-sm font-semibold tabular-nums text-secondary-700'
                    : 'text-sm tabular-nums text-ink-500'
                }
              >
                {r.n > 0 ? `${r.n} to review` : 'None'}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Section>
  );
}

export function DashboardPage() {
  const { data: me } = useMe();
  const unread = useUnreadCount();
  const q = useAdminDashboard();
  // Server-corrected time, never the raw device clock.
  const now = serverNow();
  const d = q.data;
  const empty = d && !d.today && !d.week && !d.month && !d.pending;

  return (
    <>
      <PageHeader
        title={`${greeting(accraHour(now))}, ${me?.first_name ?? ''}`}
        description={accraDate(now)}
      />
      {q.isPending ? (
        <div className="grid gap-4">
          <Skeleton className="h-36 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      ) : q.isError || !d ? (
        <Alert tone="danger" title="The dashboard could not be loaded">
          You appear to be offline or the service is busy.
          <Button variant="outline" size="sm" className="mt-2" onClick={() => void q.refetch()}>
            Try again
          </Button>
        </Alert>
      ) : empty ? (
        <Card>
          <EmptyState
            title="Nothing to show yet"
            description="Your permissions do not include dashboard figures. Use the menu to reach your pages."
          />
        </Card>
      ) : (
        <motion.div variants={stagger} initial="hidden" animate="show" className="grid gap-4">
          {d.pending && (
            <motion.div variants={fadeUp}>
              <PendingSection p={d.pending} />
            </motion.div>
          )}
          {d.today && (
            <motion.div variants={fadeUp}>
              <TodaySection t={d.today} />
            </motion.div>
          )}
          <div className="grid items-start gap-4 lg:grid-cols-2">
            {d.week && (
              <motion.div variants={fadeUp}>
                <WeekSection w={d.week} />
              </motion.div>
            )}
            {d.month && (
              <motion.div variants={fadeUp}>
                <MonthSection m={d.month} />
              </motion.div>
            )}
          </div>
        </motion.div>
      )}
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
