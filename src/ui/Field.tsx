import {
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type Ref,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { cx } from './cx';
import { duration, easing } from './motion';

const control =
  'block w-full min-h-11 rounded-control border bg-surface px-3.5 text-base text-ink-900 placeholder:text-ink-400 transition-[border-color,box-shadow] duration-200 ease-standard focus:outline-none focus:border-primary-500 focus:shadow-focus disabled:bg-ink-50 disabled:text-ink-500 sm:text-sm';

function border(invalid?: boolean) {
  return invalid ? 'border-danger-700' : 'border-ink-200 hover:border-ink-300';
}

export interface FieldProps {
  label: string;
  error?: string;
  hint?: ReactNode;
  optional?: boolean;
  children: (ids: { id: string; describedBy?: string; invalid: boolean }) => ReactNode;
  className?: string;
}

/** Label + control + hint + animated error message. */
export function Field({ label, error, hint, optional, children, className }: FieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errId = error ? `${id}-err` : undefined;
  const describedBy = [hintId, errId].filter(Boolean).join(' ') || undefined;
  return (
    <div className={cx('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-sm font-medium text-ink-700">
        {label}
        {optional && <span className="ml-1 font-normal text-ink-400">(optional)</span>}
      </label>
      {children({ id, describedBy, invalid: Boolean(error) })}
      {hint && (
        <p id={hintId} className="text-xs text-ink-500">
          {hint}
        </p>
      )}
      <AnimatePresence initial={false}>
        {error && (
          <motion.p
            id={errId}
            role="alert"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: duration.fast, ease: easing.standard }}
            className="text-sm text-danger-700"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  hint?: ReactNode;
  optional?: boolean;
  ref?: Ref<HTMLInputElement>;
  wrapperClassName?: string;
};

export function Input({
  label,
  error,
  hint,
  optional,
  className,
  wrapperClassName,
  ref,
  ...props
}: InputProps) {
  return (
    <Field label={label} error={error} hint={hint} optional={optional} className={wrapperClassName}>
      {({ id, describedBy, invalid }) => (
        <input
          ref={ref}
          id={id}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          className={cx(control, border(invalid), className)}
          {...props}
        />
      )}
    </Field>
  );
}

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  error?: string;
  hint?: ReactNode;
  optional?: boolean;
  ref?: Ref<HTMLSelectElement>;
  wrapperClassName?: string;
};

export function Select({
  label,
  error,
  hint,
  optional,
  className,
  wrapperClassName,
  ref,
  children,
  ...props
}: SelectProps) {
  return (
    <Field label={label} error={error} hint={hint} optional={optional} className={wrapperClassName}>
      {({ id, describedBy, invalid }) => (
        <select
          ref={ref}
          id={id}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          className={cx(control, border(invalid), className)}
          {...props}
        >
          {children}
        </select>
      )}
    </Field>
  );
}

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  error?: string;
  hint?: ReactNode;
  optional?: boolean;
  ref?: Ref<HTMLTextAreaElement>;
};

export function Textarea({
  label,
  error,
  hint,
  optional,
  className,
  ref,
  ...props
}: TextareaProps) {
  return (
    <Field label={label} error={error} hint={hint} optional={optional}>
      {({ id, describedBy, invalid }) => (
        <textarea
          ref={ref}
          id={id}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          className={cx(control, border(invalid), 'py-2.5', className)}
          {...props}
        />
      )}
    </Field>
  );
}

/** Two-option segmented choice (e.g. Intern / Employee), rendered as radio buttons. */
export function Segmented<T extends string>({
  label,
  name,
  value,
  options,
  onChange,
  error,
}: {
  label: string;
  name: string;
  value: T | undefined;
  options: { value: T; label: string; description?: string }[];
  onChange: (v: T) => void;
  error?: string;
}) {
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="mb-1.5 text-sm font-medium text-ink-700">{label}</legend>
      <div className="grid grid-cols-2 gap-2">
        {options.map((o) => {
          const checked = value === o.value;
          return (
            <label
              key={o.value}
              className={cx(
                'relative flex min-h-11 cursor-pointer flex-col justify-center rounded-control border px-3.5 py-2.5 transition-[border-color,background-color,box-shadow] duration-200 ease-standard has-[:focus-visible]:shadow-focus',
                checked
                  ? 'border-primary-500 bg-primary-50 text-primary-800'
                  : 'border-ink-200 bg-surface text-ink-700 hover:border-ink-300',
              )}
            >
              <input
                type="radio"
                name={name}
                value={o.value}
                checked={checked}
                onChange={() => onChange(o.value)}
                className="sr-only"
              />
              <span className="text-sm font-semibold">{o.label}</span>
              {o.description && <span className="text-xs text-ink-500">{o.description}</span>}
            </label>
          );
        })}
      </div>
      {error && (
        <p role="alert" className="text-sm text-danger-700">
          {error}
        </p>
      )}
    </fieldset>
  );
}
