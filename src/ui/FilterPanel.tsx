import { useState, type ReactNode } from 'react';
import { Button } from './Button';
import { Card } from './Card';
import { Modal } from './Modal';
import { cx } from './cx';

/**
 * Filters card. From `sm` up every field is shown in a grid. On phones only the
 * main field stays visible; the others open in a bottom sheet behind a
 * "Filters" button that shows how many are active.
 */
export function FilterPanel({
  main,
  more,
  activeMore,
  gridClassName = 'sm:grid-cols-2 lg:grid-cols-4',
  footer,
  onClear,
  sheetOpen,
  onSheetOpenChange,
}: {
  main: ReactNode;
  more: ReactNode;
  /** Number of active filters among `more`. */
  activeMore: number;
  gridClassName?: string;
  footer?: ReactNode;
  onClear?: () => void;
  /** Optional control of the phone sheet (e.g. a "Change dates" link elsewhere). */
  sheetOpen?: boolean;
  onSheetOpenChange?: (open: boolean) => void;
}) {
  const [inner, setInner] = useState(false);
  const open = sheetOpen ?? inner;
  const setOpen = (v: boolean) => {
    setInner(v);
    onSheetOpenChange?.(v);
  };
  const label = activeMore ? `Filters · ${activeMore}` : 'Filters';
  return (
    <Card className="mb-4 p-4">
      <div className={cx('grid gap-3', gridClassName)}>
        <div className="flex items-end gap-2">
          <div className="min-w-0 flex-1">{main}</div>
          <Button
            variant="outline"
            className="shrink-0 sm:hidden"
            aria-haspopup="dialog"
            onClick={() => setOpen(true)}
          >
            {label}
          </Button>
        </div>
        <div className="hidden sm:contents">{more}</div>
      </div>
      {footer}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Filters"
        footer={
          <>
            {onClear && activeMore > 0 && (
              <Button
                variant="ghost"
                onClick={() => {
                  onClear();
                  setOpen(false);
                }}
              >
                Clear filters
              </Button>
            )}
            <Button onClick={() => setOpen(false)}>Show results</Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">{more}</div>
      </Modal>
    </Card>
  );
}
