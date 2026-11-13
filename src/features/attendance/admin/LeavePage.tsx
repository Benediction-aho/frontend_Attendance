import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'motion/react';
import { useState } from 'react';
import { api, errorMessage, qs } from '../../../lib/api';
import { employeeDetail, type Holiday, type Leave } from '../../../lib/attendance';
import { formatDate, isoDay } from '../../../lib/format';
import { can } from '../../../lib/permissions';
import { serverNow } from '../../../lib/serverTime';
import { Alert } from '../../../ui/Alert';
import { Button } from '../../../ui/Button';
import { Card, CardBody, CardHeader } from '../../../ui/Card';
import { Input, Select } from '../../../ui/Field';
import { PageHeader } from '../../../ui/PageHeader';
import { SkeletonRows } from '../../../ui/Skeleton';
import { useToast } from '../../../ui/Toast';
import { fadeUp, stagger } from '../../../ui/motion';
import { useMe } from '../../auth/useSession';
import { useHolidays } from '../useAttendance';
import { fullName, useDay } from './useDay';

export function LeaveRows({ leaves, names }: { leaves: Leave[]; names?: Map<number, string> }) {
  const qc = useQueryClient();
  const toast = useToast();
  const del = useMutation({
    mutationFn: (id: number) => api.del(`/admin/leaves/${id}`),
    onSuccess: () => {
      toast.show('Leave removed.');
      void qc.invalidateQueries({ queryKey: ['admin', 'leaves'] });
    },
    onError: (e) => toast.show(errorMessage(e), 'danger'),
  });
  if (leaves.length === 0) return <p className="text-sm text-ink-500">No leave recorded.</p>;
  return (
    <ul className="flex flex-col divide-y divide-ink-100">
      {leaves.map((l) => (
        <li key={l.id} className="flex items-center justify-between gap-3 py-2">
          <div className="min-w-0 text-sm">
            {names && l.user_id !== undefined && (
              <p className="font-semibold text-ink-900">
                {l.user ? fullName(l.user) : (names.get(l.user_id) ?? `Employee ${l.user_id}`)}
                {employeeDetail(l.user) && (
                  <span className="block text-xs font-normal text-ink-500">
                    {employeeDetail(l.user)}
                  </span>
                )}
              </p>
            )}
            <p className="text-ink-800">
              {formatDate(l.start_date)} – {formatDate(l.end_date)}
            </p>
            {l.note && <p className="wrap-anywhere text-ink-500">{l.note}</p>}
          </div>
          <Button
            variant="danger-ghost"
            size="sm"
            loading={del.isPending && del.variables === l.id}
            onClick={() => del.mutate(l.id)}
          >
            Remove
          </Button>
        </li>
      ))}
    </ul>
  );
}

export function LeaveForm({ userId }: { userId?: number }) {
  const qc = useQueryClient();
  const toast = useToast();
  const today = isoDay(serverNow());
  const day = useDay(today);
  const [user, setUser] = useState<string>(userId ? String(userId) : '');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [note, setNote] = useState('');
  const add = useMutation({
    mutationFn: () =>
      api.post(`/admin/users/${user}/leaves`, {
        start_date: start,
        end_date: end || start,
        ...(note.trim() ? { note: note.trim() } : {}),
      }),
    onSuccess: () => {
      toast.show('Leave added.');
      setStart('');
      setEnd('');
      setNote('');
      void qc.invalidateQueries({ queryKey: ['admin', 'leaves'] });
    },
  });
  return (
    <form
      className="grid gap-3 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (user && start) add.mutate();
      }}
    >
      {!userId && (
        <Select
          label="Employee"
          value={user}
          onChange={(e) => setUser(e.target.value)}
          wrapperClassName="sm:col-span-2"
          required
        >
          <option value="">Choose an employee</option>
          {day.data?.data.map((r) => (
            <option key={r.user.id} value={r.user.id}>
              {[fullName(r.user), employeeDetail(r.user)].filter(Boolean).join(' · ')}
            </option>
          ))}
        </Select>
      )}
      <Input
        label="First day"
        type="date"
        value={start}
        onChange={(e) => setStart(e.target.value)}
        required
      />
      <Input
        label="Last day"
        type="date"
        min={start}
        value={end}
        onChange={(e) => setEnd(e.target.value)}
      />
      <Input
        label="Note"
        optional
        value={note}
        maxLength={255}
        onChange={(e) => setNote(e.target.value)}
        wrapperClassName="sm:col-span-2"
      />
      {add.isError && (
        <Alert tone="danger" className="sm:col-span-2">
          {errorMessage(add.error)}
        </Alert>
      )}
      <div className="sm:col-span-2">
        <Button type="submit" loading={add.isPending} disabled={!user || !start}>
          Add leave
        </Button>
      </div>
    </form>
  );
}

function HolidaysCard() {
  const year = serverNow().getUTCFullYear();
  const q = useHolidays(year);
  const qc = useQueryClient();
  const toast = useToast();
  const [date, setDate] = useState('');
  const [name, setName] = useState('');
  const add = useMutation({
    mutationFn: () => api.post('/admin/holidays', { date, name: name.trim() }),
    onSuccess: () => {
      toast.show('Holiday added.');
      setDate('');
      setName('');
      void qc.invalidateQueries({ queryKey: ['holidays'] });
    },
  });
  const del = useMutation({
    mutationFn: (id: number) => api.del(`/admin/holidays/${id}`),
    onSuccess: () => {
      toast.show('Holiday removed.');
      void qc.invalidateQueries({ queryKey: ['holidays'] });
    },
    onError: (e) => toast.show(errorMessage(e), 'danger'),
  });
  return (
    <Card>
      <CardHeader
        title={`Public holidays ${year}`}
        description="Nobody is expected on these days."
      />
      <CardBody className="flex flex-col gap-4">
        <form
          className="grid gap-3 sm:grid-cols-[10rem_minmax(0,1fr)_auto] sm:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            if (date && name.trim()) add.mutate();
          }}
        >
          <Input
            label="Date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
          <Input
            label="Name"
            value={name}
            maxLength={100}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <Button type="submit" loading={add.isPending} disabled={!date || !name.trim()}>
            Add
          </Button>
        </form>
        {add.isError && <Alert tone="danger">{errorMessage(add.error)}</Alert>}
        {q.isPending && <SkeletonRows rows={3} />}
        {q.data && q.data.length === 0 && <p className="text-sm text-ink-500">No holidays yet.</p>}
        <ul className="flex flex-col divide-y divide-ink-100">
          {q.data?.map((h: Holiday) => (
            <li key={h.id} className="flex items-center justify-between gap-3 py-2 text-sm">
              <span>
                <span className="font-semibold text-ink-900">{h.name}</span>
                <span className="ml-2 text-ink-500 tabular-nums">{formatDate(h.date)}</span>
              </span>
              <Button variant="danger-ghost" size="sm" onClick={() => del.mutate(h.id)}>
                Remove
              </Button>
            </li>
          ))}
        </ul>
      </CardBody>
    </Card>
  );
}

/** Leave (manage_leaves) and public holidays (super admin or manage_leaves). */
export function LeavePage() {
  const { data: me } = useMe();
  const manage = can(me, 'manage_leaves');
  const today = isoDay(serverNow());
  const day = useDay(today);
  const names = new Map((day.data?.data ?? []).map((r) => [r.user.id, fullName(r.user)]));
  const leaves = useQuery({
    queryKey: ['admin', 'leaves', 'upcoming'],
    queryFn: () => api.get<{ data: Leave[] }>(`/admin/leaves${qs({ from: today })}`),
    enabled: manage,
  });
  return (
    <>
      <PageHeader title="Leave and holidays" description="Days when employees are not expected." />
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="grid gap-5 lg:grid-cols-2"
      >
        {manage && (
          <motion.div variants={fadeUp}>
            <Card>
              <CardHeader title="Leave" description="Current and upcoming leave." />
              <CardBody className="flex flex-col gap-5">
                <LeaveForm />
                {leaves.isPending && <SkeletonRows rows={3} />}
                {leaves.data && <LeaveRows leaves={leaves.data.data} names={names} />}
              </CardBody>
            </Card>
          </motion.div>
        )}
        <motion.div variants={fadeUp}>
          <HolidaysCard />
        </motion.div>
      </motion.div>
    </>
  );
}
