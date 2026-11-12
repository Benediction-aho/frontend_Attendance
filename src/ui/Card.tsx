import type { HTMLAttributes, ReactNode } from 'react';
import { cx } from './cx';

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx('rounded-card bg-surface shadow-card', className)} {...props} />;
}

export function CardHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-ink-100 px-5 py-4">
      <div className="min-w-0">
        <h2 className="text-base font-semibold text-ink-900">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-ink-500">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 gap-2">{actions}</div>}
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
}: {
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
        'flex h-full min-h-32 flex-col px-5 py-4 transition-shadow duration-200',
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
