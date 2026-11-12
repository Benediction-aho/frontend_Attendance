import { QueryClient } from '@tanstack/react-query';
import { ApiError } from './api';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // The API client already retries transient errors with backoff.
      retry: (count, error) => error instanceof ApiError && error.transient && count < 1,
      refetchOnWindowFocus: true,
      staleTime: 15_000,
    },
    mutations: { retry: false },
  },
});
