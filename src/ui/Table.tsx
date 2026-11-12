import type { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from 'react';
import { cx } from './cx';

export function Table({ className, ...p }: HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="overflow-x-auto">
      <table className={cx('w-full border-collapse text-left text-sm', className)} {...p} />
    </div>
  );
}
export function THead(p: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead
      className="border-b border-ink-100 bg-surface-muted text-xs uppercase tracking-wide text-ink-500"
      {...p}
    />
  );
}
export function TBody(p: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className="divide-y divide-ink-100" {...p} />;
}
export function TR({ className, ...p }: HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={cx('transition-colors duration-150', className)} {...p} />;
}
export function TH({ className, ...p }: ThHTMLAttributes<HTMLTableCellElement>) {
  return <th scope="col" className={cx('px-4 py-3 font-semibold', className)} {...p} />;
}
export function TD({ className, ...p }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cx('px-4 py-3 align-middle text-ink-700', className)} {...p} />;
}
