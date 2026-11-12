import { lazy, Suspense, type ComponentType } from 'react';
import { Spinner } from '../ui/Spinner';

/**
 * Route-level code splitting: the page module is downloaded the first time the
 * route is visited. A failed download (new deployment, flaky network) is retried
 * once, then the ErrorBoundary takes over.
 */
export function lazyPage<M extends Record<string, unknown>>(
  load: () => Promise<M>,
  name: keyof M & string,
): ComponentType {
  const retry = () => load().catch(() => new Promise<M>((r) => setTimeout(r, 800)).then(load));
  const Lazy = lazy(() => retry().then((m) => ({ default: m[name] as ComponentType })));
  function Page() {
    return (
      <Suspense
        fallback={
          <div className="flex min-h-[40vh] items-center justify-center text-primary-600">
            <Spinner label="Loading" />
          </div>
        }
      >
        <Lazy />
      </Suspense>
    );
  }
  Page.displayName = `Lazy(${name})`;
  return Page;
}
