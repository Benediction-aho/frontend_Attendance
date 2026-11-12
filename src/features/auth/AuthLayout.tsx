import type { ReactNode } from 'react';
import { motion } from 'motion/react';
import { Logo } from '../../ui/Logo';
import { fadeUp, stagger } from '../../ui/motion';

/** Split screen on desktop (brand panel + form), single card on phones. */
export function AuthLayout({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
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
        <motion.div variants={stagger} initial="hidden" animate="show" className="relative">
          <motion.div
            variants={fadeUp}
            className="inline-flex rounded-card bg-surface px-4 py-3 shadow-card"
          >
            <Logo className="h-10 w-auto" />
          </motion.div>
          <motion.h2
            variants={fadeUp}
            className="mt-16 max-w-md text-3xl leading-tight font-semibold text-white"
          >
            Your working day, simply recorded.
          </motion.h2>
          <motion.p variants={fadeUp} className="mt-4 max-w-md text-primary-100">
            Check in at the office, plan your tasks and send your reports, all from your phone.
          </motion.p>
        </motion.div>
        <div className="relative">
          {aside}
          <div aria-hidden className="mt-8 h-1 w-16 rounded-full bg-secondary-400" />
        </div>
      </aside>
      <main className="flex min-h-dvh flex-col items-center justify-center px-4 py-8 sm:px-6 lg:min-h-0">
        <div className="mb-6 lg:hidden">
          <Logo className="h-12 w-auto" />
        </div>
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="show"
          className="w-full max-w-md rounded-panel bg-surface p-6 shadow-card sm:p-8"
        >
          {children}
        </motion.div>
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
