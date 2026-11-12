import type { ButtonHTMLAttributes } from 'react';
import { cx } from './cx';
import { Spinner } from './Spinner';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type Size = 'md' | 'lg' | 'sm';

const styles: Record<ButtonVariant, string> = {
  primary:
    'bg-primary-600 text-white shadow-sm hover:bg-primary-700 active:bg-primary-800 disabled:bg-primary-300',
  secondary: 'bg-secondary-500 text-ink-900 hover:bg-secondary-400 active:bg-secondary-600',
  outline:
    'border border-ink-200 bg-surface text-ink-800 hover:border-primary-300 hover:bg-primary-50 active:bg-primary-100',
  ghost: 'bg-transparent text-primary-700 hover:bg-primary-50 active:bg-primary-100',
  danger: 'bg-danger-700 text-white hover:bg-danger-800 active:bg-danger-900',
};

const sizes: Record<Size, string> = {
  sm: 'min-h-11 px-3 text-sm',
  md: 'min-h-11 px-5 text-sm',
  lg: 'min-h-12 px-6 text-base',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: Size;
  loading?: boolean;
  block?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  block = false,
  className,
  disabled,
  children,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cx(
        'relative inline-flex select-none items-center justify-center gap-2 rounded-control font-semibold transition-[background-color,border-color,color,transform,box-shadow] duration-200 ease-standard active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100',
        styles[variant],
        sizes[size],
        block && 'w-full',
        className,
      )}
      {...props}
    >
      <span className={cx('inline-flex items-center gap-2', loading && 'invisible')}>
        {children}
      </span>
      {loading && (
        <span className="absolute inset-0 flex items-center justify-center">
          <Spinner label="Please wait" />
        </span>
      )}
    </button>
  );
}
