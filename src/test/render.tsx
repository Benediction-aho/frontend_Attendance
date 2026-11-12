import type { ReactElement } from 'react';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { ToastProvider } from '../ui/Toast';

/** Renders on a data router (needed by useBlocker) at `path`, with extra routes. */
export function renderAt(ui: ReactElement, path = '/', extra: Record<string, ReactElement> = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter(
    [{ path, element: ui }, ...Object.entries(extra).map(([p, el]) => ({ path: p, element: el }))],
    { initialEntries: [path] },
  );
  const utils = render(
    <QueryClientProvider client={qc}>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </QueryClientProvider>,
  );
  return { ...utils, router };
}
