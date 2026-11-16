import { cx } from './cx';

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cx('animate-pulse rounded-control bg-ink-100', className)} />;
}

export function SkeletonRows({ rows = 5 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Loading" className="flex flex-col gap-3 p-5">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="size-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-2/5" />
            <Skeleton className="h-3 w-3/5" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Placeholder while a screen's code downloads: title line and two cards, no layout jump. */
export function PageSkeleton() {
  return (
    <div role="status" aria-label="Loading" className="mx-auto flex w-full max-w-xl flex-col gap-4">
      <Skeleton className="h-4 w-28" />
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-40 w-full rounded-card" />
      <Skeleton className="h-24 w-full rounded-card" />
    </div>
  );
}
