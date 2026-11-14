import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { renderAt } from '../../test/render';
import { SignInPage } from './SignInPage';
import { SignUpPage } from './SignUpPage';
import { getToken, setToken } from '../../lib/session';

const reply = (status: number, body: unknown) =>
  vi.fn(
    async () =>
      new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
      }),
  );

describe('sign-in page', () => {
  beforeEach(() => setToken(null));
  afterEach(() => vi.unstubAllGlobals());

  it('validates fields before calling the API', async () => {
    const f = reply(200, {});
    vi.stubGlobal('fetch', f);
    renderAt(<SignInPage />, '/sign-in');
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByText('Enter your email address.')).toBeInTheDocument();
    expect(f).not.toHaveBeenCalled();
  });

  it('shows the lockout with the remaining time and disables the button', async () => {
    vi.stubGlobal(
      'fetch',
      reply(429, { message: 'x', code: 'login_blocked', retry_after_seconds: 600 }),
    );
    renderAt(<SignInPage />, '/sign-in');
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'a@b.test' } });
    fireEvent.change(screen.getByLabelText('Identification code or password'), {
      target: { value: 'x' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByText(/Too many failed attempts/)).toBeInTheDocument();
    const btn = screen.getByRole('button', { name: /Try again in 10 min 00 s/ });
    expect(btn).toBeDisabled();
  });

  it('sends the device id and stores the token, then forces the code change', async () => {
    const f = reply(200, {
      token: 'tok',
      token_type: 'Bearer',
      must_change_password: true,
      user: {
        id: 1,
        first_name: 'A',
        last_name: 'B',
        full_name: 'A B',
        email: 'a@b.test',
        role: 'employee',
        employee_type: 'intern',
        job_title: 'x',
        status: 'active',
      },
    });
    vi.stubGlobal('fetch', f);
    renderAt(<SignInPage />, '/sign-in', { '/welcome/code': <p>change code</p> });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'a@b.test' } });
    fireEvent.change(screen.getByLabelText('Identification code or password'), {
      target: { value: 'CODE123456' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByText('change code')).toBeInTheDocument();
    const body = JSON.parse(
      (f.mock.calls[0] as unknown as [string, RequestInit])[1].body as string,
    );
    expect(body.device_id).toMatch(/^[A-Za-z0-9_-]{16,}$/);
    expect(getToken()).toBe('tok');
  });
});

describe('sign-up page', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('guides through two steps and sends the request', async () => {
    const f = reply(202, { message: 'ok' });
    vi.stubGlobal('fetch', f);
    renderAt(<SignUpPage />, '/sign-up', { '/sign-up/sent': <p>sent page</p> });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(await screen.findByText('Enter your first name.')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('First name'), { target: { value: 'Ama' } });
    fireEvent.change(screen.getByLabelText('Last name'), { target: { value: 'Mensah' } });
    fireEvent.change(screen.getByLabelText('Work email'), { target: { value: 'ama@x.test' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    fireEvent.click(await screen.findByLabelText('Intern'));
    fireEvent.change(screen.getByLabelText('Job title'), { target: { value: 'Analyst' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send request' }));
    expect(await screen.findByText('sent page')).toBeInTheDocument();
    await waitFor(() => expect(f).toHaveBeenCalledTimes(1));
    const body = JSON.parse(
      (f.mock.calls[0] as unknown as [string, RequestInit])[1].body as string,
    );
    expect(body).toEqual({
      first_name: 'Ama',
      last_name: 'Mensah',
      email: 'ama@x.test',
      employee_type: 'intern',
      job_title: 'Analyst',
    });
  });

  it('requires a type, and asks for a text when "Other" is chosen', async () => {
    const f = reply(202, { message: 'ok' });
    vi.stubGlobal('fetch', f);
    renderAt(<SignUpPage />, '/sign-up', { '/sign-up/sent': <p>sent page</p> });
    fireEvent.change(screen.getByLabelText('First name'), { target: { value: 'Yaw' } });
    fireEvent.change(screen.getByLabelText('Last name'), { target: { value: 'Owusu' } });
    fireEvent.change(screen.getByLabelText('Work email'), { target: { value: 'yaw@x.test' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    fireEvent.change(await screen.findByLabelText('Job title'), { target: { value: 'Desk' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send request' }));
    expect(await screen.findByText('Choose Intern, Employee or Other.')).toBeInTheDocument();

    expect(screen.queryByLabelText('Please specify')).not.toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Other'));
    fireEvent.click(screen.getByRole('button', { name: 'Send request' }));
    expect(await screen.findByText('Tell us what you are joining as.')).toBeInTheDocument();
    expect(f).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('Please specify'), {
      target: { value: ' National service ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send request' }));
    expect(await screen.findByText('sent page')).toBeInTheDocument();
    const body = JSON.parse(
      (f.mock.calls[0] as unknown as [string, RequestInit])[1].body as string,
    );
    expect(body.employee_type).toBe('other');
    expect(body.employee_type_other).toBe('National service');
  });
});
