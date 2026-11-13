import { EmployeeOverview } from '../dashboard/EmployeeOverview';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router';
import { formatDistance, type Today } from '../../lib/attendance';
import { Badge } from '../../ui/Badge';
import { formatDate } from '../../lib/format';
import { Alert } from '../../ui/Alert';
import { Button } from '../../ui/Button';
import { Card, CardBody } from '../../ui/Card';
import { Skeleton } from '../../ui/Skeleton';
import { Stepper } from '../../ui/Stepper';
import { duration, easing, fadeUp, stagger } from '../../ui/motion';
import { useMe } from '../auth/useSession';
import { FaceIdSetup } from '../faceid/FaceIdSetup';
import { useMyFaceId } from '../faceid/useFaceId';
import { InAppBrowserNotice } from '../pwa/InAppBrowserNotice';
import { InstallCard } from '../pwa/InstallGuide';
import { PushPrompt } from '../pwa/PushSettings';
import { CheckOutDialog, looksBeforeEndOfDay } from './CheckOutDialog';
import { MissionDialog } from './MissionDialog';
import { AttendanceBadges, AttendanceDetails, DayStatusBadge, ServerClock } from './parts';
import {
  FACEID_FAILURES_BEFORE_HELP,
  LOCATE_BUDGET_MS,
  LOCATE_HINT_AFTER_MS,
} from './checkInErrors';
import { TODAY_KEY, useMySchedule, useToday } from './useAttendance';
import { useCheckIn, type CheckInState } from './useCheckIn';

const FLOW_STEPS = ['Location', 'Face ID', 'Confirmed'];

function flowIndex(s: CheckInState): number {
  if (s.step === 'done') return 2;
  if (s.step === 'faceid' || s.step === 'confirming') return 1;
  return 0;
}

/** Seconds since the position search started (UI only, never sent to the server). */
function useElapsed(since: number | null): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (since === null) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [since]);
  return since === null ? 0 : Math.max(0, now - since);
}

function ProgressText({ s }: { s: CheckInState }) {
  if (s.step === 'locating') {
    const p = s.progress;
    if (!p || p.accuracy === null) return <>Getting your position…</>;
    const target = p.target !== null ? ` (${formatDistance(p.target)} needed)` : '';
    return (
      <>
        Improving your position: accurate to {formatDistance(p.accuracy)}
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

/** Time spent on the position search, with an early hint when it is slow. */
function LocateTimer({ s }: { s: CheckInState }) {
  const elapsed = useElapsed(s.step === 'locating' ? s.locateStartedAt : null);
  if (s.step !== 'locating' || s.locateStartedAt === null) return null;
  const secs = Math.min(Math.round(elapsed / 1000), LOCATE_BUDGET_MS / 1000);
  return (
    <div className="mt-2" data-testid="locate-timer">
      <p className="text-xs text-ink-500 tabular-nums">
        {secs} s of up to {LOCATE_BUDGET_MS / 1000} s
      </p>
      <AnimatePresence initial={false}>
        {elapsed >= LOCATE_HINT_AFTER_MS && (
          <motion.p
            key="hint"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-2 text-sm text-ink-700"
            data-testid="locate-hint"
          >
            Taking a while? Move near a window or step outside for a moment.
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

/** "Set up again" button, or the pending state when a replacement already waits. */
function ReregisterAction({ onStart }: { onStart: () => void }) {
  const q = useMyFaceId();
  if (q.data?.replacement_pending)
    return (
      <p className="mt-2 font-medium text-ink-900" data-testid="replacement-pending">
        Your new Face ID registration is waiting for an administrator to approve it.
      </p>
    );
  if (q.data && q.data.can_reregister === false) return null;
  return (
    <button
      type="button"
      onClick={onStart}
      className="mt-1 inline-flex min-h-11 items-center font-medium text-primary-700 underline underline-offset-2 hover:text-primary-800"
    >
      Register Face ID again
    </button>
  );
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
  const qc = useQueryClient();
  const [reregister, setReregister] = useState(false);
  const outside = problem?.kind === 'out_of_perimeter';

  // While waiting for Face ID, notice a check-in completed elsewhere (another tab or phone).
  useEffect(() => {
    if (state.step !== 'faceid') return;
    const id = setInterval(() => void qc.invalidateQueries({ queryKey: TODAY_KEY }), 8_000);
    return () => clearInterval(id);
  }, [state.step, qc]);

  if (reregister)
    return (
      <CardBody>
        <FaceIdSetup state="ready" reregister onCancel={() => setReregister(false)} />
      </CardBody>
    );

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
            <LocateTimer s={state} />
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
            <h2 className="text-base font-semibold text-ink-900">
              {today.expected ? 'You have not checked in yet' : 'Working today?'}
            </h2>
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
                    tone={
                      problem.kind === 'faceid_setup' || problem.kind === 'gps'
                        ? 'warning'
                        : 'danger'
                    }
                    title={problem.title}
                  >
                    {problem.message}
                    {problem.steps && (
                      <ol className="mt-2 flex flex-col gap-1.5" data-testid="location-steps">
                        {problem.steps.map((st, i) => (
                          <li key={st} className="flex gap-2">
                            <span className="font-semibold tabular-nums">{i + 1}.</span>
                            <span>{st}</span>
                          </li>
                        ))}
                      </ol>
                    )}
                  </Alert>
                  {problem.hint && (
                    <p className="mt-2 text-sm text-ink-700" data-testid="problem-hint">
                      {problem.hint}
                    </p>
                  )}
                  {state.faceIdFailures >= FACEID_FAILURES_BEFORE_HELP &&
                    (problem.kind === 'faceid_failed' || problem.kind === 'faceid_cancelled') && (
                      <div className="mt-2 text-sm text-ink-700" data-testid="faceid-help">
                        <p>
                          Face ID reset on this phone? Register it again; an administrator will
                          approve it.
                        </p>
                        <ReregisterAction onStart={() => setReregister(true)} />
                      </div>
                    )}
                </motion.div>
              )}
            </AnimatePresence>
            <motion.div
              key={outside && mission ? 'outside' : 'normal'}
              variants={fadeUp}
              initial="hidden"
              animate="show"
              className="mt-5 flex flex-col gap-2"
            >
              {outside && mission && problem?.nearEdge && gps ? (
                <>
                  {/* Imprecise position near the edge: probably at the office, retry first. */}
                  <Button size="lg" block onClick={() => void run('gps')}>
                    Try again at the office
                  </Button>
                  <Button variant="outline" block onClick={() => setMissionOpen(true)}>
                    Mission check-in
                  </Button>
                </>
              ) : outside && mission ? (
                <>
                  {/* Out of the perimeter: the mission check-in becomes the one main action. */}
                  <Button size="lg" block onClick={() => setMissionOpen(true)}>
                    Mission check-in
                  </Button>
                  {gps && (
                    <Button variant="outline" block onClick={() => void run('gps')}>
                      Try again at the office
                    </Button>
                  )}
                </>
              ) : (
                <>
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
                      {problem && !outside ? 'Try again' : 'Check in at the office'}
                    </Button>
                  )}
                  {mission && (
                    <Button variant="ghost" block onClick={() => setMissionOpen(true)}>
                      Working outside? Mission check-in
                    </Button>
                  )}
                </>
              )}
            </motion.div>
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

function CheckedInPanel({ today, celebrate }: { today: Today; celebrate: boolean }) {
  const a = today.attendance!;
  const [open, setOpen] = useState(false);
  const reduce = useReducedMotion();
  const animate = celebrate && !reduce;
  return (
    <motion.div
      data-testid="checked-in-panel"
      className="rounded-card"
      initial={animate ? { scale: 0.98, boxShadow: '0 0 0 4px var(--color-success-200)' } : false}
      animate={{ scale: 1, boxShadow: '0 0 0 0px var(--color-success-200)' }}
      transition={{ duration: 0.6, ease: easing.standard }}
    >
      <CardBody>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-ink-900">
            {today.checked_out ? 'Your day is complete' : 'You are checked in'}
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
            <p className="mt-2 text-xs text-ink-500" data-testid="checkout-hint">
              You can check out from anywhere.
              {today.rules.end_of_day && looksBeforeEndOfDay(today.rules)
                ? ` Before ${today.rules.end_of_day} you will be asked for a reason.`
                : ''}
            </p>
            <CheckOutDialog open={open} onClose={() => setOpen(false)} rules={today.rules} />
          </>
        )}
      </CardBody>
    </motion.div>
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
  if (today.checked_in) return null;
  // Nothing to do: the calm rest-day card says it once (UI34-21).
  if (today.available_check_ins.length === 0) return null;
  return (
    <Alert tone="info" title="You are not expected today">
      {why} You can still check in if you are working.
    </Alert>
  );
}

/** Calm card when there is nothing to do today (no check-in type available). */
function RestDay({ today }: { today: Today }) {
  const line =
    today.day_status === 'holiday'
      ? `Public holiday${today.holiday_name ? `: ${today.holiday_name}` : ''}. Enjoy your day.`
      : today.day_status === 'leave'
        ? 'You are on leave. Enjoy your time off.'
        : 'Enjoy your day off.';
  return (
    <CardBody>
      <p className="text-base font-semibold text-ink-900" data-testid="rest-day">
        {line}
      </p>
    </CardBody>
  );
}

/** Employee home: server clock, today's status and the next action. */
export function TodayPage() {
  const { data: me } = useMe();
  const today = useToday();
  const schedule = useMySchedule();
  const t = today.data;
  // Animate the checked-in card only when it appears during this visit (after an action).
  const [seen, setSeen] = useState({ notCheckedIn: false, openDay: false });
  if (t && !t.checked_in && !seen.notCheckedIn) setSeen({ ...seen, notCheckedIn: true });
  if (t?.checked_in && !t.checked_out && !seen.openDay) setSeen({ ...seen, openDay: true });
  const celebrate = t ? (t.checked_out ? seen.openDay : seen.notCheckedIn) : false;
  // Secondary invitations (install, reminders) only once the day's main action is done.
  const mainActionDone =
    !!t &&
    (t.checked_in || (!t.expected && t.available_check_ins.length === 0)) &&
    (t.rules.faceid_required === false || (t.faceid_state ?? 'ready') === 'ready');
  const missionDay = t?.attendance?.check_in_type === 'mission';

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
          {t &&
            (missionDay ? (
              <Badge tone="primary">Mission</Badge>
            ) : (
              <DayStatusBadge status={t.day_status} />
            ))}
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
                <CheckedInPanel today={t} celebrate={celebrate} />
              ) : !t.expected && t.available_check_ins.length === 0 ? (
                <RestDay today={t} />
              ) : (
                <CheckInPanel today={t} />
              )}
            </Card>
          </motion.div>
        </>
      )}

      {t && <EmployeeOverview />}

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
      {mainActionDone && (
        <>
          <motion.div variants={fadeUp}>
            <PushPrompt />
          </motion.div>
          <motion.div variants={fadeUp}>
            <InstallCard />
          </motion.div>
        </>
      )}
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
