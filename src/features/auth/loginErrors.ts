import { ApiError } from '../../lib/api';

export interface LoginErrorView {
  message: string;
  /** Seconds before another attempt is allowed (countdown shown, submit disabled). */
  retryAfter?: number;
  locked?: boolean;
}

/** Generic, non-enumerating messages for every sign-in failure. */
export function describeLoginError(e: unknown): LoginErrorView {
  if (!(e instanceof ApiError)) return { message: 'Something went wrong. Please try again.' };
  if (e.kind === 'network')
    return { message: 'You appear to be offline. Check your connection and try again.' };
  if (e.kind === 'server')
    return { message: 'The service is temporarily unavailable. Please try again in a moment.' };
  switch (e.code) {
    case 'invalid_credentials':
      return { message: 'The email or code is incorrect.' };
    case 'code_expired':
      return { message: 'This code has expired. Ask an administrator for a new one.' };
    case 'account_blocked':
      return { message: 'This account is blocked. Please contact an administrator.' };
    case 'account_locked':
      return {
        message:
          'Sign-in is locked after too many failed attempts. Ask an administrator to unlock your account.',
        locked: true,
      };
    case 'login_blocked':
      return { message: 'Too many failed attempts.', retryAfter: e.retryAfterSeconds ?? 60 };
    case 'ip_limited':
      return {
        message: 'Too many attempts from this network.',
        retryAfter: e.retryAfterSeconds ?? 60,
      };
  }
  if (e.status === 429)
    return { message: 'Too many attempts.', retryAfter: e.retryAfterSeconds ?? 60 };
  if (e.status === 423)
    return {
      message: 'Sign-in is locked. Ask an administrator to unlock your account.',
      locked: true,
    };
  if (e.status === 422) return { message: 'Please check the email and code.' };
  return { message: 'The email or code is incorrect.' };
}

/** Timestamps an error view (countdowns start from it). */
export function stamped<T extends object>(v: T): T & { at: number } {
  return { ...v, at: Date.now() };
}
