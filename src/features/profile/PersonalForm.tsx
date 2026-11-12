import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '../../ui/Button';
import { Input, Textarea } from '../../ui/Field';
import { Alert } from '../../ui/Alert';
import { ApiError, api } from '../../lib/api';
import type { User } from '../../lib/types';
import { setMe } from '../auth/useSession';

const phone = z
  .string()
  .trim()
  .max(30)
  .refine(
    (v) => v === '' || /^\+?[\d\s()-]{7,}$/.test(v),
    'Enter a valid phone number, e.g. +233 24 123 4567.',
  );

const schema = z.object({
  first_name: z.string().trim().min(1, 'Enter your first name.').max(100),
  last_name: z.string().trim().min(1, 'Enter your last name.').max(100),
  birth_date: z.string(),
  address: z.string().trim().max(255),
  phone,
  whatsapp: phone,
});
type Values = z.infer<typeof schema>;

const nul = (v: string) => (v.trim() === '' ? null : v.trim());

export function PersonalForm({
  user,
  submitLabel = 'Save changes',
  onDone,
  showNames = true,
  secondary,
  allowClean = false,
}: {
  user: User;
  submitLabel?: string;
  onDone?: () => void;
  showNames?: boolean;
  secondary?: React.ReactNode;
  allowClean?: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError: setFieldError,
    formState: { errors, isSubmitting, isDirty },
    reset,
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      first_name: user.first_name,
      last_name: user.last_name,
      birth_date: user.birth_date ?? '',
      address: user.address ?? '',
      phone: user.phone ?? '',
      whatsapp: user.whatsapp ?? '',
    },
  });

  const onSubmit = handleSubmit(async (v) => {
    setError(null);
    try {
      const res = await api.patch<{ data: User }>('/me', {
        first_name: v.first_name,
        last_name: v.last_name,
        birth_date: nul(v.birth_date),
        address: nul(v.address),
        phone: nul(v.phone),
        whatsapp: nul(v.whatsapp),
      });
      setMe(res.data);
      reset(v);
      onDone?.();
    } catch (e) {
      if (e instanceof ApiError && e.status === 422) {
        for (const [k, m] of Object.entries(e.fieldErrors))
          if (k in schema.shape) setFieldError(k as keyof Values, { message: m });
        setError('Please check the highlighted fields.');
      } else
        setError(e instanceof ApiError ? e.message : 'Something went wrong. Please try again.');
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      {error && <Alert tone="danger">{error}</Alert>}
      {showNames && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="First name"
            autoComplete="given-name"
            error={errors.first_name?.message}
            {...register('first_name')}
          />
          <Input
            label="Last name"
            autoComplete="family-name"
            error={errors.last_name?.message}
            {...register('last_name')}
          />
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          optional
          placeholder="+233 24 123 4567"
          error={errors.phone?.message}
          {...register('phone')}
        />
        <Input
          label="WhatsApp"
          type="tel"
          inputMode="tel"
          optional
          placeholder="+233 24 123 4567"
          error={errors.whatsapp?.message}
          {...register('whatsapp')}
        />
      </div>
      <Input
        label="Date of birth"
        type="date"
        optional
        error={errors.birth_date?.message}
        {...register('birth_date')}
      />
      <Textarea
        label="Home address"
        rows={2}
        autoComplete="street-address"
        optional
        error={errors.address?.message}
        {...register('address')}
      />
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {secondary}
        <Button type="submit" size="lg" loading={isSubmitting} disabled={!isDirty && !allowClean}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
