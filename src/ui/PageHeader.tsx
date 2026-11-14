import type { ReactNode } from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router';
import { fadeUp } from './motion';

export function PageHeader({
  title,
  description,
  actions,
  back,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  back?: { to: string; label: string };
}) {
  return (
    <motion.header variants={fadeUp} initial="hidden" animate="show" className="mb-6">
      {back && (
        <Link
          to={back.to}
          className="mb-2 inline-flex min-h-11 items-center text-sm font-medium text-primary-700 hover:underline"
        >
          Back to {back.label.toLowerCase()}
        </Link>
      )}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-ink-900">{title}</h1>
          {description && <p className="mt-1 text-sm text-ink-500">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </motion.header>
  );
}
