import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Field';
import { Alert } from '../../ui/Alert';
import { Spinner } from '../../ui/Spinner';
import { ApiError, api, errorMessage } from '../../lib/api';
import { AuthLayout, AuthTitle } from './AuthLayout';
import { useUrlToken } from './useUrlToken';

type State =
  | { kind: 'idle' }
  | { kind: 'busy' }
  | { kind: 'ok'; message: string }
  | { kind: 'error'; message: string };

/** Super admin recovery: request a link by email, or use the link (/recover?token=…). */
export function RecoverPage() {
  const token = useUrlToken();
  const [state, setState] = useState<State>(token ? { kind: 'busy' } : { kind: 'idle' });
  const [email, setEmail] = useState('');
  const done = useRef(false);

  useEffect(() => {
    if (!token || done.current) return;
    done.current = true;
    api
      .post('/auth/recovery/confirm', { token })
      .then(() =>
        setState({
          kind: 'ok',
          message: 'Access restored. You can now sign in with a new one-time code.',
        }),
      )
      .catch((e) =>
        setState({
          kind: 'error',
          message:
            e instanceof ApiError && e.status === 422
              ? 'This link is invalid or has expired. Request a new one below.'
              : errorMessage(e),
        }),
      );
  }, [token]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setState({ kind: 'busy' });
    try {
      await api.post('/auth/recovery', { email: email.trim() });
      setState({
        kind: 'ok',
        message:
          'If this address belongs to a locked super admin account, a recovery link has been sent. It expires soon, so use it quickly.',
      });
    } catch (err) {
      setState({ kind: 'error', message: errorMessage(err) });
    }
  };

  if (token && state.kind === 'busy')
    return (
      <AuthLayout>
        <AuthTitle title="Restoring access" />
        <div className="flex justify-center py-6 text-primary-600">
          <Spinner label="Checking your link" />
        </div>
      </AuthLayout>
    );

  return (
    <AuthLayout>
      <AuthTitle title="Account recovery" subtitle="For super admins whose sign-in is locked." />
      {state.kind === 'ok' ? (
        <div className="flex flex-col gap-4">
          <Alert tone="success">{state.message}</Alert>
          <Link
            to="/sign-in/super-admin"
            className="flex min-h-12 items-center justify-center rounded-control bg-primary-600 font-semibold text-white hover:bg-primary-700"
          >
            Go to super admin sign-in
          </Link>
        </div>
      ) : (
        <form onSubmit={submit} noValidate className="flex flex-col gap-4">
          {state.kind === 'error' && <Alert tone="danger">{state.message}</Alert>}
          <Input
            label="Email"
            type="email"
            inputMode="email"
            autoComplete="username"
            autoCapitalize="none"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Button
            type="submit"
            size="lg"
            block
            loading={state.kind === 'busy'}
            disabled={!email.trim()}
          >
            Send recovery link
          </Button>
          <Link
            to="/sign-in/super-admin"
            className="inline-flex min-h-11 items-center text-sm font-medium text-ink-500 hover:text-primary-700"
          >
            Back to sign-in
          </Link>
        </form>
      )}
    </AuthLayout>
  );
}
