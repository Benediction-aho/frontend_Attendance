import { ApiError, errorMessage, roughWait } from './api';

/** Message for a failed CSV export (429 = hourly limit from the settings). */
export function exportErrorMessage(e: unknown, availableAt?: string): string {
  if (e instanceof ApiError && e.status === 429) {
    const w = e.retryAfterSeconds;
    if (availableAt) {
      return `You have reached the hourly limit of CSV exports. Export is available again at ${availableAt}.`;
    }
    return `You have reached the hourly limit of CSV exports. Try again ${
      w && w > 0 ? `in ${roughWait(w)}` : 'later'
    }.`;
  }
  if (e instanceof ApiError && e.status === 403) return 'Only super admins can export the log.';
  return errorMessage(e);
}

/** File name when the server name cannot be read: still unique per day and time. */
export function fallbackExportName(now: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
    timeZone: 'Africa/Accra',
  }).formatToParts(now);
  const v = (t: string) => parts.find((p) => p.type === t)?.value ?? '00';
  return `activity_log_${v('year')}-${v('month')}-${v('day')}_${v('hour')}${v('minute')}${v('second')}.csv`;
}
