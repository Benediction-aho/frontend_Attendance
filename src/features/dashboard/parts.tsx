import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { Card, CardHeader } from '../../ui/Card';
import { cx } from '../../ui/cx';

export interface FigureItem {
  label: string;
  value: ReactNode;
  hint?: string;
  /** Optional destination: the figure becomes an actionable link. */
  to?: string;
  /** Draws attention (something waits for an action). */
  attention?: boolean;
  testId?: string;
}

/** Sober grid of figures; a figure without a value (absent from the API) is never shown. */
const COLS = {
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-2 sm:grid-cols-4',
} as const;

export function Figures({ items, cols = 4 }: { items: FigureItem[]; cols?: keyof typeof COLS }) {
  const shown = items.filter((f) => f.value !== undefined && f.value !== null);
  if (shown.length === 0) return null;
  return (
    <dl className={cx('grid gap-px bg-ink-100', COLS[cols])}>
      {shown.map((f) => {
        const inner = (
          <>
            <dt className="text-xs text-ink-500">{f.label}</dt>
            <dd
              className={cx(
                'mt-1 text-2xl font-semibold tabular-nums',
                f.attention ? 'text-secondary-700' : 'text-primary-700',
              )}
            >
              {f.value}
            </dd>
            {f.hint && <dd className="mt-0.5 text-xs text-ink-500">{f.hint}</dd>}
          </>
        );
        return (
          <div key={f.label} className="bg-surface" data-testid={f.testId}>
            {f.to ? (
              <Link
                to={f.to}
                className="block min-h-11 px-5 py-3 transition-colors hover:bg-surface-muted focus-visible:outline-offset-[-2px]"
              >
                {inner}
              </Link>
            ) : (
              <div className="px-5 py-3">{inner}</div>
            )}
          </div>
        );
      })}
    </dl>
  );
}

export function Section({
  title,
  description,
  children,
  action,
  testId,
}: {
  title: string;
  description?: ReactNode;
  children: ReactNode;
  action?: { to: string; label: string };
  testId?: string;
}) {
  return (
    <Card data-testid={testId}>
      <CardHeader
        title={title}
        description={description}
        actions={
          action ? (
            <Link
              to={action.to}
              className="inline-flex min-h-11 items-center text-sm font-semibold text-primary-700 hover:underline"
            >
              {action.label}
            </Link>
          ) : undefined
        }
      />
      {children}
    </Card>
  );
}
