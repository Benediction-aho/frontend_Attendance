import { useEffect, useState } from 'react';

/** Remaining seconds of a countdown that started at `startedAt` (ms) for `seconds`. */
export function useCountdown(seconds: number | undefined, startedAt: number | undefined): number {
  const [now, setNow] = useState(() => Date.now());
  const end = seconds && startedAt ? startedAt + seconds * 1000 : 0;
  useEffect(() => {
    if (!end) return;
    const t = setInterval(() => {
      const n = Date.now();
      setNow(n);
      if (n >= end) clearInterval(t);
    }, 1000);
    return () => clearInterval(t);
  }, [end]);
  if (!end) return 0;
  return Math.max(0, Math.ceil((end - Math.max(now, startedAt ?? 0)) / 1000));
}
