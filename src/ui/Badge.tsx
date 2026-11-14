import type { ReactNode } from 'react';
import { cx } from './cx';

export type Tone = 'neutral' | 'primary' | 'accent' | 'success' | 'danger' | 'warning';

const tones: Record<Tone, string> = {
  neutral: 'bg-ink-100 text-ink-700',
  primary: 'bg-primary-50 text-primary-700',
  accent: 'bg-secondary-100 text-secondary-800',
  success: 'bg-success-50 text-success-700',
  danger: 'bg-danger-50 text-danger-700',
  warning: 'bg-secondary-50 text-secondary-800',
};

export function Badge({
  tone = 'neutral',
  children,
  className,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cx(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export const STATUS_TONE: Record<string, Tone> = {
  pending: 'accent',
  active: 'success',
  blocked: 'danger',
  locked: 'warning',
  deleted: 'neutral',
};
