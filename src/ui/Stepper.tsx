import { motion } from 'motion/react';
import { cx } from './cx';

/** Horizontal progress through a flow; the current step is highlighted. */
export function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol aria-label="Progress" className="flex items-center gap-2">
      {steps.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li
            key={label}
            className="flex flex-1 flex-col gap-1.5"
            aria-current={active ? 'step' : undefined}
          >
            <span className="relative h-1 overflow-hidden rounded-full bg-ink-100">
              <motion.span
                className="absolute inset-y-0 left-0 rounded-full bg-primary-600"
                initial={false}
                animate={{ width: done || active ? '100%' : '0%' }}
                transition={{ duration: 0.45, ease: [0.2, 0, 0, 1] }}
              />
            </span>
            <span
              className={cx(
                'text-xs',
                active ? 'font-semibold text-primary-700' : done ? 'text-ink-600' : 'text-ink-400',
              )}
            >
              <span className="sr-only">
                {done ? 'Completed: ' : active ? 'Current: ' : 'Next: '}
              </span>
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
