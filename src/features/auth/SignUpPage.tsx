import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AnimatePresence, motion } from 'motion/react';
import { Link, useNavigate } from 'react-router';
import { Button } from '../../ui/Button';
import { Input, Segmented } from '../../ui/Field';
import { Alert } from '../../ui/Alert';
import { Stepper } from '../../ui/Stepper';
import { stepVariants } from '../../ui/motion';
import { ApiError, api, roughWait } from '../../lib/api';
import { AuthLayout, AuthTitle } from './AuthLayout';

const schema = z.object({
  first_name: z.string().trim().min(1, 'Enter your first name.').max(100),
  last_name: z.string().trim().min(1, 'Enter your last name.').max(100),
  email: z
    .string()
    .trim()
    .min(1, 'Enter your email address.')
    .email('Enter a valid email address.')
    .max(254),
  employee_type: z.enum(['intern', 'employee'], { message: 'Choose Intern or Employee.' }),
  job_title: z.string().trim().min(1, 'Enter your job title.').max(150),
});
type Values = z.infer<typeof schema>;

const STEP1: (keyof Values)[] = ['first_name', 'last_name', 'email'];

export function SignUpPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    trigger,
    watch,
    setValue,
    setError: setFieldError,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema), mode: 'onTouched' });

  const next = async () => {
    if (await trigger(STEP1)) {
      setDir(1);
      setStep(1);
    }
  };
  const back = () => {
    setDir(-1);
    setStep(0);
  };

  const onSubmit = handleSubmit(
    async (v) => {
      setError(null);
      try {
        await api.post('/auth/register', v);
        navigate('/sign-up/sent', { replace: true, state: { firstName: v.first_name } });
      } catch (e) {
        if (e instanceof ApiError && e.status === 422) {
          const fe = e.fieldErrors;
          let firstStep = 1;
          for (const [k, m] of Object.entries(fe)) {
            if (k in schema.shape) setFieldError(k as keyof Values, { message: m });
            if (STEP1.includes(k as keyof Values)) firstStep = 0;
          }
          if (firstStep === 0) back();
          setError('Please check the highlighted fields.');
        } else if (e instanceof ApiError && e.status === 429) {
          const wait = e.retryAfterSeconds;
          setError(
            `Too many sign-up requests right now. Try again ${wait ? `in ${roughWait(wait)}` : 'later'}, or ask an administrator to create your account.`,
          );
        } else {
          setError(e instanceof ApiError ? e.message : 'Something went wrong. Please try again.');
        }
      }
    },
    (errs) => {
      if (STEP1.some((f) => errs[f])) back();
    },
  );

  return (
    <AuthLayout step={0}>
      <AuthTitle
        title="Request an account"
        subtitle="An administrator reviews every request. No password is needed now."
      />
      <div className="mb-6">
        <Stepper steps={['About you', 'Your position', 'Approval']} current={step} />
      </div>
      <form
        onSubmit={(e) => {
          if (step === 0) {
            e.preventDefault();
            void next();
          } else void onSubmit(e);
        }}
        noValidate
        className="overflow-hidden"
      >
        {error && (
          <Alert tone="danger" className="mb-4">
            {error}
          </Alert>
        )}
        <AnimatePresence mode="wait" custom={dir} initial={false}>
          {step === 0 ? (
            <motion.div
              key="s0"
              custom={dir}
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="flex flex-col gap-4"
            >
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
              <Input
                label="Work email"
                type="email"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
                hint="Your identification code will be sent to this address."
                error={errors.email?.message}
                {...register('email')}
              />
              <Button type="submit" size="lg" block className="mt-1">
                Continue
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key="s1"
              custom={dir}
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="flex flex-col gap-4"
            >
              <Segmented
                label="You are joining as"
                name="employee_type"
                value={watch('employee_type')}
                onChange={(v) => setValue('employee_type', v, { shouldValidate: true })}
                options={[
                  { value: 'intern', label: 'Intern' },
                  { value: 'employee', label: 'Employee' },
                ]}
                error={errors.employee_type?.message}
              />
              <Input
                label="Job title"
                autoComplete="organization-title"
                hint="Exactly as written on your appointment letter."
                error={errors.job_title?.message}
                {...register('job_title')}
              />
              <div className="mt-1 flex gap-2">
                <Button variant="outline" size="lg" onClick={back}>
                  Back
                </Button>
                <Button type="submit" size="lg" block loading={isSubmitting}>
                  Send request
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </form>
      <p className="mt-6 border-t border-ink-100 pt-5 text-sm text-ink-600">
        Already approved?{' '}
        <Link to="/sign-in" className="font-semibold text-primary-700 hover:underline">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
