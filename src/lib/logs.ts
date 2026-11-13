import { ApiError, errorMessage, roughWait } from './api';

/** Message for a failed CSV export (429 = hourly limit from the settings). */
export function exportErrorMessage(e: unknown): string {
  if (e instanceof ApiError && e.status === 429) {
    const w = e.retryAfterSeconds;
    return `You have reached the hourly limit of CSV exports. Try again ${
      w && w > 0 ? `in ${roughWait(w)}` : 'later'
    }.`;
  }
  if (e instanceof ApiError && e.status === 403) return 'Only super admins can export the log.';
  return errorMessage(e);
}
