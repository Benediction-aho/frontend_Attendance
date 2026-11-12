import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { cx } from './cx';
import { duration, easing } from './motion';

type Tone = 'success' | 'danger' | 'info';
interface ToastItem {
  id: number;
  tone: Tone;
  message: string;
}
interface ToastApi {
  show: (message: string, tone?: Tone) => void;
  /** Removes every toast (e.g. the user picked a new file after an error). */
  clear: () => void;
}

const Ctx = createContext<ToastApi>({ show: () => {}, clear: () => {} });

// Open sheets/dialogs: toasts move to the top so they never cover sheet actions.
let openSheets = 0;
const sheetListeners = new Set<() => void>();
export function registerOpenSheet(): () => void {
  openSheets++;
  sheetListeners.forEach((l) => l());
  return () => {
    openSheets--;
    sheetListeners.forEach((l) => l());
  };
}
function useSheetOpen(): boolean {
  return useSyncExternalStore(
    (l) => {
      sheetListeners.add(l);
      return () => sheetListeners.delete(l);
    },
    () => openSheets > 0,
  );
}

export function useToast(): ToastApi {
  return useContext(Ctx);
}

const bar: Record<Tone, string> = {
  success: 'bg-success-700',
  danger: 'bg-danger-700',
  info: 'bg-primary-600',
};

/** Short feedback after an action, stacked at the bottom on phones and top-right on desktop. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const next = useRef(1);
  const dismiss = useCallback((id: number) => setItems((l) => l.filter((t) => t.id !== id)), []);
  const show = useCallback(
    (message: string, tone: Tone = 'success') => {
      const id = next.current++;
      setItems((l) => [...l.slice(-2), { id, tone, message }]);
      setTimeout(() => dismiss(id), tone === 'danger' ? 7000 : 4500);
    },
    [dismiss],
  );
  const clear = useCallback(() => setItems([]), []);
  const api = useMemo(() => ({ show, clear }), [show, clear]);
  const sheetOpen = useSheetOpen();
  // Full-screen pages outside the app shell (sign-in, onboarding) have their
  // actions at the bottom on phones: toasts go to the top there (UX2-21).
  const top = sheetOpen || !globalThis.location?.pathname.startsWith('/app');
  return (
    <Ctx.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        data-position={top ? 'top' : 'bottom'}
        className={cx(
          'pointer-events-none fixed z-[60] flex flex-col items-center gap-2 md:inset-x-auto md:top-4 md:right-4 md:bottom-auto md:items-end',
          top
            ? 'inset-x-4 top-[calc(1rem+env(safe-area-inset-top))]'
            : 'inset-x-4 bottom-[calc(5rem+env(safe-area-inset-bottom))]',
        )}
      >
        <AnimatePresence initial={false}>
          {items.map((t) => (
            <motion.div
              key={t.id}
              layout
              role={t.tone === 'danger' ? 'alert' : 'status'}
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{
                opacity: 0,
                scale: 0.98,
                transition: { duration: duration.fast, ease: easing.exit },
              }}
              transition={{ duration: duration.base, ease: easing.standard }}
              className="pointer-events-auto flex w-full max-w-sm overflow-hidden rounded-control bg-surface shadow-raised"
            >
              <span aria-hidden className={cx('w-1 shrink-0', bar[t.tone])} />
              <p className="flex-1 px-4 py-3 text-sm text-ink-800">{t.message}</p>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                className="min-h-11 px-3 text-xs font-semibold text-ink-500 hover:text-ink-800"
              >
                Dismiss
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </Ctx.Provider>
  );
}
