import { Component, type ReactNode } from 'react';
import { api } from '../lib/api';
import { getToken } from '../lib/session';

/** Reports an unexpected UI error to the account's activity log (no secrets), then offers a reload. */
export function reportClientError(error: unknown): void {
  if (!getToken()) return;
  const e = error instanceof Error ? error : new Error(String(error));
  void api
    .post('/client-errors', {
      message: e.message.slice(0, 500),
      stack: (e.stack ?? '').slice(0, 2000),
      page: window.location.pathname,
      platform: navigator.userAgent.slice(0, 250),
      app_version: import.meta.env.VITE_APP_VERSION ?? '2',
    })
    .catch(() => {});
}

export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    reportClientError(error);
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-lg font-semibold text-ink-900">Something went wrong on this screen.</p>
        <p className="text-sm text-ink-500">
          The problem has been reported. You are still signed in.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="min-h-11 rounded-control bg-primary-600 px-5 font-semibold text-white"
        >
          Reload
        </button>
      </div>
    );
  }
}
