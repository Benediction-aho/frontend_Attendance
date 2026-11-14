import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AnimatePresence, motion } from 'motion/react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { Alert } from '../../ui/Alert';
import { Button } from '../../ui/Button';
import { Card, CardBody, CardHeader } from '../../ui/Card';
import { Input, Segmented } from '../../ui/Field';
import { PageHeader } from '../../ui/PageHeader';
import { useToast } from '../../ui/Toast';
import { ApiError, api, errorMessage } from '../../lib/api';
import {
  EMPLOYEE_TYPE_OPTIONS,
  EMPLOYEE_TYPE_OTHER_MAX,
  employeeTypeFields,
  employeeTypePayload,
  requireOtherText,
} from '../../lib/employeeType';
import { isSuperAdmin } from '../../lib/permissions';
import type { Role, User } from '../../lib/types';
import { useMe } from '../auth/useSession';
import { PermissionChecklist } from './PermissionsEditor';
import { conflictMessage, usePermissionCatalogue } from './useAdminUsers';

const base = z.object({
  first_name: z.string().trim().min(1, 'Enter the first name.').max(100),
  last_name: z.string().trim().min(1, 'Enter the last name.').max(100),
  email: z.string().trim().min(1, 'Enter the email address.').email('Enter a valid email address.'),
  ...employeeTypeFields,
  job_title: z.string().trim().min(1, 'Enter the job title.').max(150),
});
const schema = base.superRefine((v, ctx) =>
  requireOtherText(v, ctx, 'Enter what this person is joining as.'),
);
type Values = z.infer<typeof schema>;

export function CreateUserPage() {
  const { data: me } = useMe();
  const superA = isSuperAdmin(me);
  const navigate = useNavigate();
  const toast = useToast();
  const qc = useQueryClient();
  const [role, setRole] = useState<Role>('employee');
  const [permissions, setPermissions] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const catalogue = usePermissionCatalogue(superA);
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError: setFieldError,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema) });

  const onSubmit = handleSubmit(async (v) => {
    setError(null);
    try {
      const res = await api.post<{ data: User }>('/admin/users', {
        ...employeeTypePayload(v),
        ...(superA ? { role, permissions: role === 'admin' ? permissions : undefined } : {}),
      });
      await qc.invalidateQueries({ queryKey: ['admin', 'users'] });
      toast.show(`Account created. ${v.first_name} will receive an identification code by email.`);
      navigate(`/app/admin/users/${res.data.id}`, { replace: true });
    } catch (e) {
      if (e instanceof ApiError && e.status === 409)
        setFieldError('email', { message: conflictMessage(e.code, e.message) });
      else if (e instanceof ApiError && e.status === 422) {
        for (const [k, m] of Object.entries(e.fieldErrors))
          if (k in base.shape) setFieldError(k as keyof Values, { message: m });
        setError('Please check the highlighted fields.');
      } else setError(errorMessage(e));
    }
  });

  return (
    <>
      <PageHeader
        title="Add a user"
        description="The account is active straight away and the identification code is emailed automatically."
        back={{ to: '/app/admin/users', label: 'Users' }}
      />
      <form onSubmit={onSubmit} noValidate className="grid max-w-3xl gap-5">
        {error && <Alert tone="danger">{error}</Alert>}
        <Card>
          <CardHeader title="Identity" />
          <CardBody className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="First name"
                error={errors.first_name?.message}
                {...register('first_name')}
              />
              <Input
                label="Last name"
                error={errors.last_name?.message}
                {...register('last_name')}
              />
            </div>
            <Input
              label="Email"
              type="email"
              inputMode="email"
              autoCapitalize="none"
              error={errors.email?.message}
              {...register('email')}
            />
            <Segmented
              label="Type"
              name="employee_type"
              value={watch('employee_type')}
              onChange={(v) => setValue('employee_type', v, { shouldValidate: true })}
              options={EMPLOYEE_TYPE_OPTIONS}
              error={errors.employee_type?.message}
            />
            {watch('employee_type') === 'other' && (
              <Input
                label="Please specify"
                hint="For example: National service, Volunteer, Consultant."
                maxLength={EMPLOYEE_TYPE_OTHER_MAX}
                error={errors.employee_type_other?.message}
                {...register('employee_type_other')}
              />
            )}
            <Input
              label="Job title"
              hint="As written on the appointment letter."
              error={errors.job_title?.message}
              {...register('job_title')}
            />
          </CardBody>
        </Card>
        {superA && (
          <Card>
            <CardHeader title="Access" description="Admins only get the permissions you tick." />
            <CardBody className="flex flex-col gap-4">
              <fieldset>
                <legend className="mb-1.5 text-sm font-medium text-ink-700">Role</legend>
                <div className="grid grid-cols-3 gap-2">
                  {(['employee', 'admin', 'super_admin'] as Role[]).map((r) => (
                    <label
                      key={r}
                      className={`flex min-h-11 cursor-pointer items-center justify-center rounded-control border px-2 text-center text-sm font-semibold transition-colors has-[:focus-visible]:shadow-focus ${role === r ? 'border-primary-500 bg-primary-50 text-primary-800' : 'border-ink-200 text-ink-700 hover:border-ink-300'}`}
                    >
                      <input
                        type="radio"
                        name="role"
                        className="sr-only"
                        checked={role === r}
                        onChange={() => setRole(r)}
                      />
                      {r === 'employee' ? 'Staff' : r === 'admin' ? 'Admin' : 'Super admin'}
                    </label>
                  ))}
                </div>
              </fieldset>
              <AnimatePresence initial={false}>
                {role === 'admin' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <PermissionChecklist
                      catalogue={catalogue.data}
                      value={permissions}
                      onChange={setPermissions}
                      loading={catalogue.isPending}
                    />
                  </motion.div>
                )}
                {role === 'super_admin' && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <Alert tone="warning">
                      A super admin can do everything, including managing settings and other super
                      admins.
                    </Alert>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardBody>
          </Card>
        )}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" size="lg" onClick={() => navigate('/app/admin/users')}>
            Cancel
          </Button>
          <Button type="submit" size="lg" loading={isSubmitting}>
            Create account
          </Button>
        </div>
      </form>
    </>
  );
}
