import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup();
  // Per-tab notices (sign-in countdown) must not leak between tests.
  sessionStorage.clear();
});
