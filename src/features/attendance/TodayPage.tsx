import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { Link } from 'react-router';
import { formatDistance, formatTime, type Today } from '../../lib/attendance';
import { formatDate } from '../../lib/format';
import { Alert } from '../../ui/Alert';
import { Button } from '../../ui/Button';
import { Card, CardBody } from '../../ui/Card';
import { Skeleton } from '../../ui/Skeleton';
import { Stepper } from '../../ui/Stepper';
import { duration, easing, fadeUp, stagger } from '../../ui/motion';
import { useMe } from '../auth/useSession';
import { FaceIdSetup } from '../faceid/FaceIdSetup';
import { InAppBrowserNotice } from '../pwa/InAppBrowserNotice';
import { InstallCard } from '../pwa/InstallGuide';
import { PushPrompt } from '../pwa/PushSettings';
import { CheckOutDialog } from './CheckOutDialog';
import { MissionDialog } from './MissionDialog';
import { AttendanceBadges, AttendanceDetails, DayStatusBadge, ServerClock } from './parts';
import { useMySchedule, useToday } from './useAttendance';
import { useCheckIn, type CheckInState } from './useCheckIn';

const FLOW_STEPS = ['Location', 'Face ID', 'Confirmed'];

function flowIndex(s: CheckInState): number {
  if (s.step === 'done') return 2;
  if (s.step === 'faceid' || s.step === 'confirming') return 1;
  return 0;
}

function ProgressText({ s }: { s: CheckInState }) {
  if (s.step === 'locating') {
    const p = s.progress;
    if (!p || p.accuracy === null) return <>Getting your position…</>;
    const target = p.target !== null ? ` (${formatDistance(p.target)} needed)` : '';
    return (
      <>
        Improving the position, reading {p.attempt}: accurate to {formatDistance(p.accuracy)}
        {target}
      </>
    );
  }
  if (s.step === 'checking')
    return (
      <>{s.kind === 'gps' ? 'Checking that you are at the office…' : 'Preparing your check-in…'}</>
    );
  if (s.step === 'faceid') return <>Look at your phone to confirm with Face ID.</>;
  if (s.step === 'confirming') return <>Recording your check-in…</>;
  return null;
}

/** Accuracy progress bar: fills as the reading approaches the accuracy needed. */
function AccuracyBar({ s }: { s: CheckInState }) {
  const p = s.progress;
  if (s.step !== 'locating' || !p || p.accuracy === null || p.target === null) return null;
  const ratio = Math.max(0.08, Math.min(1, p.target / p.accuracy));
  return (
    <div
      className="mt-3 h-1.5 overflow-hidden rounded-full bg-ink-100"
      role="progressbar"
      aria-label="Position accuracy"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(ratio * 100)}
    >
      <motion.div
        className="h-full rounded-full bg-primary-600"
        initial={false}
        animate={{ width: `${ratio * 100}%` }}
        transition={{ duration: duration.slow, ease: easing.standard }}
      />
    </div>
  );
}

function CheckInPanel({ today }: { today: Today }) {
  const { state, run, reset } = useCheckIn(today.rules);
  const [missionOpen, setMissionOpen] = useState(false);
  const busy = !['idle', 'error', 'done'].includes(state.step);
  const gps = today.available_check_ins.includes('gps');
  const remote = today.available_check_ins.includes('remote');
  const mission = today.available_check_ins.includes('mission');
  const faceState = today.faceid_state ?? 'ready';
  const faceRequired = today.rules.faceid_required !== false;
  const problem = state.problem;

  if (faceRequired && faceState !== 'ready')
    return (
      <CardBody>
        <FaceIdSetup state={faceState} />
      </CardBody>
    );

  return (
    <CardBody>
      <AnimatePresence mode="wait" initial={false}>
        {busy ? (
          <motion.div
            key="busy"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: duration.base, ease: easing.standard }}
            aria-live="polite"
            data-testid="checkin-progress"
          >
            <Stepper steps={FLOW_STEPS} current={flowIndex(state)} />
            <p className="mt-4 text-sm font-medium text-ink-800">
              <ProgressText s={state} />
            </p>
            <AccuracyBar s={state} />
            <Button variant="ghost" className="mt-3" onClick={reset}>
              Cancel
            </Button>
          </motion.div>
        ) : (
          <motion.div
            key="actions"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: duration.base, ease: easing.standard }}
          >
            <h2 className="text-base font-semibold text-ink-900">You have not checked in yet</h2>
            <p className="mt-1 text-sm text-ink-600">
              {remote
                ? 'Today is one of your remote days: check in remotely in one tap.'
                : 'At the office, tap the button: we check your location, then Face ID.'}
              {today.rules.late_after
                ? ` Check-ins after ${today.rules.late_after} count as late.`
                : ''}
            </p>
            <AnimatePresence initial={false}>
              {problem && (
                <motion.div
                  key={problem.kind}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4"
                >
                  <Alert
                    tone={problem.kind === 'faceid_setup' ? 'warning' : 'danger'}
                    title={problem.title}
                  >
                    {problem.message}
                  </Alert>
                </motion.div>
              )}
            </AnimatePresence>
            <div className="mt-5 flex flex-col gap-2">
              {remote && (
                <Button size="lg" block onClick={() => void run('remote')}>
                  Check in remotely
                </Button>
              )}
              {gps && (
                <Button
                  size="lg"
                  block
                  variant={remote ? 'outline' : 'primary'}
                  onClick={() => void run('gps')}
                >
                  {problem && problem.kind !== 'out_of_perimeter'
                    ? 'Try again'
                    : 'Check in at the office'}
                </Button>
              )}
              {mission && (
                <Button
                  variant={problem?.kind === 'out_of_perimeter' ? 'secondary' : 'ghost'}
                  block
                  onClick={() => setMissionOpen(true)}
                >
                  Working outside today? Mission check-in
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <MissionDialog
        open={missionOpen}
        onClose={() => setMissionOpen(false)}
        onSubmit={(reason) => {
          setMissionOpen(false);
          void run('mission', reason);
        }}
      />
    </CardBody>
  );
}

function CheckedInPanel({ today }: { today: Today }) {
  const a = today.attendance!;
  const [open, setOpen] = useState(false);
  return (
    <CardBody>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-ink-900">
          {today.checked_out
            ? 'Your day is complete'
            : `Checked in at ${formatTime(a.check_in_at)}`}
        </h2>
        <AttendanceBadges a={a} />
      </div>
      {a.check_in_type === 'mission' && a.mission_status === 'pending' && (
        <p className="mt-2 text-sm text-ink-600">
          Your mission check-in is waiting for an administrator. You can already use the app.
        </p>
      )}
      <div className="mt-4">
        <AttendanceDetails a={a} />
      </div>
      {!today.checked_out && (
        <>
          <Button size="lg" block className="mt-5" onClick={() => setOpen(true)}>
            Check out
          </Button>
          <p className="mt-2 text-xs text-ink-500">
            You can check out from anywhere.
            {today.rules.end_of_day
              ? ` Before ${today.rules.end_of_day} you will be asked for a reason.`
              : ''}
          </p>
          <CheckOutDialog open={open} onClose={() => setOpen(false)} rules={today.rules} />
        </>
      )}
    </CardBody>
  );
}

function NotExpected({ today }: { today: Today }) {
  if (today.expected) return null;
  const why =
    today.day_status === 'holiday'
      ? `Today is a public holiday${today.holiday_name ? ` (${today.holiday_name})` : ''}.`
      : today.day_status === 'leave'
        ? 'You are on leave today.'
        : today.day_status === 'day_off'
          ? 'Today is your day off.'
          : 'Today is not a working day.';
  return (
    <Alert tone="info" title="You are not expected today">
      {why} You can still check in if you are working.
    </Alert>
  );
}

/** Employee home: server clock, today's status and the next action. */
export function TodayPage() {
  const { data: me } = useMe();
  const today = useToday();
  const schedule = useMySchedule();
  const t = today.data;

  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="show"
      className="mx-auto flex max-w-xl flex-col gap-4"
    >
      <InAppBrowserNotice />
      <motion.div variants={fadeUp}>
        <h1 className="text-sm font-medium text-ink-500">Hello {me?.first_name}</h1>
        <ServerClock />
        <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-ink-600">
          {t ? formatDate(t.work_date) : <Skeleton className="h-4 w-32" />}
          {t && <DayStatusBadge status={t.day_status} />}
        </p>
      </motion.div>

      {today.isError && !t && (
        <Alert tone="danger" title="Today's status could not be loaded">
          You appear to be offline or the service is busy. Check-in needs an internet connection.
          <Button variant="outline" size="sm" className="mt-2" onClick={() => void today.refetch()}>
            Try again
          </Button>
        </Alert>
      )}
      {!t && today.isPending && <Skeleton className="h-48 w-full" />}

      {t && (
        <>
          <motion.div variants={fadeUp}>
            <NotExpected today={t} />
          </motion.div>
          <motion.div variants={fadeUp}>
            <Card data-testid="today-card">
              {t.checked_in && t.attendance ? (
                <CheckedInPanel today={t} />
              ) : (
                <CheckInPanel today={t} />
              )}
            </Card>
          </motion.div>
        </>
      )}

      {schedule.data && !schedule.data.selected && (
        <motion.div variants={fadeUp}>
          <Card>
            <CardBody>
              <p className="font-semibold text-ink-900">Choose your days off and remote days</p>
              <p className="mt-1 text-sm text-ink-600">
                Select them once, as in your contract. After saving, only an administrator can
                change them.
              </p>
              <Link
                to="/app/attendance/schedule"
                className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-primary-700 hover:underline"
              >
                Choose my days
              </Link>
            </CardBody>
          </Card>
        </motion.div>
      )}
      <motion.div variants={fadeUp}>
        <PushPrompt />
      </motion.div>
      <motion.div variants={fadeUp}>
        <InstallCard />
      </motion.div>
      <motion.div variants={fadeUp}>
        <Link
          to="/app/attendance/history"
          className="inline-flex min-h-11 items-center text-sm font-semibold text-primary-700 hover:underline"
        >
          See my attendance history
        </Link>
      </motion.div>
    </motion.div>
  );
}
