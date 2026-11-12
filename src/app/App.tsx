import { QueryClientProvider } from '@tanstack/react-query';
import { MotionConfig } from 'motion/react';
import { RouterProvider } from 'react-router';
import { queryClient } from '../lib/queryClient';
import { UpdatePrompt } from '../ui/UpdatePrompt';
import { router } from './router';

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <MotionConfig reducedMotion="user">
        <RouterProvider router={router} />
        <UpdatePrompt />
      </MotionConfig>
    </QueryClientProvider>
  );
}
