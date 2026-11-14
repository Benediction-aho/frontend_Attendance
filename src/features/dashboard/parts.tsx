import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { Card, CardHeader } from '../../ui/Card';
import { cx } from '../../ui/cx';
import { formatCount } from './logic';

export interface FigureItem {
  label: string;
  value: ReactNode;
  hint?: string;
  /** Optional destination: the figure becomes an actionable link. */
  to?: string;
  /** Draws attention (something waits for an action). */
  attention?: boolean;
  /** UI6-13: spans the full width on phones (2-column grid), one column from `sm`. */
  wide?: boolean;
  /** UI6-13: the hint is shown from `sm` only (redundant on phones). */
  hintFromSm?: boolean;
  testId?: string;
}

/** Sober grid of figures; a figure without a value (absent from the API) is never shown. */
const COLS = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  '2-3': 'grid-cols-2 sm:grid-cols-3',
  4: 'grid-cols-2 sm:grid-cols-4',
} as const;

export function Figures({ items, cols = 4 }: { items: FigureItem[]; cols?: keyof typeof COLS }) {
  const shown = items.filter((f) => f.value !== undefined && f.value !== null);
  if (shown.length === 0) return null;
  return (
    <dl className={cx('-mb-px grid overflow-hidden', COLS[cols])}>
      {shown.map((f) => {
        const inner = (
          <>
            <dt className="text-xs leading-snug text-ink-500">{f.label}</dt>
            <dd
              className={cx(
                'mt-1 text-2xl font-semibold whitespace-nowrap tabular-nums [overflow-wrap:normal]',
                f.attention ? 'text-secondary-700' : 'text-primary-700',
              )}
            >
              {typeof f.value === 'number' ? formatCount(f.value) : f.value}
            </dd>
            {f.hint && (
              <dd className={cx('mt-0.5 text-xs text-ink-500', f.hintFromSm && 'hidden sm:block')}>
                {f.hint}
              </dd>
            )}
          </>
        );
        return (
          <div
            key={f.label}
            className={cx(
              '-mr-px border-r border-b border-ink-100',
              f.wide && 'col-span-2 sm:col-span-1',
            )}
            data-testid={f.testId}
          >
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
  /** `short` replaces the label on phones (< sm) so the header stays on one line (UI6-03). */
  action?: { to: string; label: string; short?: string };
  testId?: string;
}) {
  return (
    <Card data-testid={testId}>
      <CardHeader
        title={title}
        description={description}
        align="baseline"
        actions={
          action ? (
            <Link
              to={action.to}
              aria-label={action.label}
              className="-my-3 inline-flex min-h-11 shrink-0 items-center text-sm font-semibold whitespace-nowrap text-primary-700 hover:underline"
            >
              {action.short ? (
                <>
                  <span className="sm:hidden">{action.short}</span>
                  <span className="hidden sm:inline">{action.label}</span>
                </>
              ) : (
                action.label
              )}
            </Link>
          ) : undefined
        }
      />
      {children}
    </Card>
  );
}
