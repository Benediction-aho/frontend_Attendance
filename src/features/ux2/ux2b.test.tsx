import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { renderAt } from '../../test/render';
import { photoReadError } from '../../lib/image';
import { setToken } from '../../lib/session';
import { SignInPage } from '../auth/SignInPage';
import { loadNotice, markSignedInHere, saveNotice } from '../auth/signInNotice';
import { ToastProvider, useToast } from '../../ui/Toast';
import { render } from '@testing-library/react';

const reply = (status: number, body: unknown) =>
  vi.fn(
    async () =>
      new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
      }),
  );

async function failSignIn() {
  renderAt(<SignInPage />, '/sign-in');
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'a@b.test' } });
  fireEvent.change(screen.getByLabelText('Identification code or password'), {
    target: { value: 'wrong' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
}

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
  sessionStorage.clear();
});

describe('UX2-22 unreadable photo', () => {
  it('explains a too large or unreadable file', () => {
    expect(photoReadError({ size: 12 * 1024 * 1024 })).toContain('12 MB');
    expect(photoReadError({ size: 2000 })).toBe('This photo could not be read. Try another one.');
  });
});

describe('UX2-23 sign-in notice survives a reload', () => {
  it('stores with an expiry', () => {
    saveNotice({ reason: 'Blocked.' }, 1000);
    expect(loadNotice()?.reason).toBe('Blocked.');
    expect(loadNotice(Date.now() + 2000)).toBeNull();
  });

  it('restores the lockout countdown after a reload', async () => {
    setToken(null);
    vi.stubGlobal('fetch', reply(429, { code: 'login_blocked', retry_after_seconds: 600 }));
    await failSignIn();
    await screen.findByText(/Too many failed attempts/);
    const first = renderAt(<SignInPage />, '/sign-in');
    expect(first.getAllByText(/Too many failed attempts/).length).toBeGreaterThan(1);
  });
});

describe('UX2-24 approval hint only for a browser that never signed in', () => {
  it('shows the hint on an unknown browser', async () => {
    setToken(null);
    vi.stubGlobal('fetch', reply(401, { code: 'invalid_credentials', message: 'x' }));
    await failSignIn();
    await screen.findByText('The email or code is incorrect.');
    expect(screen.getByText(/awaiting approval/)).toBeInTheDocument();
  });

  it('hides it after a successful sign-in from this browser', async () => {
    setToken(null);
    markSignedInHere();
    vi.stubGlobal('fetch', reply(401, { code: 'invalid_credentials', message: 'x' }));
    await failSignIn();
    await screen.findByText('The email or code is incorrect.');
    expect(screen.queryByText(/awaiting approval/)).toBeNull();
  });
});

describe('UX2-21 toasts never cover onboarding actions', () => {
  it('puts toasts at the top outside the app shell', async () => {
    window.history.pushState({}, '', '/welcome/faceid');
    function Btn() {
      const t = useToast();
      return <button onClick={() => t.show('Your password is set.')}>go</button>;
    }
    const { container } = render(
      <ToastProvider>
        <Btn />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByText('go'));
    expect(container.querySelector('[data-position]')?.getAttribute('data-position')).toBe('top');
    window.history.pushState({}, '', '/');
  });
});
