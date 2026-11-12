import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { Alert } from '../../ui/Alert';
import { Spinner } from '../../ui/Spinner';
import { ApiError, api, errorMessage } from '../../lib/api';
import { queryClient } from '../../lib/queryClient';
import { AuthLayout, AuthTitle } from './AuthLayout';
import { useToken } from './useSession';
import { useUrlToken } from './useUrlToken';

export function ConfirmEmailPage() {
  const token = useUrlToken();
  const signedIn = Boolean(useToken());
  const [state, setState] = useState<{
    tone: 'success' | 'info' | 'danger';
    message: string;
  } | null>(
    token
      ? null
      : {
          tone: 'danger',
          message: 'This link is incomplete. Open the link from your email again.',
        },
  );
  const done = useRef(false);

  useEffect(() => {
    if (!token || done.current) return;
    done.current = true;
    api
      .post<{ status: 'applied' | 'pending'; message?: string }>('/auth/email-change/confirm', {
        token,
      })
      .then((r) => {
        void queryClient.invalidateQueries({ queryKey: ['me'] });
        setState(
          r.status === 'pending'
            ? {
                tone: 'info',
                message:
                  'Confirmed. One more step: confirm the change from the link sent to your previous address.',
              }
            : {
                tone: 'success',
                message: 'Your email address has been changed. Use it the next time you sign in.',
              },
        );
      })
      .catch((e) =>
        setState({
          tone: 'danger',
          message:
            e instanceof ApiError && e.code === 'email_unavailable'
              ? 'This email address can no longer be used. Request the change again with another address.'
              : e instanceof ApiError && e.status === 422
                ? 'This link is invalid or has expired. Request the change again from your profile.'
                : errorMessage(e),
        }),
      );
  }, [token]);

  return (
    <AuthLayout>
      <AuthTitle title="Email confirmation" />
      {!state ? (
        <div className="flex justify-center py-6 text-primary-600">
          <Spinner label="Confirming" />
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <Alert tone={state.tone}>{state.message}</Alert>
          <Link
            to={signedIn ? '/app/profile' : '/sign-in'}
            className="flex min-h-12 items-center justify-center rounded-control bg-primary-600 font-semibold text-white hover:bg-primary-700"
          >
            {signedIn ? 'Back to my profile' : 'Go to sign in'}
          </Link>
        </div>
      )}
    </AuthLayout>
  );
}
