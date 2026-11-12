import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost';

const styles: Record<Variant, string> = {
  primary: 'bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800',
  secondary: 'bg-secondary-500 text-ink-900 hover:bg-secondary-400',
  ghost: 'bg-transparent text-primary-700 hover:bg-primary-50',
};

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      type="button"
      className={`inline-flex min-h-11 items-center justify-center rounded-control px-5 text-sm font-semibold transition-colors ease-standard disabled:opacity-50 ${styles[variant]} ${className}`}
      {...props}
    />
  );
}
