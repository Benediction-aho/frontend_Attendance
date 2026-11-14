import { useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'motion/react';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { api, ApiError, errorMessage } from '../../../lib/api';
import { employeeDetail, formatTime, type Attendance, type DayRow } from '../../../lib/attendance';
import { api as apiClient, qs } from '../../../lib/api';
import { useQuery } from '@tanstack/react-query';
import type { PageMeta } from '../../../lib/types';
import { isoDay } from '../../../lib/format';
import { can } from '../../../lib/permissions';
import { serverNow } from '../../../lib/serverTime';
import { Alert } from '../../../ui/Alert';
import { Button } from '../../../ui/Button';
import { Card, CardBody, StatTile } from '../../../ui/Card';
import { EmptyState } from '../../../ui/EmptyState';
import { Input, Textarea } from '../../../ui/Field';
import { Modal } from '../../../ui/Modal';
import { PageHeader } from '../../../ui/PageHeader';
import { SkeletonRows } from '../../../ui/Skeleton';
import { useToast } from '../../../ui/Toast';
import { fadeUp, stagger } from '../../../ui/motion';
import { useMe } from '../../auth/useSession';
import { AttendanceBadges, DayStatusBadge } from '../parts';
import { fullName, useDay } from './useDay';

function CheckInOnBehalf({ row, onClose }: { row: DayRow | null; onClose: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | undefined>();
  const m = useMutation({
    mutationFn: () =>
      api.post<{ data: Attendance }>(`/admin/users/${row!.user.id}/check-in`, {
        reason: reason.trim(),
      }),
    onSuccess: (r) => {
      toast.show(`${fullName(row!.user)} checked in at ${formatTime(r.data.check_in_at)}.`);
      setReason('');
      onClose();
      void qc.invalidateQueries({ queryKey: ['admin', 'attendance'] });
    },
    onError: (e) => {
      if (e instanceof ApiError && e.code === 'already_checked_in') {
        void qc.invalidateQueries({ queryKey: ['admin', 'attendance'] });
      }
    },
  });
  return (
    <Modal
      open={row !== null}
      onClose={onClose}
      title={row ? `Check in ${fullName(row.user)}` : 'Check in'}
      description="Use this only when the employee cannot check in (phone broken or forgotten). The current server time is used and the action is logged."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            loading={m.isPending}
            onClick={() => {
              if (reason.trim().length < 3)
                return setError('Please enter a reason (at least 3 characters).');
              setError(undefined);
              m.mutate();
            }}
          >
            Check in now
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <Textarea
          label="Reason"
          rows={3}
          maxLength={500}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          error={error}
        />
        {m.isError && <Alert tone="danger">{errorMessage(m.error)}</Alert>}
      </div>
    </Modal>
  );
}

const linkCls = (hot: boolean) =>
  `inline-flex min-h-11 items-center gap-1.5 rounded-control border bg-surface px-4 text-sm font-semibold text-ink-800 hover:bg-primary-50 ${
    hot ? 'border-secondary-300 ring-1 ring-secondary-300' : 'border-ink-200'
  }`;

/** Number of items behind a header link (total from the API list). */
function useCount(path: string, params: Record<string, string>, enabled: boolean) {
  return useQuery({
    queryKey: ['admin', 'attendance', 'count', path, params],
    queryFn: () => apiClient.get<{ meta?: PageMeta; data: unknown[] }>(`${path}${qs(params)}`),
    enabled,
    select: (r) => r.meta?.total ?? r.data.length,
  });
}

function shiftDay(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function Row({ row, onCheckIn }: { row: DayRow; onCheckIn?: () => void }) {
  const a = row.attendance;
  return (
    <Card>
      <CardBody className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <Link
            to={`/app/admin/attendance/users/${row.user.id}`}
            state={{ name: fullName(row.user) }}
            className="font-semibold text-ink-900 hover:text-primary-700 hover:underline"
          >
            {fullName(row.user)}
          </Link>
          <p className="truncate text-xs text-ink-500">{employeeDetail(row.user) || '–'}</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <DayStatusBadge status={row.day_status} />
            {a && <AttendanceBadges a={a} />}
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm sm:justify-end">
          {a ? (
            <span className="tabular-nums text-ink-700">
              In <strong className="text-ink-900">{formatTime(a.check_in_at)}</strong>
              {' · '}Out{' '}
              <strong className="text-ink-900">
                {a.checkout_forgotten ? 'forgotten' : formatTime(a.check_out_at)}
              </strong>
            </span>
          ) : (
            <span className="text-ink-500">{row.expected ? 'Not checked in' : 'Not expected'}</span>
          )}
          {onCheckIn && (
            <Button size="sm" variant="outline" onClick={onCheckIn}>
              Check in for them
            </Button>
          )}
        </div>
      </CardBody>
    </Card>
  );
}

/** Daily attendance of every active employee (any attendance tier). */
export function AdminAttendancePage() {
  const { data: me } = useMe();
  const [params, setParams] = useSearchParams();
  const today = isoDay(serverNow());
  const date = params.get('date') || today;
  const q = useDay(date);
  const [onBehalf, setOnBehalf] = useState<DayRow | null>(null);
  const canOnBehalf = can(me, 'checkin_for_employee') && date === today;
  const rows = q.data?.data ?? [];
  const expected = rows.filter((r) => r.expected);
  const present = rows.filter((r) => r.attendance);
  const missing = expected.filter((r) => !r.attendance);
  const late = rows.filter((r) => r.attendance?.is_late === true);
  const showLate = rows.some((r) => typeof r.attendance?.is_late === 'boolean');
  const missions = useCount(
    '/admin/attendance/missions',
    { status: 'pending' },
    can(me, 'approve_mission_checkins'),
  );
  const attempts = useCount('/admin/attendance/attempts', { date }, can(me, 'view_lateness'));
  const setDate = (d: string) => setParams(d && d !== today ? { date: d } : {}, { replace: true });

  return (
    <>
      <PageHeader
        title="Attendance"
        actions={
          <>
            {can(me, 'approve_mission_checkins') && (
              <Link
                to="/app/admin/attendance/missions"
                className={linkCls((missions.data ?? 0) > 0)}
              >
                Missions{missions.data !== undefined ? ` · ${missions.data}` : ''}
              </Link>
            )}
            {can(me, 'view_lateness') && (
              <Link
                to="/app/admin/attendance/attempts"
                className={linkCls((attempts.data ?? 0) > 0)}
              >
                Refused check-ins{attempts.data !== undefined ? ` · ${attempts.data}` : ''}
              </Link>
            )}
          </>
        }
      />
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end">
        <Input
          label="Date"
          type="date"
          value={date}
          max={today}
          wrapperClassName="sm:w-44"
          onChange={(e) => setDate(e.target.value)}
        />
        <div className="grid grid-cols-3 gap-2 sm:flex" role="group" aria-label="Day navigation">
          <Button
            variant="ghost"
            size="sm"
            className="min-h-11"
            aria-label="Previous day"
            onClick={() => setDate(shiftDay(date, -1))}
          >
            Previous
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="min-h-11"
            disabled={date === today}
            onClick={() => setDate(today)}
          >
            Today
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="min-h-11"
            aria-label="Next day"
            disabled={date >= today}
            onClick={() => setDate(shiftDay(date, 1))}
          >
            Next
          </Button>
        </div>
      </div>
      {q.isPending && <SkeletonRows rows={6} />}
      {q.isError && <Alert tone="danger">{errorMessage(q.error)}</Alert>}
      {q.data && (
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className="flex flex-col gap-5"
        >
          <motion.div variants={fadeUp} className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
            <StatTile compact label="Expected" value={expected.length} />
            <StatTile compact label="Checked in" value={present.length} />
            <StatTile
              compact
              label="Not checked in"
              value={missing.length}
              highlight={missing.length > 0}
            />
            {showLate && <StatTile compact label="Late" value={late.length} />}
          </motion.div>
          {rows.length === 0 ? (
            <EmptyState title="No employees" description="Active employees appear here." />
          ) : (
            <motion.ul variants={stagger} className="flex flex-col gap-2">
              {rows.map((r) => (
                <motion.li key={r.user.id} variants={fadeUp}>
                  <Row
                    row={r}
                    onCheckIn={canOnBehalf && !r.attendance ? () => setOnBehalf(r) : undefined}
                  />
                </motion.li>
              ))}
            </motion.ul>
          )}
        </motion.div>
      )}
      <CheckInOnBehalf row={onBehalf} onClose={() => setOnBehalf(null)} />
    </>
  );
}
