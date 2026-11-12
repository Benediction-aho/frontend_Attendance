import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { renderAt } from '../../test/render';
import { ApiError, errorMessage, parseRetryAfter, throttleMessage } from '../../lib/api';
import { describeLoginError, normalizeSecret } from '../auth/loginErrors';
import { signOutMessage } from '../auth/signOutReason';
import { friendlyServerMessage, parseInput, boundsHint } from '../../lib/settings';
import { notificationTarget } from '../notifications/target';
import { SignInPage } from '../auth/SignInPage';
import { ConfirmEmailPage } from '../auth/ConfirmEmailPage';
import { Gate } from '../auth/guards';
import { SettingsPage } from '../admin/SettingsPage';
import { ToastProvider, useToast } from '../../ui/Toast';
import { Modal } from '../../ui/Modal';
import { invalidateSession, setToken, takeSignOutReason } from '../../lib/session';
import type { Setting } from '../../lib/types';

const reply = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  vi.fn(
    async () =>
      new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json', ...headers },
      }),
  );

const err = (status: number, body: unknown, header?: number) =>
  new ApiError('client', status, 'x', body, header);

describe('UX2-01 codes pasted with spaces', () => {
  it('trims generated codes but keeps chosen passwords as typed', () => {
    expect(normalizeSecret(' AB3K9QZT ')).toBe('AB3K9QZT');
    expect(normalizeSecret('my pass phrase ')).toBe('my pass phrase ');
    expect(normalizeSecret('p@ss word! ')).toBe('p@ss word! ');
  });

  it('sends the trimmed code from the sign-in form', async () => {
    setToken(null);
    const f = reply(401, { code: 'invalid_credentials', message: 'x' });
    vi.stubGlobal('fetch', f);
    renderAt(<SignInPage />, '/sign-in');
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: ' A@B.test ' } });
    fireEvent.change(screen.getByLabelText('Identification code or password'), {
      target: { value: ' AB3K9QZT ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    await screen.findByText('The email or code is incorrect.');
    const body = JSON.parse(
      (f.mock.calls[0] as unknown as [string, RequestInit])[1].body as string,
    );
    expect(body.password).toBe('AB3K9QZT');
    expect(body.email).toBe('A@B.test');
    // UX2-11: generic message plus the pending-approval hint.
    expect(screen.getByText(/may still be awaiting approval/)).toBeInTheDocument();
    vi.unstubAllGlobals();
  });
});

describe('429 messages (UX2-02, UX2-07)', () => {
  it('reads Retry-After as seconds or HTTP date', () => {
    expect(parseRetryAfter('120')).toBe(120);
    expect(parseRetryAfter(new Date(10_000 + 60_000).toUTCString(), 10_000)).toBe(60);
    expect(parseRetryAfter(null)).toBeUndefined();
    expect(parseRetryAfter('soon')).toBeUndefined();
  });

  it('gives the remaining time and a next step', () => {
    const e = err(429, { code: 'too_many_code_requests', retry_after_seconds: 540 });
    expect(throttleMessage(e)).toMatch(/Use the last code you received.*in 9 minutes/);
    expect(errorMessage(err(429, {}, 30))).toMatch(/in 30 s/);
    expect(errorMessage(err(429, {}))).toMatch(/in a few minutes/);
  });

  it('code throttling only blocks asking for a new code', () => {
    const v = describeLoginError(
      err(429, { code: 'too_many_code_requests', retry_after_seconds: 300 }),
    );
    expect(v.requestOnly).toBe(true);
    expect(v.retryAfter).toBe(300);
  });
});

describe('UX2-20 remaining attempts', () => {
  it('warns at the last attempts only', () => {
    expect(
      describeLoginError(err(401, { code: 'invalid_credentials', remaining_attempts: 1 })).hint,
    ).toBe('1 attempt left before sign-in is temporarily blocked.');
    expect(
      describeLoginError(err(401, { code: 'invalid_credentials', remaining_attempts: 4 })).hint,
    ).toBeUndefined();
    expect(describeLoginError(err(401, { code: 'invalid_credentials' })).hint).toBeUndefined();
  });
});

describe('UX2-03 forced sign-out explanation', () => {
  it('keeps a reason even when the 401 has no code', () => {
    setToken('t');
    invalidateSession();
    const r = takeSignOutReason();
    expect(r).toBe('session_ended');
    expect(signOutMessage(r!)).toMatch(/may have been blocked/);
    expect(signOutMessage('account_blocked')).toBe(
      'Your account has been blocked. Contact an administrator.',
    );
  });
});

describe('UX2-04/05 settings validation', () => {
  it('checks bounds from the definition', () => {
    expect(parseInput('-5', 'int', { min: 10, max: 5000 })).toEqual({
      ok: false,
      error: 'Minimum 10.',
    });
    expect(parseInput('6000', 'int', { min: 10, max: 5000 })).toEqual({
      ok: false,
      error: 'Maximum 5000.',
    });
    expect(parseInput('8', 'int_list', { max: 7 })).toEqual({ ok: false, error: 'Maximum 7.' });
    expect(parseInput('60', 'int', { min: 10, max: 5000 })).toEqual({ ok: true, value: 60 });
    expect(boundsHint({ min: 10, max: 5000 })).toBe('Between 10 and 5000.');
    expect(boundsHint({})).toBeNull();
  });

  it('rewrites server messages in plain English', () => {
    expect(
      friendlyServerMessage('The values.checkin radius m field must not be greater than 5000.'),
    ).toBe('Maximum 5000.');
    expect(
      friendlyServerMessage(
        'The effective from field must be a date after or equal to 2026-11-12.',
      ),
    ).toBe('Choose today or a later date.');
    expect(friendlyServerMessage('The values.x field must be at least 10.')).toBe('Minimum 10.');
    expect(friendlyServerMessage('The values.foo bar field is weird.')).toBe(
      'This value is weird.',
    );
  });
});

describe('UX2-14 notification targets', () => {
  const n = (data: Record<string, string>) => ({
    id: '1',
    data,
    read_at: null,
    created_at: '2026-11-12T10:00:00Z',
  });
  it('opens the matching page', () => {
    expect(notificationTarget(n({ kind: 'signup_request', path: '/admin/users/4' }))).toBe(
      '/app/admin/requests',
    );
    expect(notificationTarget(n({ kind: 'account_locked', path: '/admin/users/4' }))).toBe(
      '/app/admin/users/4',
    );
    expect(notificationTarget(n({ path: '/app/profile' }))).toBe('/app/profile');
    expect(notificationTarget(n({ path: '//evil.test' }))).toBeNull();
    expect(notificationTarget(n({ path: 'https://evil.test' }))).toBeNull();
    expect(notificationTarget(n({}))).toBeNull();
  });
});

describe('UX2-15 forbidden deep link', () => {
  it('shows a no-access page instead of a silent redirect', () => {
    renderAt(
      <Gate allowed={false}>
        <p>secret</p>
      </Gate>,
      '/app/admin/settings',
    );
    expect(screen.getByText('You do not have access to this page')).toBeInTheDocument();
    expect(screen.queryByText('secret')).toBeNull();
  });
});

describe('UX2-16 confirm-email reload', () => {
  beforeEach(() => sessionStorage.clear());
  it('shows the last result again after a reload', async () => {
    vi.stubGlobal('fetch', reply(200, { status: 'applied' }));
    window.history.replaceState(null, '', '/confirm-email?token=abc');
    const first = renderAt(<ConfirmEmailPage />, '/confirm-email');
    expect(await screen.findByText(/Your email address has been changed/)).toBeInTheDocument();
    first.unmount();
    // Reload: no token in the address bar any more.
    renderAt(<ConfirmEmailPage />, '/confirm-email');
    expect(screen.getByText(/Your email address has been changed/)).toBeInTheDocument();
    vi.unstubAllGlobals();
  });
});

describe('UX2-10 toasts and sheets', () => {
  function Harness({ open }: { open: boolean }) {
    const t = useToast();
    return (
      <>
        <button onClick={() => t.show('Bad file', 'danger')}>err</button>
        <button onClick={() => t.clear()}>clear</button>
        <Modal open={open} onClose={() => {}} title="Sheet" />
      </>
    );
  }
  it('moves toasts to the top while a sheet is open, and clear removes them', () => {
    window.history.pushState({}, '', '/app');
    const r = render(
      <ToastProvider>
        <Harness open={false} />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByText('err'));
    const region = () => document.querySelector('[aria-live="polite"]')!;
    expect(region().getAttribute('data-position')).toBe('bottom');
    r.rerender(
      <ToastProvider>
        <Harness open />
      </ToastProvider>,
    );
    expect(region().getAttribute('data-position')).toBe('top');
    fireEvent.click(screen.getByText('clear'));
    return waitFor(() => expect(screen.queryByText('Bad file')).toBeNull());
  });
});

describe('UX2-05/06 settings page', () => {
  const settings: Setting[] = [
    {
      key: 'checkin_radius_m',
      label: 'Check-in perimeter radius (m)',
      group: 'attendance',
      type: 'int',
      editable: true,
      value: 50,
      default: 50,
      scheduled: [],
      min: 10,
      max: 5000,
    },
  ];
  afterEach(() => vi.unstubAllGlobals());

  it('validates bounds, keeps the bar compact and warns before leaving', async () => {
    vi.stubGlobal('fetch', reply(200, { data: settings }));
    const { router } = renderAt(<SettingsPage />, '/app/admin/settings', {
      '/app': <p>Home page</p>,
    });
    const field = await screen.findByLabelText('Check-in perimeter radius (m)');
    expect(screen.getByText('Between 10 and 5000.')).toBeInTheDocument();
    fireEvent.change(field, { target: { value: '-5' } });
    expect(screen.getByText('Minimum 10.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save now' })).toBeDisabled();
    fireEvent.change(field, { target: { value: '60' } });
    expect(screen.getByText(/1 unsaved change/)).toBeInTheDocument();
    // Date field hidden behind "Schedule for later".
    expect(screen.queryByLabelText('Apply from')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Schedule for later' }));
    expect(screen.getByLabelText('Apply from')).toHaveAttribute('min');
    // Bar steps aside while a field has focus (phone keyboard).
    fireEvent.focus(field);
    expect(screen.getByTestId('unsaved-bar').className).toContain('max-md:hidden');
    fireEvent.blur(field);
    await act(() => router.navigate('/app'));
    expect(screen.getByText('Leave without saving?')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Stay on this page' }));
    expect(router.state.location.pathname).toBe('/app/admin/settings');
    await act(() => router.navigate('/app'));
    fireEvent.click(screen.getByRole('button', { name: 'Discard changes' }));
    expect(await screen.findByText('Home page')).toBeInTheDocument();
  });
});
