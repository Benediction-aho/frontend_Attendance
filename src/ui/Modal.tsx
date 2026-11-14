import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { duration, easing } from './motion';
import { registerOpenSheet } from './Toast';

/**
 * Dialog: bottom sheet on phones, centred card from `sm` up.
 * Escape and the backdrop close it; focus moves in and returns on close.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  showClose = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  /** Shows a text "Close" button next to the title (sheets without a footer). */
  showClose?: boolean;
}) {
  const titleId = useId();
  const panel = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => (open ? registerOpenSheet() : undefined), [open]);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const t = setTimeout(() => {
      const first = panel.current?.querySelector<HTMLElement>(
        'input, select, textarea, button:not([data-close]), [href]',
      );
      (first ?? panel.current)?.focus();
    }, 30);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current();
      if (e.key === 'Tab' && panel.current) {
        const items = panel.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (!items.length) return;
        const first = items[0]!;
        const last = items[items.length - 1]!;
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      clearTimeout(t);
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, [open]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
          <motion.div
            className="absolute inset-0 bg-ink-900/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: duration.base }}
            onClick={onClose}
          />
          <motion.div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 40 }}
            transition={{ duration: duration.base, ease: easing.standard }}
            className="relative max-h-[90dvh] w-full overflow-y-auto rounded-t-panel bg-surface pb-[calc(1rem+env(safe-area-inset-bottom))] sm:pb-0 shadow-raised focus:outline-none sm:max-w-lg sm:rounded-panel"
          >
            <div aria-hidden className="mx-auto mt-2 h-1 w-10 rounded-full bg-ink-200 sm:hidden" />
            <div className="px-5 pt-4 pb-2 sm:px-6 sm:pt-6">
              <div className="flex items-center justify-between gap-3">
                <h2 id={titleId} className="text-lg font-semibold text-ink-900">
                  {title}
                </h2>
                {showClose && (
                  <button
                    type="button"
                    data-close
                    onClick={onClose}
                    className="-mr-2 inline-flex min-h-11 items-center rounded-control px-3 text-sm font-semibold text-primary-700 hover:bg-primary-50"
                  >
                    Close
                  </button>
                )}
              </div>
              {description && <div className="mt-1 text-sm text-ink-600">{description}</div>}
            </div>
            {children && <div className="px-5 py-3 sm:px-6">{children}</div>}
            {footer && (
              <div className="flex flex-col-reverse gap-2 px-5 pt-2 pb-5 sm:flex-row sm:justify-end sm:px-6 sm:pb-6">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
