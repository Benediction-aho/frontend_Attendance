import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { api, ApiError, errorMessage, qs } from '../../../lib/api';
import {
  employeeDetail,
  formatTime,
  type Attendance,
  type EmployeeSummary,
  type RefusedAttempt,
} from '../../../lib/attendance';
import { formatDate, isoDay } from '../../../lib/format';
import type { PageMeta } from '../../../lib/types';
import { serverNow } from '../../../lib/serverTime';
import { Alert } from '../../../ui/Alert';
import { Badge } from '../../../ui/Badge';
import { Button } from '../../../ui/Button';
import { Card, CardBody } from '../../../ui/Card';
import { EmptyState } from '../../../ui/EmptyState';
import { Input } from '../../../ui/Field';
import { PageHeader } from '../../../ui/PageHeader';
import { SkeletonRows } from '../../../ui/Skeleton';
import { Table, TBody, TD, TH, THead, TR } from '../../../ui/Table';
import { useToast } from '../../../ui/Toast';
import { Tabs } from '../../../ui/Tabs';
import { fadeUp, stagger } from '../../../ui/motion';
import { formatDistance } from '../../../lib/attendance';
import { AttendanceBadges } from '../parts';
import { fullName, useDay } from './useDay';

type MStatus = 'pending' | 'approved' | 'rejected';
const TABS: { v: MStatus; label: string }[] = [
  { v: 'pending', label: 'Waiting' },
  { v: 'approved', label: 'Approved' },
  { v: 'rejected', label: 'Rejected' },
];

type Mission = Attendance & { user: EmployeeSummary | null };

function MissionCard({ m, pending }: { m: Mission; pending: boolean }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [note, setNote] = useState('');
  const act = useMutation({
    mutationFn: (decision: 'approve' | 'reject') =>
      api.post(
        `/admin/attendance/${m.id}/mission/${decision}`,
        decision === 'approve' && note.trim() ? { note: note.trim() } : {},
      ),
    onSuccess: (_r, d) => {
      toast.show(d === 'approve' ? 'Mission approved.' : 'Mission rejected.');
      void qc.invalidateQueries({ queryKey: ['admin', 'missions'] });
    },
    onError: (e) => {
      if (e instanceof ApiError && e.code === 'mission_already_reviewed') {
        toast.show('Another administrator already reviewed this mission.', 'info');
        void qc.invalidateQueries({ queryKey: ['admin', 'missions'] });
      }
    },
  });
  return (
    <Card>
      <CardBody>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="font-semibold text-ink-900">{m.user ? fullName(m.user) : 'Employee'}</p>
            {employeeDetail(m.user) && (
              <p className="text-xs text-ink-500">{employeeDetail(m.user)}</p>
            )}
            <p className="text-xs text-ink-500">
              {formatDate(m.work_date)} at {formatTime(m.check_in_at)}
            </p>
          </div>
          <AttendanceBadges a={m} />
        </div>
        <p className="mt-3 text-sm text-ink-500">Reason</p>
        {/* Plain text only: never interpreted as HTML. */}
        <p className="wrap-anywhere whitespace-pre-line text-sm text-ink-900">{m.reason ?? '–'}</p>
        {m.mission_note && (
          <p className="mt-2 wrap-anywhere text-sm text-ink-600">Note: {m.mission_note}</p>
        )}
        {pending && (
          <div className="mt-4 flex flex-col gap-3">
            <Input
              label="Note to the employee"
              optional
              value={note}
              maxLength={500}
              onChange={(e) => setNote(e.target.value)}
            />
            {act.isError &&
              !(act.error instanceof ApiError && act.error.code === 'mission_already_reviewed') && (
                <Alert tone="danger">{errorMessage(act.error)}</Alert>
              )}
            <div className="flex flex-wrap gap-2">
              <Button
                loading={act.isPending && act.variables === 'approve'}
                disabled={act.isPending}
                onClick={() => act.mutate('approve')}
              >
                Approve
              </Button>
              <Button
                variant="danger-outline"
                loading={act.isPending && act.variables === 'reject'}
                disabled={act.isPending}
                onClick={() => act.mutate('reject')}
              >
                Reject
              </Button>
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

export function MissionsPage() {
  const [params, setParams] = useSearchParams();
  const status = (params.get('status') as MStatus) || 'pending';
  const q = useQuery({
    queryKey: ['admin', 'missions', status],
    queryFn: () =>
      api.get<{ data: Mission[]; meta: PageMeta }>(`/admin/attendance/missions${qs({ status })}`),
  });
  return (
    <>
      <PageHeader
        title="Mission check-ins"
        description="Employees working outside the office. They can use the app while waiting."
        back={{ to: '/app/admin/attendance', label: 'Attendance' }}
      />
      <Tabs
        label="Mission status"
        value={status}
        onChange={(v) => setParams({ status: v }, { replace: true })}
        tabs={TABS}
      />
      {q.isPending && <SkeletonRows rows={3} />}
      {q.isError && <Alert tone="danger">{errorMessage(q.error)}</Alert>}
      {q.data && q.data.data.length === 0 && (
        <EmptyState
          title={status === 'pending' ? 'Nothing to review' : 'No missions'}
          description="Mission check-ins appear here."
        />
      )}
      <motion.ul
        variants={stagger}
        initial="hidden"
        animate="show"
        className="flex max-w-2xl flex-col gap-3"
      >
        <AnimatePresence initial={false}>
          {q.data?.data.map((m) => (
            <motion.li key={m.id} variants={fadeUp} exit={{ opacity: 0, height: 0 }}>
              <MissionCard m={m} pending={status === 'pending'} />
            </motion.li>
          ))}
        </AnimatePresence>
      </motion.ul>
    </>
  );
}

const OUTCOME: Record<RefusedAttempt['outcome'], string> = {
  out_of_perimeter: 'Outside the perimeter',
  low_accuracy: 'Position not precise',
};

/** Refused check-in attempts (view_lateness). */
export function AttemptsPage() {
  const today = isoDay(serverNow());
  const [date, setDate] = useState(today);
  const day = useDay(today);
  const names = new Map((day.data?.data ?? []).map((r) => [r.user.id, fullName(r.user)]));
  const attemptName = (a: RefusedAttempt) =>
    a.user ? fullName(a.user) : (names.get(a.user_id) ?? `Employee ${a.user_id}`);
  const q = useQuery({
    queryKey: ['admin', 'attempts', date],
    queryFn: () =>
      api.get<{ data: RefusedAttempt[]; meta: PageMeta }>(
        `/admin/attendance/attempts${qs({ date })}`,
      ),
  });
  return (
    <>
      <PageHeader
        title="Refused check-ins"
        description="Check-in attempts the server refused (outside the perimeter or imprecise position)."
        back={{ to: '/app/admin/attendance', label: 'Attendance' }}
      />
      <div className="mb-5 max-w-xs">
        <Input
          label="Date"
          type="date"
          value={date}
          max={today}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>
      {q.isPending && <SkeletonRows rows={4} />}
      {q.isError && <Alert tone="danger">{errorMessage(q.error)}</Alert>}
      {q.data && q.data.data.length === 0 && <EmptyState title="No refused check-ins" />}
      {q.data && q.data.data.length > 0 && (
        <>
          {/* Phones: one stacked row per attempt (the date is the filter). */}
          <ul className="flex flex-col gap-2 md:hidden" data-testid="attempts-stacked">
            {q.data.data.map((a) => (
              <li key={a.id}>
                <Card>
                  <CardBody className="flex flex-col gap-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-ink-900">{attemptName(a)}</p>
                        {employeeDetail(a.user) && (
                          <p className="truncate text-xs text-ink-500">{employeeDetail(a.user)}</p>
                        )}
                      </div>
                      <Badge tone={a.outcome === 'out_of_perimeter' ? 'danger' : 'warning'}>
                        {OUTCOME[a.outcome]}
                      </Badge>
                    </div>
                    <p className="text-sm text-ink-500 tabular-nums">
                      {formatTime(a.created_at)}
                      {a.distance_m === null ? '' : ` · ${formatDistance(a.distance_m)}`}
                      {a.accuracy_m === null ? '' : ` · ± ${formatDistance(a.accuracy_m)}`}
                    </p>
                  </CardBody>
                </Card>
              </li>
            ))}
          </ul>
          <Card className="hidden overflow-x-auto md:block">
            <Table>
              <THead>
                <TR>
                  <TH>Employee</TH>
                  <TH>Time</TH>
                  <TH>Outcome</TH>
                  <TH>Distance</TH>
                  <TH>Accuracy</TH>
                </TR>
              </THead>
              <TBody>
                {q.data.data.map((a) => (
                  <TR key={a.id}>
                    <TD>
                      {attemptName(a)}
                      {employeeDetail(a.user) && (
                        <span className="block text-xs text-ink-500">{employeeDetail(a.user)}</span>
                      )}
                    </TD>
                    <TD className="tabular-nums">{formatTime(a.created_at)}</TD>
                    <TD>
                      <Badge tone={a.outcome === 'out_of_perimeter' ? 'danger' : 'warning'}>
                        {OUTCOME[a.outcome]}
                      </Badge>
                    </TD>
                    <TD className="tabular-nums">{formatDistance(a.distance_m)}</TD>
                    <TD className="tabular-nums">
                      {a.accuracy_m === null ? '–' : `± ${formatDistance(a.accuracy_m)}`}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </Card>
        </>
      )}
    </>
  );
}
