import { motion } from 'motion/react';
import { Link, useLocation } from 'react-router';
import { AuthLayout, AuthTitle } from './AuthLayout';
import { Stepper } from '../../ui/Stepper';
import { fadeUp, stagger } from '../../ui/motion';

const NEXT = [
  {
    title: 'An administrator reviews your request',
    body: 'This usually happens during working hours.',
  },
  {
    title: 'You receive your identification code',
    body: 'Check your inbox, and your spam folder just in case.',
  },
  {
    title: 'You sign in and choose your own password',
    body: 'Then complete your profile in a minute.',
  },
];

export function SignUpSentPage() {
  const name = (useLocation().state as { firstName?: string } | null)?.firstName;
  return (
    <AuthLayout>
      <div className="mb-6">
        <Stepper steps={['About you', 'Your position', 'Approval']} current={2} />
      </div>
      <AuthTitle
        title={name ? `Thank you, ${name}` : 'Request sent'}
        subtitle="Your request has been sent. Please wait for an administrator to approve it."
      />
      <motion.ol variants={stagger} initial="hidden" animate="show" className="flex flex-col gap-3">
        {NEXT.map((n, i) => (
          <motion.li
            key={n.title}
            variants={fadeUp}
            className="flex gap-3 rounded-control bg-surface-muted p-3"
          >
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary-600 text-xs font-semibold text-white">
              {i + 1}
            </span>
            <span>
              <span className="block text-sm font-semibold text-ink-800">{n.title}</span>
              <span className="block text-sm text-ink-500">{n.body}</span>
            </span>
          </motion.li>
        ))}
      </motion.ol>
      <Link
        to="/sign-in"
        className="mt-6 flex min-h-12 items-center justify-center rounded-control bg-primary-600 px-6 font-semibold text-white transition-colors hover:bg-primary-700"
      >
        Go to sign in
      </Link>
    </AuthLayout>
  );
}
