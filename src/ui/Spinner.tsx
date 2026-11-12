import { cx } from './cx';

/** Three soft dots; used inside buttons and loading areas (not an icon). */
export function Spinner({ className, label = 'Loading' }: { className?: string; label?: string }) {
  return (
    <span
      role="status"
      aria-label={label}
      className={cx('inline-flex items-center gap-1', className)}
    >
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="size-1.5 animate-pulse rounded-full bg-current"
          style={{ animationDelay: `${i * 150}ms` }}
        />
      ))}
    </span>
  );
}
