import { useState } from 'react';
import { Link, Navigate, useParams } from 'react-router';
import { AnimatePresence, motion } from 'motion/react';
import { useMe } from '../../auth/useSession';
import { canViewReports } from '../../../lib/permissions';
import { employeeDetail, formatTime } from '../../../lib/attendance';
import { formatDayEnGb } from '../../../lib/format';
import type { AdminDailyRow } from '../../../lib/reports';
import { dayAndTime, fullName, weekLabel } from '../../../lib/reports';
import { Alert } from '../../../ui/Alert';
import { Badge } from '../../../ui/Badge';
import { Button } from '../../../ui/Button';
import { Card, CardBody, CardHeader } from '../../../ui/Card';
import { EmptyState } from '../../../ui/EmptyState';
import { PageHeader } from '../../../ui/PageHeader';
import { SkeletonRows } from '../../../ui/Skeleton';
import { useServerToday } from '../useServerNow';
import { duration, easing, fadeUp, stagger } from '../../../ui/motion';
import {
  DateNav,
  Figure,
  ServicesList,
  TabLinks,
  VersionRow,
  WeeklyClientsList,
  WeeklySummaryView,
} from '../parts';
import { useDateParam } from '../ReportPages';
import {
  useAdminDaily,
  useAdminSubmission,
  useAdminUserWeekly,
  useAdminWeekly,
} from '../useReports';

function AdminTabs() {
  const { data: me } = useMe();
  const tabs = [];
  if (canViewReports(me)) tabs.push({ to: '/app/admin/reports', label: 'Daily reports' });
  tabs.push({ to: '/app/admin/reports/weekly', label: 'Weekly reports' });
  return tabs.length > 1 ? <TabLinks label="Report sections" tabs={tabs} /> : null;
}

function Retry({ what, retry }: { what: string; retry: () => void }) {
  return (
    <Alert tone="danger">
      {what} could not be loaded.{' '}
      <button type="button" className="font-semibold underline" onClick={retry}>
        Try again
      </button>
    </Alert>
  );
}

/* Daily reports (tier view_reports) */

export function AdminDailyReportsPage() {
  const { data: me } = useMe();
  const today = useServerToday();
  const [date, setDate] = useDateParam(today);
  const allowed = canViewReports(me);
  const q = useAdminDaily(date === today ? undefined : date, allowed);
  if (me && !allowed) return <Navigate to="/app/admin/reports/weekly" replace />;
  const rows = q.data?.data ?? [];
  const withData = rows.filter((r) => r.tasks_planned > 0 || r.clients_count > 0).length;
  return (
    <div>
      <PageHeader title="Reports" description="Daily work of each employee." />
      <AdminTabs />
      <DateNav label="Day" value={date} today={today} onChange={setDate} />
      {q.isPending ? (
        <SkeletonRows rows={6} />
      ) : q.isError ? (
        <Retry what="Daily reports" retry={() => void q.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState title="No employees" description="There is no active employee for this day." />
      ) : (
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className="flex flex-col gap-3"
        >
          <motion.p variants={fadeUp} className="text-sm text-ink-600">
            {withData} of {rows.length} employees recorded work on {formatDayEnGb(date)}.
          </motion.p>
          {rows.map((r) => (
            <motion.div key={r.user.id} variants={fadeUp}>
              <DailyRowCard row={r} />
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}

function DailyRowCard({ row }: { row: AdminDailyRow }) {
  const [open, setOpen] = useState(false);
  const hasDetail = Boolean(row.tasks?.length || row.clients?.length || row.services.length);
  return (
    <Card data-testid="daily-row">
      <div className="flex flex-wrap items-center gap-3 px-5 py-3">
        <div className="min-w-0 flex-1">
          <p className="font-medium break-words text-ink-900">{fullName(row.user)}</p>
          <p className="text-xs break-words text-ink-500">{employeeDetail(row.user)}</p>
        </div>
        <dl className="flex gap-4 text-sm">
          <div>
            <dt className="text-xs text-ink-500">Tasks done</dt>
            <dd className="font-semibold tabular-nums">
              {row.tasks_done} / {row.tasks_planned}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-ink-500">Clients</dt>
            <dd className="font-semibold tabular-nums">{row.clients_count}</dd>
          </div>
        </dl>
        {hasDetail && (
          <Button variant="ghost" size="sm" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
            {open ? 'Hide' : 'Details'}
            <span className="sr-only"> for {fullName(row.user)}</span>
          </Button>
        )}
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: duration.base, ease: easing.standard }}
            className="overflow-hidden border-t border-ink-100"
          >
            <div className="grid gap-4 px-5 py-4 sm:grid-cols-2">
              {row.tasks && (
                <section>
                  <h3 className="mb-1 text-sm font-semibold text-ink-800">Tasks</h3>
                  {row.tasks.length === 0 ? (
                    <p className="text-sm text-ink-500">No tasks.</p>
                  ) : (
                    <ul className="divide-y divide-ink-100">
                      {row.tasks.map((t) => (
                        <li key={t.id} className="flex justify-between gap-3 py-2 text-sm">
                          <span className="min-w-0 break-words">{t.title}</span>
                          {t.status === 'done' ? (
                            <Badge tone="success">
                              Done{t.completed_at ? ` ${formatTime(t.completed_at)}` : ''}
                            </Badge>
                          ) : (
                            <Badge tone="neutral">Not done</Badge>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              )}
              <section>
                <h3 className="mb-1 text-sm font-semibold text-ink-800">Services</h3>
                <ServicesList services={row.services} empty="No services." />
                {row.clients && row.clients.length > 0 && (
                  <>
                    <h3 className="mt-3 mb-1 text-sm font-semibold text-ink-800">Clients</h3>
                    <ul className="divide-y divide-ink-100" data-testid="admin-clients">
                      {row.clients.map((c) => (
                        <li key={c.id} className="flex justify-between gap-3 py-2 text-sm">
                          <span className="min-w-0 break-words">
                            {c.name}
                            <span className="block text-xs text-ink-500">{c.service}</span>
                          </span>
                          <span className="font-semibold tabular-nums">{c.quantity}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </section>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

/* Weekly PDFs (tier view_reports or receive_weekly_reports) */

export function AdminWeeklyReportsPage() {
  const { data: me } = useMe();
  const today = useServerToday();
  const [date, setDate] = useDateParam(today);
  const q = useAdminWeekly(date === today ? undefined : date);
  const full = canViewReports(me);
  const d = q.data;
  const missing = d ? d.data.filter((r) => r.expected && !r.submission) : [];
  return (
    <div>
      <PageHeader title="Reports" description="Weekly PDF reports, Monday to Friday." />
      <AdminTabs />
      <DateNav label="Week of" value={date} today={today} step={7} unit="week" onChange={setDate} />
      {q.isPending ? (
        <SkeletonRows rows={6} />
      ) : q.isError || !d ? (
        <Retry what="Weekly reports" retry={() => void q.refetch()} />
      ) : (
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className="flex flex-col gap-4"
        >
          <motion.div variants={fadeUp}>
            <Card>
              <CardHeader
                title={weekLabel(d.week_start, d.window_date)}
                description={`Upload window ${dayAndTime(d.opens_at)} to ${formatTime(d.closes_at)}`}
              />
              <CardBody className="flex flex-col gap-4">
                <dl className="grid grid-cols-2 gap-3">
                  <Figure label="Received" value={`${d.received_count} of ${d.expected_count}`} />
                  <Figure label="Missing" value={missing.length} />
                </dl>
                {missing.length > 0 && (
                  <div data-testid="missing">
                    <h3 className="text-sm font-semibold text-ink-800">Not received</h3>
                    <p className="text-sm break-words text-ink-700">
                      {missing.map((r) => fullName(r.user)).join(', ')}
                    </p>
                  </div>
                )}
              </CardBody>
            </Card>
          </motion.div>
          <motion.div variants={fadeUp}>
            <Card>
              <CardHeader title="Employees" />
              <ul className="divide-y divide-ink-100" data-testid="weekly-rows">
                {d.data.map((r) => {
                  const s = r.submission;
                  return (
                    <li key={r.user.id} className="flex flex-wrap items-center gap-2 px-5 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium break-words text-ink-900">{fullName(r.user)}</p>
                        <p className="text-xs break-words text-ink-500">
                          {s
                            ? `Version ${s.version} · ${dayAndTime(s.submitted_at)}`
                            : employeeDetail(r.user)}
                        </p>
                      </div>
                      {s ? (
                        <Badge tone={s.is_late ? 'warning' : 'success'}>
                          {s.is_late ? 'Late' : 'Received'}
                        </Badge>
                      ) : r.expected ? (
                        <Badge tone="danger">Missing</Badge>
                      ) : (
                        <Badge tone="neutral">Not expected</Badge>
                      )}
                      <div className="flex w-full flex-wrap gap-1 sm:w-auto">
                        {s && (
                          <Link
                            to={`/app/admin/reports/weekly/submissions/${s.id}`}
                            className="inline-flex min-h-11 items-center rounded-control px-3 text-sm font-medium text-primary-700 hover:bg-primary-50"
                          >
                            Open report<span className="sr-only"> of {fullName(r.user)}</span>
                          </Link>
                        )}
                        {full && (
                          <Link
                            to={`/app/admin/reports/users/${r.user.id}/weekly?date=${d.week_start}`}
                            className="inline-flex min-h-11 items-center rounded-control px-3 text-sm font-medium text-primary-700 hover:bg-primary-50"
                          >
                            Week summary<span className="sr-only"> of {fullName(r.user)}</span>
                          </Link>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}

export function AdminSubmissionPage() {
  const { id } = useParams();
  const q = useAdminSubmission(id);
  const back = { to: '/app/admin/reports/weekly', label: 'Weekly reports' };
  if (q.isPending)
    return (
      <div>
        <PageHeader title="Weekly report" back={back} />
        <SkeletonRows rows={5} />
      </div>
    );
  if (q.isError || !q.data)
    return (
      <div>
        <PageHeader title="Weekly report" back={back} />
        <Retry what="This report" retry={() => void q.refetch()} />
      </div>
    );
  const s = q.data;
  return (
    <div>
      <PageHeader
        title={fullName(s.user)}
        description={`Weekly report · ${weekLabel(s.week_start, s.window_date)}`}
        back={back}
      />
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="flex flex-col gap-4"
      >
        <motion.div variants={fadeUp}>
          <Card>
            <CardHeader
              title="PDF versions"
              description="Download links are temporary; this page renews them."
            />
            <CardBody>
              <ul className="divide-y divide-ink-100" data-testid="versions">
                {s.versions.map((v) => (
                  <VersionRow key={v.id} v={v} />
                ))}
              </ul>
            </CardBody>
          </Card>
        </motion.div>
        <motion.div variants={fadeUp}>
          <Card>
            <CardHeader title="Week" />
            <CardBody className="flex flex-col gap-4">
              <dl className="grid grid-cols-2 gap-3">
                <Figure label="Clients" value={s.week.clients_count} />
              </dl>
              <section>
                <h3 className="mb-1 text-sm font-semibold text-ink-800">Services</h3>
                <ServicesList services={s.week.services} empty="No services this week." />
              </section>
              {s.week.clients && (
                <section>
                  <h3 className="mb-1 text-sm font-semibold text-ink-800">Clients</h3>
                  <WeeklyClientsList clients={s.week.clients} />
                </section>
              )}
            </CardBody>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  );
}

export function AdminUserWeeklyPage() {
  const { id } = useParams();
  const today = useServerToday();
  const [date, setDate] = useDateParam(today);
  const q = useAdminUserWeekly(id, date === today ? undefined : date);
  return (
    <div>
      <PageHeader
        title={q.data ? fullName(q.data.user) : 'Weekly summary'}
        description={q.data ? employeeDetail(q.data.user) || 'Weekly summary' : undefined}
        back={{ to: '/app/admin/reports/weekly', label: 'Weekly reports' }}
      />
      <DateNav label="Week of" value={date} today={today} step={7} unit="week" onChange={setDate} />
      {q.isPending ? (
        <SkeletonRows rows={5} />
      ) : q.isError || !q.data ? (
        <Retry what="This summary" retry={() => void q.refetch()} />
      ) : (
        <WeeklySummaryView week={q.data.data} />
      )}
    </div>
  );
}
