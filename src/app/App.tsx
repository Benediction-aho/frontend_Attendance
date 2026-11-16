import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { MotionConfig } from 'motion/react';
import { RouterProvider } from 'react-router';
import { queryClient } from '../lib/queryClient';
import { persistOptions } from '../lib/persist';
import { WakeBanner } from '../ui/WakeBanner';
import { UpdatePrompt } from '../ui/UpdatePrompt';
import { ToastProvider } from '../ui/Toast';
import { ErrorBoundary } from './ErrorBoundary';
import { router } from './router';

export function App() {
  return (
    <ErrorBoundary>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={persistOptions}
        // Restored screens show at once, then everything is asked again from the server.
        onSuccess={() => void queryClient.invalidateQueries()}
      >
        <MotionConfig reducedMotion="user">
          <ToastProvider>
            <RouterProvider router={router} />
            <UpdatePrompt />
            <WakeBanner />
          </ToastProvider>
        </MotionConfig>
      </PersistQueryClientProvider>
    </ErrorBoundary>
  );
}
