import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'motion/react';
import { Link, useLocation, useNavigate } from 'react-router';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Field';
import { Alert } from '../../ui/Alert';
import { fadeUp, stagger } from '../../ui/motion';
import { formatCountdown } from '../../lib/format';
import { AuthLayout, AuthTitle } from './AuthLayout';
import { describeLoginError, stamped, type LoginErrorView } from './loginErrors';
import { signIn } from './useSession';
import { rememberFirstCode } from './pendingCode';
import { useCountdown } from './useCountdown';
import { takeSignOutReason } from '../../lib/session';

const schema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Enter your email address.')
    .email('Enter a valid email address.'),
  password: z.string().min(1, 'Enter your identification code or password.'),
});
type Values = z.infer<typeof schema>;

export function SignInPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;
  const [error, setError] = useState<(LoginErrorView & { at: number }) | null>(null);
  const [reason] = useState(() => {
    const r = takeSignOutReason();
    if (r === 'reauth_limit')
      return 'For your security you were signed out after too many incorrect password attempts. Sign in again.';
    return r ? 'Your session has ended. Please sign in again.' : null;
  });
  const remaining = useCountdown(error?.retryAfter, error?.at);
  const waiting = remaining > 0;
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = handleSubmit(async (v) => {
    setError(null);
    try {
      const res = await signIn(v.email, v.password);
      if (res.must_change_password) {
        rememberFirstCode(v.password);
        navigate('/welcome/code', { replace: true });
      } else navigate(from && from.startsWith('/app') ? from : '/app', { replace: true });
    } catch (e) {
      setError(stamped(describeLoginError(e)));
    }
  });

  return (
    <AuthLayout
      step={3}
      footer={
        <Link
          to="/sign-in/super-admin"
          className="inline-flex min-h-11 items-center px-2 hover:text-primary-700 hover:underline"
        >
          Super admin sign-in
        </Link>
      }
    >
      <motion.div variants={stagger} initial="hidden" animate="show">
        <motion.div variants={fadeUp}>
          <AuthTitle
            title="Sign in"
            subtitle="Use your work email and the identification code you received by email."
          />
        </motion.div>
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
          {reason && !error && <Alert tone="warning">{reason}</Alert>}
          {error && (
            <Alert tone={error.locked || error.retryAfter ? 'warning' : 'danger'}>
              {error.message}
              {waiting && (
                <>
                  {' '}
                  Try again in{' '}
                  <strong className="tabular-nums">{formatCountdown(remaining)}</strong>.
                </>
              )}
            </Alert>
          )}
          <motion.div variants={fadeUp}>
            <Input
              label="Email"
              type="email"
              autoComplete="username"
              inputMode="email"
              autoCapitalize="none"
              spellCheck={false}
              error={errors.email?.message}
              {...register('email')}
            />
          </motion.div>
          <motion.div variants={fadeUp}>
            <Input
              label="Identification code or password"
              type="password"
              autoComplete="current-password"
              error={errors.password?.message}
              hint="First time? Use the code from your approval email."
              {...register('password')}
            />
          </motion.div>
          <motion.div variants={fadeUp} className="pt-1">
            <Button type="submit" size="lg" block loading={isSubmitting} disabled={waiting}>
              {waiting ? `Try again in ${formatCountdown(remaining)}` : 'Sign in'}
            </Button>
          </motion.div>
        </form>
        <motion.div
          variants={fadeUp}
          className="mt-6 border-t border-ink-100 pt-5 text-sm text-ink-600"
        >
          <p>
            New to Assistance Ghana?{' '}
            <Link to="/sign-up" className="font-semibold text-primary-700 hover:underline">
              Request an account
            </Link>
          </p>
          <p className="mt-2">Lost your code? Ask an administrator to send you a new one.</p>
        </motion.div>
      </motion.div>
    </AuthLayout>
  );
}
