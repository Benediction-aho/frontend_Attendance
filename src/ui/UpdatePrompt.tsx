import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { Button } from './Button';
import { duration, easing } from './motion';

/** Offers a new version to the user instead of reloading silently. */
export function UpdatePrompt() {
  const reduce = useReducedMotion();
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, reg) {
      if (reg) setInterval(() => void reg.update(), 60 * 60 * 1000);
    },
  });

  return (
    <AnimatePresence>
      {needRefresh && (
        <motion.div
          role="status"
          initial={reduce ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: 16 }}
          transition={{ duration: duration.base, ease: easing.standard }}
          className="fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-md flex-col gap-3 rounded-card bg-surface p-4 shadow-raised sm:flex-row sm:items-center"
        >
          <p className="flex-1 text-sm text-ink-700">A new version of the app is available.</p>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setNeedRefresh(false)}>
              Later
            </Button>
            <Button onClick={() => void updateServiceWorker(true)}>Update now</Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
