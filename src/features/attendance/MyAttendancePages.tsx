import { useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'motion/react';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { api, ApiError, errorMessage } from '../../lib/api';
import { weekdayNames, WEEKDAYS, type WorkScheduleInfo } from '../../lib/attendance';
import { formatDate } from '../../lib/format';
import { Alert } from '../../ui/Alert';
import { Button } from '../../ui/Button';
import { Card, CardBody, CardHeader } from '../../ui/Card';
import { Modal } from '../../ui/Modal';
import { PageHeader } from '../../ui/PageHeader';
import { SkeletonRows } from '../../ui/Skeleton';
import { useToast } from '../../ui/Toast';
import { cx } from '../../ui/cx';
import { fadeUp, stagger } from '../../ui/motion';
import { HistoryList } from './HistoryList';
import { SCHEDULE_KEY, useHolidays, useMyLeaves, useMySchedule } from './useAttendance';
import { serverNow } from '../../lib/serverTime';

export function MyHistoryPage() {
  return (
    <>
      <PageHeader
        title="My attendance"
        description="Your check-ins and check-outs, newest first."
        back={{ to: '/app', label: 'Today' }}
      />
      <HistoryList path="/attendance/history" />
    </>
  );
}

type Choice = 'office' | 'off' | 'remote';

/** Day picker used by the employee (once) and by admins (any time). */
export function WeekPicker({
  info,
  daysOff,
  remote,
  onChange,
}: {
  info: Pick<
    WorkScheduleInfo,
    'working_days' | 'max_days_off_per_week' | 'max_remote_days_per_week'
  >;
  daysOff: number[];
  remote: number[];
  onChange: (daysOff: number[], remote: number[]) => void;
}) {
  const choiceOf = (d: number): Choice =>
    daysOff.includes(d) ? 'off' : remote.includes(d) ? 'remote' : 'office';
  const set = (d: number, c: Choice) => {
    const off = daysOff.filter((x) => x !== d);
    const rem = remote.filter((x) => x !== d);
    if (c === 'off') off.push(d);
    if (c === 'remote') rem.push(d);
    onChange(
      off.sort((a, b) => a - b),
      rem.sort((a, b) => a - b),
    );
  };
  const offFull = daysOff.length >= info.max_days_off_per_week;
  const remoteFull = remote.length >= info.max_remote_days_per_week;
  return (
    <div className="flex flex-col gap-2">
      {WEEKDAYS.filter((w) => info.working_days.includes(w.n)).map((w) => {
        const c = choiceOf(w.n);
        const opts: { v: Choice; label: string; disabled: boolean }[] = [
          { v: 'office', label: 'Office', disabled: false },
          { v: 'remote', label: 'Remote', disabled: c !== 'remote' && remoteFull },
          { v: 'off', label: 'Day off', disabled: c !== 'off' && offFull },
        ];
        return (
          <fieldset key={w.n} className="flex flex-wrap items-center justify-between gap-2">
            <legend className="sr-only">{w.long}</legend>
            <span aria-hidden className="w-24 text-sm font-medium text-ink-800">
              {w.long}
            </span>
            <div className="grid flex-1 grid-cols-3 gap-1.5 sm:max-w-xs">
              {opts.map((o) => (
                <label
                  key={o.v}
                  className={cx(
                    'flex min-h-11 cursor-pointer items-center justify-center rounded-control border text-sm transition-colors has-[:focus-visible]:shadow-focus',
                    c === o.v
                      ? o.v === 'off'
                        ? 'border-secondary-400 bg-secondary-50 font-semibold text-secondary-800'
                        : 'border-primary-500 bg-primary-50 font-semibold text-primary-700'
                      : o.disabled
                        ? 'cursor-not-allowed border-ink-100 text-ink-400'
                        : 'border-ink-200 bg-surface text-ink-700 hover:border-ink-300',
                  )}
                >
                  <input
                    type="radio"
                    className="sr-only"
                    name={`day-${w.n}`}
                    aria-label={`${w.long}: ${o.label}`}
                    checked={c === o.v}
                    disabled={o.disabled}
                    onChange={() => set(w.n, o.v)}
                  />
                  {o.label}
                </label>
              ))}
            </div>
          </fieldset>
        );
      })}
      {(offFull || remoteFull) && (
        <p className="mt-1 text-sm text-ink-700" data-testid="limit-hint">
          {offFull &&
            `You have chosen your ${info.max_days_off_per_week} day${info.max_days_off_per_week === 1 ? '' : 's'} off.`}
          {offFull && remoteFull ? ' ' : ''}
          {remoteFull &&
            `You have chosen your ${info.max_remote_days_per_week} remote day${info.max_remote_days_per_week === 1 ? '' : 's'}.`}
        </p>
      )}
      <p className="mt-1 text-xs text-ink-500">
        Up to {info.max_days_off_per_week} day{info.max_days_off_per_week === 1 ? '' : 's'} off and{' '}
        {info.max_remote_days_per_week} remote day{info.max_remote_days_per_week === 1 ? '' : 's'}{' '}
        per week.
      </p>
    </div>
  );
}

function ScheduleSummary({ info }: { info: WorkScheduleInfo }) {
  const next = info.upcoming[0];
  return (
    <dl className="grid gap-3 text-sm sm:grid-cols-2">
      <div>
        <dt className="text-ink-500">Days off</dt>
        <dd className="font-semibold text-ink-900">
          {weekdayNames((next ?? info.current)?.days_off)}
        </dd>
      </div>
      <div>
        <dt className="text-ink-500">Remote days</dt>
        <dd className="font-semibold text-ink-900">
          {weekdayNames((next ?? info.current)?.remote_days)}
        </dd>
      </div>
      {next?.effective_from && (
        <div className="sm:col-span-2">
          <dd className="text-ink-600">Applies from {formatDate(next.effective_from)}.</dd>
        </div>
      )}
    </dl>
  );
}

export function SchedulePage() {
  const q = useMySchedule();
  const leaves = useMyLeaves();
  const holidays = useHolidays(serverNow().getUTCFullYear());
  const qc = useQueryClient();
  const toast = useToast();
  const navigate = useNavigate();
  const [daysOff, setDaysOff] = useState<number[]>([]);
  const [remote, setRemote] = useState<number[]>([]);
  const [confirm, setConfirm] = useState(false);
  const save = useMutation({
    mutationFn: () =>
      api.post<WorkScheduleInfo>('/me/work-schedule', { days_off: daysOff, remote_days: remote }),
    onSuccess: (r) => {
      qc.setQueryData(SCHEDULE_KEY, r);
      setConfirm(false);
      toast.show('Your days are saved. They apply from tomorrow.');
      navigate('/app');
    },
    onError: (e) => {
      setConfirm(false);
      if (e instanceof ApiError && e.code === 'schedule_locked')
        void qc.invalidateQueries({ queryKey: SCHEDULE_KEY });
    },
  });
  const info = q.data;
  return (
    <>
      <PageHeader
        title="My working week"
        description="Days off and remote days from your contract."
        back={{ to: '/app', label: 'Today' }}
      />
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="flex max-w-2xl flex-col gap-5"
      >
        {q.isPending && <SkeletonRows rows={5} />}
        {q.isError && <Alert tone="danger">{errorMessage(q.error)}</Alert>}
        {info && (
          <motion.div variants={fadeUp}>
            <Card>
              {info.locked || info.selected ? (
                <>
                  <CardHeader
                    title="Your days"
                    description="Only an administrator can change them. Ask your manager if your contract changes."
                  />
                  <CardBody>
                    <ScheduleSummary info={info} />
                  </CardBody>
                </>
              ) : (
                <>
                  <CardHeader
                    title="Choose your days"
                    description="You can do this only once. Check your contract before saving."
                  />
                  <CardBody>
                    <WeekPicker
                      info={info}
                      daysOff={daysOff}
                      remote={remote}
                      onChange={(o, r) => {
                        setDaysOff(o);
                        setRemote(r);
                      }}
                    />
                    {save.isError && (
                      <Alert tone="danger" className="mt-4">
                        {errorMessage(save.error)}
                      </Alert>
                    )}
                    <Button size="lg" className="mt-5" onClick={() => setConfirm(true)}>
                      Save my days
                    </Button>
                  </CardBody>
                </>
              )}
            </Card>
          </motion.div>
        )}
        <motion.div variants={fadeUp}>
          <Card>
            <CardHeader title="My leave" />
            <CardBody>
              {leaves.data && leaves.data.length === 0 && (
                <p className="text-sm text-ink-500">No leave recorded.</p>
              )}
              <ul className="flex flex-col gap-2 text-sm">
                {leaves.data?.map((l) => (
                  <li key={l.id}>
                    <span className="font-semibold text-ink-900">
                      {formatDate(l.start_date)} – {formatDate(l.end_date)}
                    </span>
                    {l.note && <span className="block break-words text-ink-600">{l.note}</span>}
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        </motion.div>
        <motion.div variants={fadeUp}>
          <Card>
            <CardHeader title="Public holidays" />
            <CardBody>
              {holidays.data && holidays.data.length === 0 && (
                <p className="text-sm text-ink-500">No public holidays listed yet.</p>
              )}
              <ul className="flex flex-col gap-1 text-sm">
                {holidays.data?.map((h) => (
                  <li key={h.id} className="flex justify-between gap-3">
                    <span className="text-ink-800">{h.name}</span>
                    <span className="text-ink-500 tabular-nums">{formatDate(h.date)}</span>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        </motion.div>
      </motion.div>
      <Modal
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Save these days?"
        description="After saving you cannot change them yourself. They apply from tomorrow."
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirm(false)}>
              Go back
            </Button>
            <Button loading={save.isPending} onClick={() => save.mutate()}>
              Save
            </Button>
          </>
        }
      >
        <dl className="grid gap-2 text-sm">
          <div>
            <dt className="text-ink-500">Days off</dt>
            <dd className="font-semibold text-ink-900">{weekdayNames(daysOff)}</dd>
          </div>
          <div>
            <dt className="text-ink-500">Remote days</dt>
            <dd className="font-semibold text-ink-900">{weekdayNames(remote)}</dd>
          </div>
        </dl>
      </Modal>
    </>
  );
}
