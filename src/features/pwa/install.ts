import { useEffect, useState, useSyncExternalStore } from 'react';
import { isStandalone } from '../../lib/browser';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// Chrome/Android fires this once, early: keep it for the install button.
let deferred: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e as BeforeInstallPromptEvent;
    emit();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    emit();
  });
}

export function useInstallPrompt() {
  const available = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => deferred !== null,
  );
  return {
    available,
    async prompt(): Promise<boolean> {
      if (!deferred) return false;
      const ev = deferred;
      await ev.prompt();
      const choice = await ev.userChoice.catch(() => ({ outcome: 'dismissed' as const }));
      deferred = null;
      emit();
      return choice.outcome === 'accepted';
    },
  };
}

export function useStandalone(): boolean {
  const [v, setV] = useState(isStandalone);
  useEffect(() => {
    const mq = globalThis.matchMedia?.('(display-mode: standalone)');
    const on = () => setV(isStandalone());
    mq?.addEventListener?.('change', on);
    return () => mq?.removeEventListener?.('change', on);
  }, []);
  return v;
}

const DISMISS_KEY = 'ag.install.dismissed';

export function wasInstallDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISS_KEY) === '1';
  } catch {
    return false;
  }
}

export function dismissInstall(): void {
  try {
    localStorage.setItem(DISMISS_KEY, '1');
  } catch {
    // per-viewer convenience only
  }
}
