import { useState } from 'react';

/** Reads ?token=… once and removes it from the address bar and history. */
export function useUrlToken(): string | null {
  const [token] = useState(() => {
    const url = new URL(window.location.href);
    const t = url.searchParams.get('token');
    if (t) {
      url.searchParams.delete('token');
      window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
    }
    return t;
  });
  return token;
}
