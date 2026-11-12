import type { ReactNode } from 'react';
import { motion } from 'motion/react';
import { fadeUp } from './motion';

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      animate="show"
      className="flex flex-col items-center px-6 py-12 text-center"
    >
      <div aria-hidden className="mb-4 h-1 w-10 rounded-full bg-secondary-400" />
      <p className="text-base font-semibold text-ink-800">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-ink-500">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </motion.div>
  );
}
