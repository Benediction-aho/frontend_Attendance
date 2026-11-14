import { useState } from 'react';
import { cx } from './cx';
import { initials } from '../lib/format';

export function Avatar({
  src,
  first,
  last,
  size = 'md',
}: {
  src?: string | null;
  first?: string;
  last?: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const [broken, setBroken] = useState(false);
  const cls = { sm: 'size-9 text-xs', md: 'size-10 text-sm', lg: 'size-20 text-xl' }[size];
  if (src && !broken)
    return (
      <img
        src={src}
        alt=""
        onError={() => setBroken(true)}
        className={cx('shrink-0 rounded-full object-cover', cls)}
      />
    );
  return (
    <span
      aria-hidden
      className={cx(
        'flex shrink-0 items-center justify-center rounded-full bg-primary-100 font-semibold text-primary-700',
        cls,
      )}
    >
      {initials(first, last)}
    </span>
  );
}
