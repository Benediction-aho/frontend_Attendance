import { useEffect, useState } from 'react';
import {
  CHECK_IN_TYPE_LABEL,
  checkOutPlace,
  DAY_STATUS_LABEL,
  formatClock,
  formatDistance,
  formatTime,
  missionLabel,
  type Attendance,
  type DayStatus,
} from '../../lib/attendance';
import { formatDate } from '../../lib/format';
import { isServerTimeSynced, serverNow } from '../../lib/serverTime';
import { Badge, type Tone } from '../../ui/Badge';

/** Clock synchronised with the server (never the raw device clock). */
export function ServerClock() {
  const [now, setNow] = useState(serverNow);
  useEffect(() => {
    const id = setInterval(() => setNow(serverNow()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <p
      className="text-4xl font-semibold tracking-tight text-ink-900 tabular-nums sm:text-5xl"
      aria-label={`Office time ${formatClock(now).slice(0, 5)}`}
      data-testid="server-clock"
      data-synced={isServerTimeSynced() ? 'true' : 'false'}
    >
      {formatClock(now)}
    </p>
  );
}

const DAY_TONE: Record<DayStatus, Tone> = {
  working: 'primary',
  remote: 'primary',
  day_off: 'neutral',
  holiday: 'accent',
  leave: 'accent',
  non_working: 'neutral',
};

export function DayStatusBadge({ status }: { status: DayStatus }) {
  return <Badge tone={DAY_TONE[status]}>{DAY_STATUS_LABEL[status]}</Badge>;
}

export function MissionBadge({ status }: { status: Attendance['mission_status'] }) {
  const label = missionLabel(status);
  if (!label) return null;
  const tone: Tone =
    status === 'approved' ? 'success' : status === 'rejected' ? 'danger' : 'accent';
  return <Badge tone={tone}>Mission: {label.toLowerCase()}</Badge>;
}

/** Badges for an attendance; lateness only when the API returned it. */
export function AttendanceBadges({ a }: { a: Attendance }) {
  return (
    <span className="flex flex-wrap gap-1.5">
      {typeof a.is_late === 'boolean' &&
        (a.is_late ? <Badge tone="warning">Late</Badge> : <Badge tone="success">On time</Badge>)}
      {a.check_in_type === 'mission' && <MissionBadge status={a.mission_status} />}
      {a.check_in_type === 'remote' && <Badge tone="primary">Remote</Badge>}
      {a.check_in_type === 'admin_on_behalf' && <Badge>By an administrator</Badge>}
      {a.checkout_forgotten && <Badge tone="warning">Check-out forgotten</Badge>}
      {a.early_leave && <Badge tone="accent">Left early</Badge>}
    </span>
  );
}

/** One attendance as a definition list (history card, admin detail). */
export function AttendanceDetails({ a }: { a: Attendance }) {
  const place = checkOutPlace(a);
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
      <div>
        <dt className="text-ink-500">Check-in</dt>
        <dd className="font-semibold text-ink-900 tabular-nums">{formatTime(a.check_in_at)}</dd>
        <dd className="text-xs text-ink-500">
          {CHECK_IN_TYPE_LABEL[a.check_in_type]}
          {typeof a.check_in_distance_m === 'number' && a.check_in_type === 'gps'
            ? ` · ${formatDistance(a.check_in_distance_m)} from the office`
            : ''}
        </dd>
      </div>
      <div>
        <dt className="text-ink-500">Check-out</dt>
        <dd className="font-semibold text-ink-900 tabular-nums">
          {a.checkout_forgotten ? 'Forgotten' : formatTime(a.check_out_at)}
        </dd>
        {a.checkout_forgotten ? (
          <dd className="text-xs text-ink-500">Closed automatically at midnight</dd>
        ) : (
          place && <dd className="text-xs text-ink-500">{place}</dd>
        )}
      </div>
      {a.reason && (
        <div className="col-span-2">
          <dt className="text-ink-500">Reason</dt>
          {/* Free text is always rendered as plain text. */}
          <dd className="break-words whitespace-pre-line text-ink-800">{a.reason}</dd>
        </div>
      )}
      {a.early_leave_reason && (
        <div className="col-span-2">
          <dt className="text-ink-500">Early check-out reason</dt>
          <dd className="break-words whitespace-pre-line text-ink-800">{a.early_leave_reason}</dd>
        </div>
      )}
      {a.mission_note && (
        <div className="col-span-2">
          <dt className="text-ink-500">Administrator note</dt>
          <dd className="break-words whitespace-pre-line text-ink-800">{a.mission_note}</dd>
        </div>
      )}
    </dl>
  );
}

export function AttendanceDate({ a }: { a: Attendance }) {
  return <span className="font-semibold text-ink-900">{formatDate(a.work_date)}</span>;
}
