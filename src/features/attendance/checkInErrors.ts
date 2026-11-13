import { ApiError, throttleMessage } from '../../lib/api';
import { formatDistance } from '../../lib/attendance';
import { detectPlatform, type Platform } from '../../lib/browser';
import { GeoError } from '../../lib/geo';
import { PasskeyError } from '../../lib/webauthn';

export type CheckInProblemKind =
  | 'offline'
  | 'gps'
  | 'low_accuracy'
  | 'out_of_perimeter'
  | 'faceid_cancelled'
  | 'faceid_unsupported'
  | 'faceid_failed'
  | 'faceid_setup'
  | 'expired'
  | 'already'
  | 'not_remote_day'
  | 'reason_required'
  | 'throttled'
  | 'staff'
  | 'unknown';

export interface CheckInProblem {
  kind: CheckInProblemKind;
  title: string;
  message: string;
  /** Code from the API when the problem is about Face ID readiness. */
  faceidState?: 'not_registered' | 'pending_approval' | 'other_device';
  /** Numbered steps to follow (location permission help for the detected phone). */
  steps?: string[];
  /** Short hint shown under the message (e.g. position may improve). */
  hint?: string;
  /** Imprecise position close to the edge: the user is probably at the office. */
  nearEdge?: boolean;
}

/** Steps to allow location access, for the detected platform only. */
export const LOCATION_STEPS: Record<Platform, string[]> = {
  ios: [
    'Open the Settings app on your iPhone.',
    'Tap Privacy & Security, then Location Services.',
    'Make sure Location Services is on.',
    'Tap Safari Websites (or Attendance if you installed the app) and choose "While Using the App".',
    'Come back here and tap "Try again".',
  ],
  android: [
    'Tap the lock icon next to the address at the top of Chrome.',
    'Tap Permissions, then Location.',
    'Choose Allow.',
    'Make sure Location is on in your quick settings.',
    'Come back here and tap "Try again".',
  ],
  desktop: [
    'Click the lock icon next to the address in your browser.',
    'Set Location to Allow.',
    'Reload the page and try again.',
  ],
};

export interface ProblemContext {
  /** Accuracy (metres) of the position that was sent, when known. */
  accuracy?: number | null;
}

function num(body: unknown, key: string): number | undefined {
  const v = (body as Record<string, unknown> | null)?.[key];
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
}

/** Clear English message for every way a check-in can fail. Values come from the API. */
export function checkInProblem(e: unknown, ctx: ProblemContext = {}): CheckInProblem {
  if (e instanceof GeoError) {
    if (e.kind === 'denied')
      return {
        kind: 'gps',
        title: 'Location needed',
        message: 'Location access is blocked for this app. To allow it:',
        steps: LOCATION_STEPS[detectPlatform()],
      };
    return { kind: 'gps', title: 'Location needed', message: e.message };
  }
  if (e instanceof PasskeyError) {
    if (e.kind === 'cancelled')
      return { kind: 'faceid_cancelled', title: 'Face ID not completed', message: e.message };
    if (e.kind === 'unsupported' || e.kind === 'security')
      return { kind: 'faceid_unsupported', title: 'Face ID unavailable', message: e.message };
    return { kind: 'faceid_failed', title: 'Face ID not completed', message: e.message };
  }
  if (!(e instanceof ApiError))
    return {
      kind: 'unknown',
      title: 'Check-in failed',
      message: 'Something went wrong. Please try again.',
    };
  if (e.kind === 'network')
    return {
      kind: 'offline',
      title: 'You are offline',
      message:
        'Check-in needs an internet connection because the time comes from the server. Connect to mobile data or Wi-Fi and try again.',
    };
  if (e.kind === 'server')
    return {
      kind: 'unknown',
      title: 'Service unavailable',
      message: 'The service is temporarily unavailable. Please try again in a moment.',
    };
  if (e.status === 429)
    return { kind: 'throttled', title: 'Too many attempts', message: throttleMessage(e) };
  switch (e.code) {
    case 'low_accuracy': {
      const acc = num(e.body, 'accuracy_m');
      const max = num(e.body, 'max_accuracy_m');
      return {
        kind: 'low_accuracy',
        title: 'Position not precise enough',
        message: `Your position is accurate to ${formatDistance(acc)}${
          max !== undefined ? `, ${formatDistance(max)} or better is needed` : ''
        }. Move near a window or step outside for a moment, then try again.`,
      };
    }
    case 'out_of_perimeter': {
      const d = num(e.body, 'distance_m');
      const r = num(e.body, 'radius_m');
      const acc = ctx.accuracy ?? undefined;
      // Display hint only: the server alone decides the perimeter.
      const nearEdge = d !== undefined && r !== undefined && acc !== undefined && d - acc <= r;
      return {
        kind: 'out_of_perimeter',
        title: 'You are not at the office',
        message: `You are ${formatDistance(d)} from the office${
          r !== undefined ? `; check-in is allowed within ${formatDistance(r)}` : ''
        }. If you are working outside today, use a mission check-in instead.`,
        ...(nearEdge
          ? {
              nearEdge: true,
              hint: `Your position is only accurate to ${formatDistance(acc)}. If you are at the office, move near a window or step outside for a few seconds, then try again.`,
            }
          : {}),
      };
    }
    case 'faceid_not_registered':
      return {
        kind: 'faceid_setup',
        faceidState: 'not_registered',
        title: 'Set up Face ID first',
        message: 'Face ID is not set up for this app on this phone yet. Set it up, then check in.',
      };
    case 'faceid_pending_approval':
      return {
        kind: 'faceid_setup',
        faceidState: 'pending_approval',
        title: 'Waiting for approval',
        message:
          'This phone is waiting for an administrator to approve it. You can check in once it is approved. If it is urgent, ask an administrator to check you in.',
      };
    case 'faceid_other_device':
      return {
        kind: 'faceid_setup',
        faceidState: 'other_device',
        title: 'Face ID is set up on another phone',
        message:
          'Check in from the phone you registered, or register this phone (an administrator will need to approve it).',
      };
    case 'faceid_failed':
      return {
        kind: 'faceid_failed',
        title: 'Face ID not verified',
        message: 'Face ID could not be verified. Please start the check-in again.',
      };
    case 'intent_invalid':
      return {
        kind: 'expired',
        title: 'Check-in expired',
        message: 'The check-in took too long to confirm. Please start again.',
      };
    case 'already_checked_in':
      return {
        kind: 'already',
        title: 'Already checked in',
        message: 'You are already checked in today.',
      };
    case 'not_remote_day':
      return {
        kind: 'not_remote_day',
        title: 'Not a remote day',
        message:
          'Today is not one of your remote days. Check in at the office or use a mission check-in.',
      };
    case 'reason_required':
      return { kind: 'reason_required', title: 'Reason needed', message: 'Please enter a reason.' };
    case 'location_required':
      return {
        kind: 'gps',
        title: 'Location needed',
        message: 'Your position is needed for this check-in. Allow location access and try again.',
      };
    case 'employees_only':
      return {
        kind: 'staff',
        title: 'Not available',
        message: 'Check-in is for employees only.',
      };
    default:
      return { kind: 'unknown', title: 'Check-in failed', message: e.message };
  }
}

/** API low_accuracy refusals are retried automatically while the reading improves. */
export const MAX_ACCURACY_RETRIES = 3;

/** Total time spent waiting for a precise enough position before giving a clear message. */
export const LOCATE_BUDGET_MS = 30_000;

/** After this wait, suggest moving near a window. */
export const LOCATE_HINT_AFTER_MS = 10_000;

/** After this many Face ID failures in a row, offer to register Face ID again. */
export const FACEID_FAILURES_BEFORE_HELP = 2;
