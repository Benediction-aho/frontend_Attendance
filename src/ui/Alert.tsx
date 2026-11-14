import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { cx } from './cx';
import { duration, easing } from './motion';

type Tone = 'info' | 'success' | 'danger' | 'warning';
const tones: Record<Tone, string> = {
  info: 'border-primary-200 bg-primary-50 text-primary-800',
  success: 'border-success-700/20 bg-success-50 text-success-700',
  danger: 'border-danger-700/20 bg-danger-50 text-danger-700',
  warning: 'border-secondary-300 bg-secondary-50 text-secondary-900',
};

/** Inline message with a soft entrance; announced to screen readers. */
export function Alert({
  tone = 'info',
  title,
  children,
  className,
}: {
  tone?: Tone;
  title?: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      role={tone === 'danger' ? 'alert' : 'status'}
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: duration.base, ease: easing.standard }}
      className={cx('rounded-control border px-4 py-3 text-sm', tones[tone], className)}
    >
      {title && <p className="font-semibold">{title}</p>}
      {children && <div className={title ? 'mt-0.5' : ''}>{children}</div>}
    </motion.div>
  );
}

export function AnimatedAlert(props: Parameters<typeof Alert>[0] & { show: boolean }) {
  const { show, ...rest } = props;
  return <AnimatePresence initial={false}>{show && <Alert {...rest} />}</AnimatePresence>;
}
