import type { ReactNode } from 'react';
import { motion } from 'motion/react';
import { Logo } from '../../ui/Logo';
import { cx } from '../../ui/cx';
import { fadeUp } from '../../ui/motion';
import type { Variants } from 'motion/react';

/** How an account comes to life. Shown on the desktop brand panel. */
const ONBOARDING_STEPS = [
  'Request an account',
  'Approval by an administrator',
  'Identification code by email',
  'Sign in and choose a password',
] as const;

export type OnboardingStep = 0 | 1 | 2 | 3;

const panelStagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

function FlowTimeline({ current }: { current?: OnboardingStep }) {
  return (
    <motion.ol variants={panelStagger} aria-label="How it works" className="mt-12 max-w-sm">
      {ONBOARDING_STEPS.map((label, i) => {
        const state =
          current === undefined
            ? 'todo'
            : i < current
              ? 'done'
              : i === current
                ? 'current'
                : 'todo';
        return (
          <motion.li
            key={label}
            variants={fadeUp}
            aria-current={state === 'current' ? 'step' : undefined}
            className="relative flex gap-4 pb-6 last:pb-0"
          >
            {i < ONBOARDING_STEPS.length - 1 && (
              <span
                aria-hidden
                className="absolute top-7 bottom-1 left-[13px] w-px bg-primary-500"
              />
            )}
            <span
              aria-hidden
              className={cx(
                'relative flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                state === 'current' && 'bg-secondary-400 text-ink-900',
                state === 'done' && 'bg-primary-100 text-primary-800',
                state === 'todo' && 'border border-primary-400 text-primary-100',
              )}
            >
              {i + 1}
            </span>
            <span
              className={cx(
                'pt-1 text-sm',
                state === 'current' ? 'font-semibold text-white' : 'text-primary-100',
              )}
            >
              {label}
            </span>
          </motion.li>
        );
      })}
    </motion.ol>
  );
}

/** Split screen on desktop (brand panel + form), single card on phones. */
export function AuthLayout({
  children,
  aside,
  step,
  footer,
}: {
  /** Small, low-emphasis links shown under the card. */
  footer?: ReactNode;
  children: ReactNode;
  aside?: ReactNode;
  /** Current onboarding step highlighted on the brand panel (none for recovery pages). */
  step?: OnboardingStep;
}) {
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <aside className="relative hidden overflow-hidden bg-primary-700 lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div
          aria-hidden
          className="absolute -top-32 -right-32 size-96 rounded-full bg-primary-600/60 blur-2xl"
        />
        <div
          aria-hidden
          className="absolute -bottom-40 -left-24 size-[28rem] rounded-full bg-primary-800/70 blur-2xl"
        />
        <motion.div variants={panelStagger} initial="hidden" animate="show" className="relative">
          <motion.div
            variants={fadeUp}
            className="inline-flex rounded-card bg-surface px-4 py-3 shadow-card"
          >
            <Logo variant="sidebar" />
          </motion.div>
          <motion.h2
            variants={fadeUp}
            className="mt-12 max-w-md text-3xl leading-tight font-semibold text-white"
          >
            Your working day, simply recorded.
          </motion.h2>
          <motion.p variants={fadeUp} className="mt-4 max-w-md text-primary-100">
            Check in at the office, plan your tasks and send your reports, all from your phone.
          </motion.p>
          <FlowTimeline current={step} />
        </motion.div>
        <div className="relative">
          {aside}
          <div aria-hidden className="mt-8 h-1 w-16 rounded-full bg-secondary-400" />
        </div>
      </aside>
      <main className="flex min-h-dvh flex-col items-center justify-center px-4 py-8 sm:px-6 lg:min-h-0">
        <div className="mb-6 lg:hidden">
          <Logo variant="signin" />
        </div>
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="show"
          className="w-full max-w-md rounded-panel bg-surface p-6 shadow-card sm:p-8"
        >
          {children}
        </motion.div>
        {footer && <div className="mt-4 text-center text-xs text-ink-500">{footer}</div>}
      </main>
    </div>
  );
}

export function AuthTitle({ title, subtitle }: { title: string; subtitle?: ReactNode }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-semibold tracking-tight text-ink-900">{title}</h1>
      {subtitle && <p className="mt-1.5 text-sm text-ink-600">{subtitle}</p>}
    </div>
  );
}
