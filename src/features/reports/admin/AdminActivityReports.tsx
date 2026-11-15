import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { motion } from 'motion/react';
import { ApiError } from '../../../lib/api';
import { employeeDetail } from '../../../lib/attendance';
import type { ActivityReport, EmployeeSummary } from '../../../lib/reports';
import { formatDateTime, formatSize, fullName } from '../../../lib/reports';
import { Alert } from '../../../ui/Alert';
import { AdminBadge } from '../../../ui/Badge';
import { Card, CardBody, CardHeader } from '../../../ui/Card';
import { EmptyState } from '../../../ui/EmptyState';
import { Input, Select } from '../../../ui/Field';
import { FilterPanel } from '../../../ui/FilterPanel';
import { PageHeader } from '../../../ui/PageHeader';
import { Pagination } from '../../../ui/Pagination';
import { SkeletonRows } from '../../../ui/Skeleton';
import { fadeUp, stagger } from '../../../ui/motion';
import { useServerToday } from '../useServerNow';
import { useAdminActivityReport, useAdminActivityReports, useAdminWeekly } from '../useReports';
import { AdminTabs } from './AdminReportsPages';

const linkCls =
  'inline-flex min-h-11 items-center rounded-control px-3 text-sm font-medium text-primary-700 hover:bg-primary-50';

function Author({ user }: { user: EmployeeSummary | null | undefined }) {
  if (!user) return <span className="text-ink-500">Unknown author</span>;
  return (
    <>
      {fullName(user)}
      <AdminBadge user={user} />
    </>
  );
}

function PdfLink({ r }: { r: ActivityReport }) {
  if (!r.file_url) return <span className="px-3 text-xs text-ink-500">Link not available</span>;
  return (
    <a href={r.file_url} target="_blank" rel="noopener noreferrer" className={linkCls}>
      Open PDF<span className="sr-only">, {r.title}</span>
    </a>
  );
}

/** Reports › Activity reports: every activity report the viewer may read, newest first. */
export function AdminActivityReportsPage() {
  const today = useServerToday();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [userId, setUserId] = useState('');
  const [page, setPage] = useState(1);
  const rangeError = from && to && to < from ? 'Choose a date on or after "From".' : undefined;
  const q = useAdminActivityReports(
    { from: from || undefined, to: rangeError ? undefined : to || undefined, user_id: userId },
    page,
  );
  // People to pick from: the weekly list (readable with the same tiers) and the authors shown.
  const weekly = useAdminWeekly(undefined);
  const people = new Map<number, EmployeeSummary>();
  for (const r of weekly.data?.data ?? []) people.set(r.user.id, r.user);
  for (const r of q.data?.data ?? []) if (r.user) people.set(r.user.id, r.user);
  const options = [...people.values()].sort((a, b) => fullName(a).localeCompare(fullName(b)));
  const rows = q.data?.data ?? [];
  const reset = (fn: () => void) => {
    fn();
    setPage(1);
  };
  const dates = (
    <>
      <Input
        label="From"
        type="date"
        value={from}
        max={today}
        onChange={(e) => reset(() => setFrom(e.target.value))}
      />
      <Input
        label="To"
        type="date"
        value={to}
        max={today}
        error={rangeError}
        onChange={(e) => reset(() => setTo(e.target.value))}
      />
    </>
  );
  return (
    <div>
      <PageHeader
        title="Reports"
        description="Activity reports: PDFs sent at any time, outside the Friday weekly report."
      />
      <AdminTabs />
      <FilterPanel
        gridClassName="sm:grid-cols-3"
        activeMore={(from ? 1 : 0) + (to ? 1 : 0)}
        onClear={() =>
          reset(() => {
            setFrom('');
            setTo('');
          })
        }
        main={
          <Select
            label="Sent by"
            value={userId}
            onChange={(e) => reset(() => setUserId(e.target.value))}
          >
            <option value="">Everyone</option>
            {options.map((u) => (
              <option key={u.id} value={u.id}>
                {[fullName(u), u.role === 'admin' ? 'Admin' : null, u.job_title]
                  .filter(Boolean)
                  .join(' · ')}
              </option>
            ))}
          </Select>
        }
        more={dates}
      />
      {q.isPending ? (
        <SkeletonRows rows={5} />
      ) : q.isError ? (
        <Alert tone="danger">
          Activity reports could not be loaded.{' '}
          <button
            type="button"
            className="font-semibold underline"
            onClick={() => void q.refetch()}
          >
            Try again
          </button>
        </Alert>
      ) : rows.length === 0 ? (
        <Card>
          <EmptyState
            title="No activity report"
            description={
              from || to || userId
                ? 'Nothing matches these filters.'
                : 'Reports sent by the team will appear here.'
            }
          />
        </Card>
      ) : (
        <Card>
          <motion.ul
            variants={stagger}
            initial="hidden"
            animate="show"
            className="divide-y divide-ink-100"
            data-testid="admin-activity-reports"
          >
            {rows.map((r) => (
              <motion.li key={r.id} variants={fadeUp} className="px-5 py-3.5">
                <p className="text-xs text-ink-500">
                  <span className="font-medium text-ink-700">
                    <Author user={r.user} />
                  </span>
                  <span className="mx-1.5">·</span>
                  {formatDateTime(r.submitted_at)}
                </p>
                <p className="mt-0.5 font-medium wrap-anywhere text-ink-900">{r.title}</p>
                {r.note && (
                  <p className="mt-0.5 line-clamp-3 text-sm wrap-anywhere whitespace-pre-line text-ink-600">
                    {r.note}
                  </p>
                )}
                <div className="mt-1 -ml-3 flex flex-wrap gap-1">
                  <PdfLink r={r} />
                  <Link to={`/app/admin/reports/activity/${r.id}`} className={linkCls}>
                    Details<span className="sr-only">, {r.title}</span>
                  </Link>
                </div>
              </motion.li>
            ))}
          </motion.ul>
          <Pagination
            page={q.data.meta.current_page}
            lastPage={q.data.meta.last_page}
            total={q.data.meta.total}
            onPage={setPage}
          />
        </Card>
      )}
    </div>
  );
}

/** One activity report (target of the "Activity report from …" notification). */
export function AdminActivityReportPage() {
  const { id } = useParams();
  const q = useAdminActivityReport(id);
  const back = { to: '/app/admin/reports/activity', label: 'Activity reports' };
  if (q.isPending)
    return (
      <div>
        <PageHeader title="Activity report" back={back} />
        <SkeletonRows rows={4} />
      </div>
    );
  if (q.isError || !q.data) {
    // 404: deleted by its author, or written by an admin (super admins only). 403: tier removed.
    const gone = q.error instanceof ApiError && (q.error.status === 404 || q.error.status === 403);
    return (
      <div>
        <PageHeader title="Activity report" back={back} />
        {gone ? (
          <Alert tone="info" title="This report is not available">
            It was deleted by its author, or your account cannot open it.
          </Alert>
        ) : (
          <Alert tone="danger">
            This report could not be loaded.{' '}
            <button
              type="button"
              className="font-semibold underline"
              onClick={() => void q.refetch()}
            >
              Try again
            </button>
          </Alert>
        )}
      </div>
    );
  }
  const r = q.data;
  return (
    <div className="max-w-3xl">
      <PageHeader title={r.title} description="Activity report" back={back} />
      <motion.div variants={fadeUp} initial="hidden" animate="show">
        <Card data-testid="activity-report">
          <CardHeader
            title={r.user ? fullName(r.user) : 'Unknown author'}
            description={
              <>
                <AdminBadge user={r.user} className="mr-2 ml-0" />
                {[employeeDetail(r.user), `Sent ${formatDateTime(r.submitted_at)}`]
                  .filter(Boolean)
                  .join(' · ')}
              </>
            }
          />
          <CardBody className="flex flex-col gap-4">
            {r.note ? (
              <section>
                <h3 className="mb-1 text-sm font-semibold text-ink-800">Note</h3>
                <p className="text-sm wrap-anywhere whitespace-pre-line text-ink-700">{r.note}</p>
              </section>
            ) : (
              <p className="text-sm text-ink-500">No note with this report.</p>
            )}
            <section className="rounded-control border border-ink-100 bg-surface-muted px-4 py-3">
              <p className="text-sm font-medium wrap-anywhere text-ink-900">{r.file_name}</p>
              <p className="text-xs text-ink-500">
                PDF · {formatSize(r.size_bytes)} · The link is temporary; this page renews it.
              </p>
              {r.file_url ? (
                <a
                  href={r.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex min-h-11 items-center rounded-control bg-primary-600 px-5 text-sm font-semibold text-white hover:bg-primary-700"
                >
                  Open PDF
                </a>
              ) : (
                <p className="mt-2 text-xs text-ink-500">Link not available</p>
              )}
            </section>
          </CardBody>
        </Card>
      </motion.div>
    </div>
  );
}
