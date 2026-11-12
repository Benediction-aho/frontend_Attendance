/** Banner shown on the sign-in page after the server ended the session (reason code from the 401). */
export function signOutMessage(reason: string): string {
  switch (reason) {
    case 'reauth_limit':
      return 'For your security you were signed out after too many incorrect password attempts. Sign in again.';
    case 'account_blocked':
      return 'Your account has been blocked. Contact an administrator.';
    case 'account_locked':
      return 'Your account has been locked. Ask an administrator to unlock it.';
    case 'account_deleted':
      return 'Your account is no longer active. Contact an administrator.';
    default:
      return 'You have been signed out. Sign in again. If it does not work, your account may have been blocked: contact an administrator.';
  }
}
