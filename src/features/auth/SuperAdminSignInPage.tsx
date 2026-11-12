import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Link, useNavigate } from 'react-router';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Field';
import { Alert } from '../../ui/Alert';
import { Stepper } from '../../ui/Stepper';
import { stepVariants } from '../../ui/motion';
import { api, errorMessage } from '../../lib/api';
import { formatCountdown } from '../../lib/format';
import { getDeviceId } from '../../lib/session';
import { AuthLayout, AuthTitle } from './AuthLayout';
import { describeLoginError, stamped, type LoginErrorView } from './loginErrors';
import { signIn } from './useSession';
import { useCountdown } from './useCountdown';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Super admins sign in with a one-time code sent by email (no stored password). */
export function SuperAdminSignInPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [fieldError, setFieldError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<(LoginErrorView & { at: number }) | null>(null);
  const remaining = useCountdown(error?.retryAfter, error?.at);

  const requestCode = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(null);
    if (!EMAIL_RE.test(email.trim())) {
      setFieldError('Enter a valid email address.');
      return;
    }
    setFieldError(undefined);
    setBusy(true);
    try {
      await api.post('/auth/super-admin/code', { email: email.trim(), device_id: getDeviceId() });
      setNotice(
        'If this address belongs to a super admin, a one-time code is on its way. It expires after a few minutes.',
      );
      setStep(1);
    } catch (err) {
      setError(stamped({ message: errorMessage(err) }));
    } finally {
      setBusy(false);
    }
  };

  const submitCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!code.trim()) {
      setFieldError('Enter the code from the email.');
      return;
    }
    setFieldError(undefined);
    setBusy(true);
    try {
      await signIn(email, code.trim());
      navigate('/app', { replace: true });
    } catch (err) {
      setError(stamped(describeLoginError(err)));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout>
      <AuthTitle
        title="Super admin sign-in"
        subtitle="We email you a one-time code each time you sign in."
      />
      <div className="mb-6">
        <Stepper steps={['Email', 'One-time code']} current={step} />
      </div>
      {error && (
        <Alert tone={error.retryAfter || error.locked ? 'warning' : 'danger'} className="mb-4">
          {error.message}
          {remaining > 0 && (
            <>
              {' '}
              Try again in <strong className="tabular-nums">{formatCountdown(remaining)}</strong>.
            </>
          )}
        </Alert>
      )}
      <AnimatePresence mode="wait" custom={step === 0 ? -1 : 1} initial={false}>
        {step === 0 ? (
          <motion.form
            key="email"
            custom={-1}
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            onSubmit={requestCode}
            noValidate
            className="flex flex-col gap-4"
          >
            <Input
              label="Email"
              type="email"
              inputMode="email"
              autoComplete="username"
              autoCapitalize="none"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={fieldError}
            />
            <Button type="submit" size="lg" block loading={busy}>
              Send me a code
            </Button>
          </motion.form>
        ) : (
          <motion.form
            key="code"
            custom={1}
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            onSubmit={submitCode}
            noValidate
            className="flex flex-col gap-4"
          >
            {notice && <Alert tone="info">{notice}</Alert>}
            <Input
              label="One-time code"
              inputMode="numeric"
              autoComplete="one-time-code"
              className="text-center text-lg tracking-[0.3em] tabular-nums"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\s/g, ''))}
              error={fieldError}
              hint={`Sent to ${email.trim()}`}
            />
            <Button type="submit" size="lg" block loading={busy} disabled={remaining > 0}>
              Sign in
            </Button>
            <div className="flex flex-wrap justify-between gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setStep(0);
                  setCode('');
                  setError(null);
                }}
              >
                Change email
              </Button>
              <Button variant="ghost" size="sm" onClick={() => void requestCode()} disabled={busy}>
                Send a new code
              </Button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
      <div className="mt-6 border-t border-ink-100 pt-5 text-sm text-ink-600">
        <p>
          Sign-in locked?{' '}
          <Link to="/recover" className="font-semibold text-primary-700 hover:underline">
            Get a recovery link
          </Link>
        </p>
        <p className="mt-3">
          <Link
            to="/sign-in"
            className="inline-flex min-h-11 items-center font-medium text-ink-500 hover:text-primary-700"
          >
            Back to staff sign-in
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
