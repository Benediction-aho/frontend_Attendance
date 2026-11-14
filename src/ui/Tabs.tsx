/** Segmented tabs that filter a list (state kept by the caller, e.g. in the URL). */
export function Tabs<T extends string>({
  value,
  onChange,
  tabs,
  label,
}: {
  value: T;
  onChange: (v: T) => void;
  tabs: { v: T; label: string }[];
  label: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className="mb-5 inline-flex rounded-control bg-ink-100 p-1"
    >
      {tabs.map((t) => (
        <button
          key={t.v}
          role="tab"
          type="button"
          aria-selected={value === t.v}
          onClick={() => onChange(t.v)}
          className={
            value === t.v
              ? 'min-h-11 rounded-control bg-surface px-4 text-sm font-semibold text-primary-700 shadow-card'
              : 'min-h-11 rounded-control px-4 text-sm font-medium text-ink-600 hover:text-ink-900'
          }
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
