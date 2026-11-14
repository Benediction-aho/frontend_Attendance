/**
 * Keeps the identification code typed at first sign-in in memory only (never
 * persisted), so the "choose your password" step does not ask for it again.
 * Lost on reload, in which case the form asks for it.
 */
let code: string | null = null;

export function rememberFirstCode(value: string) {
  code = value;
}

export function peekFirstCode(): string | null {
  return code;
}

export function forgetFirstCode() {
  code = null;
}
