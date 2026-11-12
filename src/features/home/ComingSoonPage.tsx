import { motion, useReducedMotion, type Variants } from 'motion/react';
import { Link } from 'react-router';
import { Logo } from '../../ui/Logo';
import { duration, easing } from '../../ui/motion';

export function ComingSoonPage() {
  const reduce = useReducedMotion();
  const container: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: reduce ? 0 : 0.08, delayChildren: reduce ? 0 : 0.1 } },
  };
  const item: Variants = {
    hidden: reduce ? { opacity: 1 } : { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { duration: duration.slow, ease: easing.standard } },
  };

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <motion.section
        variants={container}
        initial="hidden"
        animate="show"
        className="w-full max-w-md rounded-panel bg-surface p-8 text-center shadow-card"
      >
        <motion.div variants={item} className="flex justify-center">
          <Logo className="h-16 w-auto" />
        </motion.div>
        <motion.h1 variants={item} className="mt-6 text-2xl font-semibold text-primary-700">
          Assistance Ghana Attendance
        </motion.h1>
        <motion.p variants={item} className="mt-3 text-ink-600">
          The new attendance app is on its way. Sign-in will open here soon.
        </motion.p>
        <motion.div variants={item} className="mt-6 flex justify-center">
          <span className="rounded-full bg-secondary-100 px-3 py-1 text-xs font-semibold text-secondary-800">
            Coming soon
          </span>
        </motion.div>
        {import.meta.env.DEV && (
          <motion.div variants={item} className="mt-6">
            <Link to="/app" className="text-sm font-medium text-primary-700 underline">
              Preview the app layout
            </Link>
          </motion.div>
        )}
      </motion.section>
    </main>
  );
}
