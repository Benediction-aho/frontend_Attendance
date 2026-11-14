import type { HTMLAttributes, ReactNode } from 'react';
import { cx } from './cx';

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx('rounded-card bg-surface shadow-card', className)} {...props} />;
}

export function CardHeader({
  title,
  description,
  actions,
  align = 'start',
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  /** `baseline`: a text link action sits on the title's baseline, never wraps below. */
  align?: 'start' | 'baseline';
}) {
  return (
    <div
      className={cx(
        'flex justify-between gap-3 border-b border-ink-100 px-5 py-4',
        align === 'baseline' ? 'flex-nowrap items-baseline' : 'flex-wrap items-start',
      )}
    >
      <div className="min-w-0">
        <h2 className="text-base font-semibold text-ink-900">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-ink-500">{description}</p>}
      </div>
      {actions && (
        <div className={cx('flex shrink-0 gap-2', align === 'baseline' && 'items-baseline')}>
          {actions}
        </div>
      )}
    </div>
  );
}

export function CardBody({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx('px-5 py-4', className)} {...props} />;
}

/** Plain figure tile for sober dashboards (no chart). */
export function StatTile({
  label,
  value,
  hint,
  cta,
  highlight = false,
  compact = false,
}: {
  /** Small tile: no reserved height (dense day views). */
  compact?: boolean;
  label: string;
  value: ReactNode;
  hint?: string;
  /** Call to action shown when the tile asks for something to be done. */
  cta?: string;
  highlight?: boolean;
}) {
  return (
    <Card
      className={cx(
        'flex h-full flex-col transition-shadow duration-200',
        compact ? 'min-h-0 px-3 py-3 sm:px-5' : 'min-h-32 px-5 py-4',
        highlight && 'ring-1 ring-secondary-300',
      )}
    >
      <p className="text-sm text-ink-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-primary-700">{value}</p>
      {hint && <p className="mt-1 text-xs text-ink-500">{hint}</p>}
      {cta && <p className="mt-auto pt-2 text-sm font-medium text-primary-700">{cta}</p>}
    </Card>
  );
}
