import { useEffect, useState } from 'react';
import { serverNow } from '../../lib/serverTime';
import { isoDay } from '../../lib/format';

/** Server-synchronised "now", refreshed every `ms` (never the raw device clock). */
export function useServerNow(ms = 1000): Date {
  const [now, setNow] = useState(() => serverNow());
  useEffect(() => {
    const t = setInterval(() => setNow(serverNow()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

/** Today's work date in the office time zone, from server time. */
export function useServerToday(): string {
  return isoDay(useServerNow(60_000));
}
