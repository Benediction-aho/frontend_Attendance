import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'motion/react';
import { useState } from 'react';
import { useLocation, useParams } from 'react-router';
import { api, errorMessage } from '../../../lib/api';
import { weekdayNames, type Leave, type WorkScheduleInfo } from '../../../lib/attendance';
import { formatDate, isoDay } from '../../../lib/format';
import { can } from '../../../lib/permissions';
import { serverNow } from '../../../lib/serverTime';
import { Alert } from '../../../ui/Alert';
import { Button } from '../../../ui/Button';
import { Card, CardBody, CardHeader } from '../../../ui/Card';
import { Input } from '../../../ui/Field';
import { PageHeader } from '../../../ui/PageHeader';
import { Skeleton } from '../../../ui/Skeleton';
import { useToast } from '../../../ui/Toast';
import { fadeUp, stagger } from '../../../ui/motion';
import { useMe } from '../../auth/useSession';
import { HistoryList } from '../HistoryList';
import { WeekPicker } from '../MyAttendancePages';
import { LeaveForm, LeaveRows } from './LeavePage';

function ScheduleCard({ userId }: { userId: string }) {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const toast = useToast();
  const key = ['admin', 'schedule', userId];
  const q = useQuery({
    queryKey: key,
    queryFn: () => api.get<WorkScheduleInfo>(`/admin/users/${userId}/work-schedule`),
  });
  const [editing, setEditing] = useState(false);
  const [off, setOff] = useState<number[]>([]);
  const [remote, setRemote] = useState<number[]>([]);
  const today = isoDay(serverNow());
  const [from, setFrom] = useState(today);
  const save = useMutation({
    mutationFn: () =>
      api.put<WorkScheduleInfo>(`/admin/users/${userId}/work-schedule`, {
        days_off: off,
        remote_days: remote,
        effective_from: from,
      }),
    onSuccess: (r) => {
      qc.setQueryData(key, r);
      setEditing(false);
      toast.show('Working week saved.');
    },
  });
  const info = q.data;
  const shown = info?.current;
  return (
    <Card>
      <CardHeader
        title="Working week"
        actions={
          can(me, 'manage_work_schedules') && info && !editing ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setOff(shown?.days_off ?? []);
                setRemote(shown?.remote_days ?? []);
                setFrom(today);
                setEditing(true);
              }}
            >
              Change
            </Button>
          ) : undefined
        }
      />
      <CardBody>
        {q.isPending && <Skeleton className="h-16 w-full" />}
        {q.isError && <Alert tone="danger">{errorMessage(q.error)}</Alert>}
        {info && !editing && (
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-ink-500">Days off</dt>
              <dd className="font-semibold text-ink-900">{weekdayNames(shown?.days_off)}</dd>
            </div>
            <div>
              <dt className="text-ink-500">Remote days</dt>
              <dd className="font-semibold text-ink-900">{weekdayNames(shown?.remote_days)}</dd>
            </div>
            {info.upcoming.map((u) => (
              <div key={u.effective_from} className="sm:col-span-2 text-ink-600">
                From {formatDate(u.effective_from)}: days off {weekdayNames(u.days_off)}; remote{' '}
                {weekdayNames(u.remote_days)}.
              </div>
            ))}
            {!info.selected && (
              <div className="sm:col-span-2 text-ink-500">The employee has not chosen yet.</div>
            )}
          </dl>
        )}
        {info && editing && (
          <div className="flex flex-col gap-4">
            <WeekPicker
              info={info}
              daysOff={off}
              remote={remote}
              onChange={(o, r) => {
                setOff(o);
                setRemote(r);
              }}
            />
            <Input
              label="Applies from"
              type="date"
              min={today}
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              hint="Past days are never changed."
              wrapperClassName="max-w-xs"
            />
            {save.isError && <Alert tone="danger">{errorMessage(save.error)}</Alert>}
            <div className="flex gap-2">
              <Button loading={save.isPending} onClick={() => save.mutate()}>
                Save
              </Button>
              <Button variant="ghost" onClick={() => setEditing(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

function LeaveCard({ userId }: { userId: number }) {
  const q = useQuery({
    queryKey: ['admin', 'leaves', { user_id: userId }],
    queryFn: () => api.get<{ data: Leave[] }>(`/admin/leaves?user_id=${userId}`),
  });
  return (
    <Card>
      <CardHeader title="Leave" />
      <CardBody className="flex flex-col gap-4">
        <LeaveForm userId={userId} />
        {q.data && <LeaveRows leaves={q.data.data} />}
      </CardBody>
    </Card>
  );
}

/** One employee's attendance (any attendance tier). */
export function EmployeeAttendancePage() {
  const { id = '' } = useParams();
  const { data: me } = useMe();
  const loc = useLocation();
  const name = (loc.state as { name?: string } | null)?.name ?? 'Employee';
  return (
    <>
      <PageHeader
        title={name}
        description="Attendance history"
        back={{ to: '/app/admin/attendance', label: 'Attendance' }}
      />
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]"
      >
        <motion.div variants={fadeUp} className="order-2 lg:order-1">
          <HistoryList path={`/admin/users/${id}/attendance`} />
        </motion.div>
        <motion.div variants={fadeUp} className="order-1 flex flex-col gap-5 lg:order-2">
          <ScheduleCard userId={id} />
          {can(me, 'manage_leaves') && <LeaveCard userId={Number(id)} />}
        </motion.div>
      </motion.div>
    </>
  );
}
