import { Button } from './Button';

export function Pagination({
  page,
  lastPage,
  total,
  onPage,
}: {
  page: number;
  lastPage: number;
  total?: number;
  onPage: (p: number) => void;
}) {
  if (lastPage <= 1)
    return total !== undefined ? (
      <p className="px-5 py-3 text-xs text-ink-500">{total} in total</p>
    ) : null;
  return (
    <nav
      aria-label="Pagination"
      className="flex items-center justify-between gap-3 border-t border-ink-100 px-5 py-3"
    >
      <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
        Previous
      </Button>
      <span className="text-sm text-ink-600">
        Page {page} of {lastPage}
        {total !== undefined && <span className="hidden sm:inline"> · {total} in total</span>}
      </span>
      <Button
        variant="outline"
        size="sm"
        disabled={page >= lastPage}
        onClick={() => onPage(page + 1)}
      >
        Next
      </Button>
    </nav>
  );
}
