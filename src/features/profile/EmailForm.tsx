import { useState } from 'react';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Field';
import { Alert } from '../../ui/Alert';
import { ApiError, api, errorMessage } from '../../lib/api';
import type { User } from '../../lib/types';
import { formatCountdown } from '../../lib/format';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Email change: a confirmation link goes to the new address, an alert to the current one. */
export function EmailForm({ user }: { user: User }) {
  const superAdmin = user.role === 'super_admin';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; current_password?: string }>({});
  const [result, setResult] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResult(null);
    const errs: typeof errors = {};
    if (!EMAIL_RE.test(email.trim())) errs.email = 'Enter a valid email address.';
    if (!superAdmin && !password) errs.current_password = 'Enter your password to confirm.';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      await api.post('/me/email', {
        email: email.trim(),
        ...(superAdmin ? {} : { current_password: password }),
      });
      setResult({
        tone: 'success',
        text: superAdmin
          ? `Check ${email.trim()} and your current inbox: the change must be confirmed from both addresses.`
          : `If ${email.trim()} can be used, a confirmation link is on its way. The change applies once you open it.`,
      });
      setEmail('');
      setPassword('');
    } catch (err) {
      if (err instanceof ApiError && err.status === 422) {
        const map: Record<string, string> = {
          wrong_password: 'This password is incorrect.',
          same_email: 'This is already your email address.',
        };
        if (err.code === 'wrong_password') setErrors({ current_password: map.wrong_password });
        else if (err.code && map[err.code]) setErrors({ email: map[err.code] });
        else
          setErrors({
            email: err.fieldErrors.email,
            current_password: err.fieldErrors.current_password,
          });
      } else if (err instanceof ApiError && err.status === 429) {
        setResult({
          tone: 'danger',
          text:
            err.code === 'login_blocked'
              ? `Too many incorrect attempts. Try again in ${formatCountdown(err.retryAfterSeconds ?? 60)}.`
              : 'Too many requests. Please wait a few minutes before trying again.',
        });
      } else setResult({ tone: 'danger', text: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <p className="text-sm text-ink-600">
        Current address: <span className="font-semibold text-ink-800">{user.email}</span>
      </p>
      {result && <Alert tone={result.tone}>{result.text}</Alert>}
      <Input
        label="New email"
        type="email"
        inputMode="email"
        autoComplete="email"
        autoCapitalize="none"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={errors.email}
      />
      {!superAdmin && (
        <Input
          label="Current password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.current_password}
        />
      )}
      <Button type="submit" variant="outline" loading={busy} className="self-start">
        Send confirmation link
      </Button>
    </form>
  );
}
