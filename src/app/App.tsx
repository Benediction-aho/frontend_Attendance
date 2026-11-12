import { QueryClientProvider } from '@tanstack/react-query';
import { MotionConfig } from 'motion/react';
import { RouterProvider } from 'react-router';
import { queryClient } from '../lib/queryClient';
import { UpdatePrompt } from '../ui/UpdatePrompt';
import { ToastProvider } from '../ui/Toast';
import { ErrorBoundary } from './ErrorBoundary';
import { router } from './router';

export function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <MotionConfig reducedMotion="user">
          <ToastProvider>
            <RouterProvider router={router} />
            <UpdatePrompt />
          </ToastProvider>
        </MotionConfig>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
