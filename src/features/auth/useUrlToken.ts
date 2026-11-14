import { useEffect, useState } from 'react';

// A render can be discarded before commit (lazy route, Suspense). The token is
// already gone from the address bar by then, so it is kept here until the
// component that read it has mounted.
let taken: { path: string; token: string } | null = null;

/** Reads ?token=… once and removes it from the address bar and history. */
export function useUrlToken(): string | null {
  const [token] = useState(() => {
    const url = new URL(window.location.href);
    const t = url.searchParams.get('token');
    if (t) {
      url.searchParams.delete('token');
      window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
      taken = { path: url.pathname, token: t };
      return t;
    }
    return taken && taken.path === url.pathname ? taken.token : null;
  });
  useEffect(() => {
    taken = null;
  }, []);
  return token;
}
