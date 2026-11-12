import { useMemo, useState } from 'react';
import { Button } from '../../ui/Button';
import { Skeleton } from '../../ui/Skeleton';
import { cx } from '../../ui/cx';
import type { PermissionTier } from '../../lib/types';

/** Checkbox list of the permission tiers returned by the API. */
export function PermissionChecklist({
  catalogue,
  value,
  onChange,
  loading,
}: {
  catalogue: PermissionTier[] | undefined;
  value: string[];
  onChange: (v: string[]) => void;
  loading?: boolean;
}) {
  if (loading || !catalogue)
    return (
      <div className="grid gap-2">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-11" />
        ))}
      </div>
    );
  const toggle = (k: string) =>
    onChange(value.includes(k) ? value.filter((x) => x !== k) : [...value, k]);
  return (
    <fieldset>
      <legend className="sr-only">Permissions</legend>
      <div className="mb-2 flex flex-wrap gap-2">
        <Button variant="ghost" size="sm" onClick={() => onChange(catalogue.map((c) => c.key))}>
          Select all
        </Button>
        <Button variant="ghost" size="sm" onClick={() => onChange([])}>
          Clear
        </Button>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {catalogue.map((p) => {
          const on = value.includes(p.key);
          return (
            <label
              key={p.key}
              className={cx(
                'flex min-h-11 cursor-pointer items-start gap-3 rounded-control border px-3 py-2.5 text-sm transition-colors has-[:focus-visible]:shadow-focus',
                on
                  ? 'border-primary-300 bg-primary-50 text-primary-900'
                  : 'border-ink-200 text-ink-700 hover:border-ink-300',
              )}
            >
              <input
                type="checkbox"
                checked={on}
                onChange={() => toggle(p.key)}
                className="mt-0.5 size-4 shrink-0 accent-primary-600"
              />
              <span>{p.label}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export function PermissionsEditor({
  catalogue,
  initial,
  saving,
  onSave,
}: {
  catalogue: PermissionTier[] | undefined;
  initial: string[];
  saving: boolean;
  onSave: (v: string[]) => void;
}) {
  const [value, setValue] = useState(initial);
  const dirty = useMemo(
    () => [...value].sort().join() !== [...initial].sort().join(),
    [value, initial],
  );
  return (
    <div className="flex flex-col gap-4">
      <PermissionChecklist
        catalogue={catalogue}
        value={value}
        onChange={setValue}
        loading={!catalogue}
      />
      <div className="flex flex-wrap items-center justify-end gap-3">
        {dirty && <span className="text-sm text-secondary-800">Unsaved changes</span>}
        {dirty && (
          <Button variant="outline" onClick={() => setValue(initial)}>
            Undo
          </Button>
        )}
        <Button disabled={!dirty} loading={saving} onClick={() => onSave(value)}>
          Save permissions
        </Button>
      </div>
    </div>
  );
}
