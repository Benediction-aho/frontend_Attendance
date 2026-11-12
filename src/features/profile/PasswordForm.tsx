import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Field';
import { Alert } from '../../ui/Alert';
import { ApiError, api } from '../../lib/api';
import type { User } from '../../lib/types';
import { setMe } from '../auth/useSession';
import { formatCountdown } from '../../lib/format';

const schema = z
  .object({
    current_password: z.string().min(1, 'Enter your current code or password.'),
    new_password: z
      .string()
      .min(1, 'Choose a new password.')
      .regex(/[A-Za-z]/, 'Use at least one letter.')
      .regex(/\d/, 'Use at least one digit.'),
    new_password_confirmation: z.string().min(1, 'Type the new password again.'),
  })
  .refine((v) => v.new_password === v.new_password_confirmation, {
    path: ['new_password_confirmation'],
    message: 'The two passwords do not match.',
  });
type Values = z.infer<typeof schema>;

/** Replaces the identification code / password. Length rules are enforced by the server. */
export function PasswordForm({
  currentLabel = 'Current code or password',
  submitLabel = 'Change password',
  onDone,
}: {
  currentLabel?: string;
  submitLabel?: string;
  onDone?: (u: User) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    setError: setFieldError,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema) });

  const onSubmit = handleSubmit(async (v) => {
    setError(null);
    try {
      const res = await api.put<{ data: User }>('/me/password', v);
      reset();
      // Navigate first so the onboarding guard never sees a half-finished state.
      onDone?.(res.data);
      setMe({ ...res.data, must_change_password: false });
    } catch (e) {
      if (e instanceof ApiError && e.status === 422) {
        const fe = e.fieldErrors;
        if (e.code === 'wrong_password')
          setFieldError('current_password', { message: 'This code or password is incorrect.' });
        else if (e.code === 'same_password')
          setFieldError('new_password', {
            message: 'Choose a password different from the current one.',
          });
        for (const [k, m] of Object.entries(fe)) {
          if (k === 'current_password' || k === 'new_password' || k === 'new_password_confirmation')
            setFieldError(k, { message: m });
        }
        if (!Object.keys(fe).length && !e.code) setError(e.message);
      } else if (e instanceof ApiError && e.status === 429) {
        setError(
          `Too many incorrect attempts. Try again in ${formatCountdown(e.retryAfterSeconds ?? 60)}.`,
        );
      } else
        setError(e instanceof ApiError ? e.message : 'Something went wrong. Please try again.');
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      {error && <Alert tone="danger">{error}</Alert>}
      <Input
        label={currentLabel}
        type="password"
        autoComplete="current-password"
        error={errors.current_password?.message}
        {...register('current_password')}
      />
      <Input
        label="New password"
        type="password"
        autoComplete="new-password"
        hint="Use letters and digits. Avoid common passwords."
        error={errors.new_password?.message}
        {...register('new_password')}
      />
      <Input
        label="Confirm new password"
        type="password"
        autoComplete="new-password"
        error={errors.new_password_confirmation?.message}
        {...register('new_password_confirmation')}
      />
      <Button type="submit" size="lg" loading={isSubmitting}>
        {submitLabel}
      </Button>
    </form>
  );
}
