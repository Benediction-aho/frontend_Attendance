import { useId } from 'react';
import { motion } from 'motion/react';
import { cx } from './cx';

export function Switch({
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <label htmlFor={id} className="text-sm font-medium text-ink-800">
          {label}
        </label>
        {description && <p className="text-xs text-ink-500">{description}</p>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className="flex min-h-11 min-w-11 shrink-0 items-center justify-center disabled:opacity-50"
      >
        <span
          className={cx(
            'flex h-7 w-12 items-center rounded-full p-0.5 transition-colors duration-200 ease-standard',
            checked ? 'justify-end bg-primary-600' : 'justify-start bg-ink-200',
          )}
        >
          <motion.span
            layout
            transition={{ type: 'spring', stiffness: 600, damping: 36 }}
            className="size-6 rounded-full bg-surface shadow-card"
          />
        </span>
      </button>
    </div>
  );
}
