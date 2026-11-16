import { lazy, Suspense, type ComponentType } from 'react';
import { PageSkeleton } from '../ui/Skeleton';

export type PreloadablePage = ComponentType & { preload: () => Promise<unknown> };

/**
 * Route-level code splitting: the page module is downloaded the first time the
 * route is visited, or earlier through `preload()` (likely next screens, a hover
 * or touch on a menu entry). A failed download (new deployment, flaky network) is
 * retried once, then the ErrorBoundary takes over.
 */
export function lazyPage<M extends Record<string, unknown>>(
  load: () => Promise<M>,
  name: keyof M & string,
): PreloadablePage {
  let pending: Promise<M> | null = null;
  const retry = () => load().catch(() => new Promise<M>((r) => setTimeout(r, 800)).then(load));
  const get = () => {
    pending ??= retry().catch((e: unknown) => {
      pending = null; // a later visit tries again
      throw e;
    });
    return pending;
  };
  const Lazy = lazy(() => get().then((m) => ({ default: m[name] as ComponentType })));
  function Page() {
    return (
      <Suspense fallback={<PageSkeleton />}>
        <Lazy />
      </Suspense>
    );
  }
  Page.displayName = `Lazy(${name})`;
  Page.preload = () => get().catch(() => undefined);
  return Page;
}
