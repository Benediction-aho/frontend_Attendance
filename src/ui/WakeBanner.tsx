import { useSyncExternalStore } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { isWaking, subscribeWaking } from '../lib/netStatus';
import { duration, easing } from './motion';

const subscribe = (cb: () => void) => subscribeWaking(cb);
const online = () => globalThis.navigator?.onLine !== false;

/**
 * Friendly notice while the API is slow to answer (it sleeps after a quiet period on
 * the current hosting). Requests keep retrying by themselves; no action is needed.
 */
export function WakeBanner() {
  const reduce = useReducedMotion();
  const waking = useSyncExternalStore(subscribe, isWaking, () => false);
  const show = waking && online();
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-[calc(env(safe-area-inset-top)+8px)]"
    >
      <AnimatePresence>
        {show && (
          <motion.div
            role="status"
            data-testid="wake-banner"
            initial={reduce ? false : { opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -12 }}
            transition={{ duration: duration.base, ease: easing.standard }}
            className="flex max-w-md items-center gap-3 rounded-full bg-surface px-4 py-2 text-sm text-ink-700 shadow-raised ring-1 ring-ink-900/5"
          >
            <span
              aria-hidden
              className="size-2 shrink-0 animate-pulse rounded-full bg-secondary-500"
            />
            <span>
              <span className="font-medium text-ink-900">Waking up the server…</span> This can take
              up to a minute after a quiet period.
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
