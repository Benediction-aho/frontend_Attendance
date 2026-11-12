import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'motion/react';
import { Alert } from '../../ui/Alert';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { Card, CardBody, CardHeader } from '../../ui/Card';
import { Input } from '../../ui/Field';
import { PageHeader } from '../../ui/PageHeader';
import { Pagination } from '../../ui/Pagination';
import { SkeletonRows } from '../../ui/Skeleton';
import { Switch } from '../../ui/Switch';
import { Table, TBody, TD, TH, THead, TR } from '../../ui/Table';
import { EmptyState } from '../../ui/EmptyState';
import { useToast } from '../../ui/Toast';
import { cx } from '../../ui/cx';
import { duration, easing, fadeUp, stagger } from '../../ui/motion';
import { ApiError, api, errorMessage, qs } from '../../lib/api';
import { formatDate, formatDateTime } from '../../lib/format';
import { displayValue, groupSettings, parseInput, sameValue, toInput } from '../../lib/settings';
import type { Paginated, Setting, SettingHistoryEntry } from '../../lib/types';

function useSettings() {
  return useQuery({
    queryKey: ['admin', 'settings'],
    queryFn: async () => (await api.get<{ data: Setting[] }>('/admin/settings')).data,
  });
}

function SettingControl({
  s,
  value,
  error,
  onChange,
}: {
  s: Setting;
  value: string | boolean;
  error?: string;
  onChange: (v: string | boolean) => void;
}) {
  const hint = (
    <>
      Default: {displayValue(s.default)}
      {s.scheduled.map((x) => (
        <span key={x.effective_from} className="block text-secondary-800">
          Changes to {displayValue(x.value)} on {formatDate(x.effective_from)}
        </span>
      ))}
    </>
  );
  if (s.type === 'bool')
    return (
      <div className="py-1">
        <Switch
          label={s.label}
          checked={Boolean(value)}
          onChange={onChange}
          disabled={!s.editable}
        />
        <p className="mt-0.5 text-xs text-ink-500">{hint}</p>
      </div>
    );
  return (
    <Input
      label={s.label}
      type={s.type === 'time' ? 'time' : 'text'}
      inputMode={s.type === 'int' ? 'numeric' : s.type === 'float' ? 'decimal' : undefined}
      value={String(value)}
      disabled={!s.editable}
      onChange={(e) => onChange(e.target.value)}
      error={error}
      hint={s.editable ? hint : 'Fixed by the system.'}
    />
  );
}

function SettingsForm({ settings }: { settings: Setting[] }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [draft, setDraft] = useState<Record<string, string | boolean>>({});
  const [effective, setEffective] = useState('');
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  const byKey = useMemo(() => Object.fromEntries(settings.map((s) => [s.key, s])), [settings]);

  const parsed = useMemo(() => {
    const values: Record<string, unknown> = {};
    const errors: Record<string, string> = {};
    for (const [k, raw] of Object.entries(draft)) {
      const s = byKey[k];
      if (!s) continue;
      const r = parseInput(raw, s.type);
      if (!r.ok) errors[k] = r.error;
      else if (!sameValue(r.value, s.value)) values[k] = r.value;
    }
    return { values, errors };
  }, [draft, byKey]);
  const changed = Object.keys(parsed.values).length;
  const invalid = Object.keys(parsed.errors).length > 0;

  const save = useMutation({
    mutationFn: () =>
      api.put<{ data: Setting[] }>('/admin/settings', {
        values: parsed.values,
        ...(effective ? { effective_from: effective } : {}),
      }),
    onSuccess: (r) => {
      qc.setQueryData(['admin', 'settings'], r.data);
      void qc.invalidateQueries({ queryKey: ['admin', 'settings', 'history'] });
      setDraft({});
      setServerErrors({});
      toast.show(
        effective
          ? `Changes scheduled for ${formatDate(effective)}.`
          : 'Settings saved. They apply now.',
      );
      setEffective('');
    },
    onError: (e) => {
      if (e instanceof ApiError && e.status === 422) {
        const out: Record<string, string> = {};
        for (const [k, m] of Object.entries(e.fieldErrors))
          out[k.replace(/^values\./, '').replace(/\.\d+$/, '')] = m;
        setServerErrors(out);
        toast.show(
          out.effective_from ?? 'Some values were not accepted. Check the highlighted fields.',
          'danger',
        );
      } else toast.show(errorMessage(e), 'danger');
    },
  });

  return (
    <>
      <motion.div variants={stagger} initial="hidden" animate="show" className="grid gap-5 pb-36">
        {groupSettings(settings).map((g) => (
          <motion.section key={g.key} variants={fadeUp}>
            <Card>
              <CardHeader title={g.title} description={g.description} />
              <CardBody className="grid gap-x-6 gap-y-5 md:grid-cols-2">
                {g.items.map((s) => (
                  <SettingControl
                    key={s.key}
                    s={s}
                    value={draft[s.key] ?? toInput(s.value, s.type)}
                    error={parsed.errors[s.key] ?? serverErrors[s.key]}
                    onChange={(v) => setDraft((d) => ({ ...d, [s.key]: v }))}
                  />
                ))}
              </CardBody>
            </Card>
          </motion.section>
        ))}
      </motion.div>
      <AnimatePresence>
        {(changed > 0 || invalid) && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: duration.base, ease: easing.standard }}
            className="fixed inset-x-3 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-40 md:inset-x-auto md:right-8 md:bottom-6 md:left-72"
          >
            <div className="mx-auto flex max-w-4xl flex-col gap-3 rounded-panel border border-primary-100 bg-surface p-4 shadow-raised sm:flex-row sm:items-end">
              <div className="flex-1">
                <p className="text-sm font-semibold text-ink-900">
                  {invalid
                    ? 'Fix the highlighted values'
                    : `${changed} unsaved change${changed > 1 ? 's' : ''}`}
                </p>
                <p className="text-xs text-ink-500">
                  Past records keep the rules that applied at the time.
                </p>
              </div>
              <Input
                label="Apply from"
                type="date"
                value={effective}
                onChange={(e) => setEffective(e.target.value)}
                hint={effective ? undefined : 'Empty = immediately'}
                wrapperClassName="sm:w-48"
              />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setDraft({});
                    setServerErrors({});
                    setEffective('');
                  }}
                >
                  Discard
                </Button>
                <Button
                  disabled={invalid || changed === 0}
                  loading={save.isPending}
                  onClick={() => save.mutate()}
                >
                  {effective ? 'Schedule' : 'Save now'}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function History({ labels }: { labels: Record<string, string> }) {
  const [page, setPage] = useState(1);
  const [key, setKey] = useState('');
  const h = useQuery({
    queryKey: ['admin', 'settings', 'history', page, key],
    queryFn: () =>
      api.get<Paginated<SettingHistoryEntry>>(`/admin/settings/history${qs({ page, key })}`),
    placeholderData: (p) => p,
  });
  return (
    <Card>
      <div className="border-b border-ink-100 p-4">
        <label className="flex flex-col gap-1.5 text-sm font-medium text-ink-700 sm:max-w-xs">
          Setting
          <select
            value={key}
            onChange={(e) => {
              setKey(e.target.value);
              setPage(1);
            }}
            className="min-h-11 rounded-control border border-ink-200 bg-surface px-3 text-base sm:text-sm"
          >
            <option value="">All settings</option>
            {Object.entries(labels).map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </select>
        </label>
      </div>
      {h.isPending ? (
        <SkeletonRows rows={4} />
      ) : h.isError ? (
        <div className="p-5">
          <Alert tone="danger">{errorMessage(h.error)}</Alert>
        </div>
      ) : h.data.data.length === 0 ? (
        <EmptyState
          title="No changes yet"
          description="Every change will be listed here with its author and date."
        />
      ) : (
        <>
          <Table>
            <THead>
              <tr>
                <TH>Setting</TH>
                <TH>Change</TH>
                <TH>Applies from</TH>
                <TH>By</TH>
              </tr>
            </THead>
            <TBody>
              {h.data.data.map((e, i) => (
                <TR key={`${e.key}-${e.changed_at}-${i}`}>
                  <TD className="min-w-48 font-medium text-ink-800">{labels[e.key] ?? e.key}</TD>
                  <TD className="whitespace-nowrap">
                    <span className="text-ink-500 line-through">{displayValue(e.old_value)}</span>
                    <span className="mx-1.5 text-ink-400">to</span>
                    <span className="font-semibold text-primary-700">
                      {displayValue(e.new_value)}
                    </span>
                  </TD>
                  <TD className="whitespace-nowrap">{formatDateTime(e.effective_from)}</TD>
                  <TD className="whitespace-nowrap">
                    {e.changed_by?.name ?? 'System'}
                    <span className="block text-xs text-ink-400">
                      {formatDateTime(e.changed_at)}
                    </span>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
          <Pagination
            page={h.data.meta.current_page}
            lastPage={h.data.meta.last_page}
            total={h.data.meta.total}
            onPage={setPage}
          />
        </>
      )}
    </Card>
  );
}

export function SettingsPage() {
  const settings = useSettings();
  const [tab, setTab] = useState<'settings' | 'history'>('settings');
  const labels = useMemo(
    () => Object.fromEntries((settings.data ?? []).map((s) => [s.key, s.label])),
    [settings.data],
  );
  const scheduled = (settings.data ?? []).filter((s) => s.scheduled.length).length;
  return (
    <>
      <PageHeader
        title="Settings"
        description="Every rule of the system. Changes are recorded and can start on a future date."
        back={{ to: '/app/admin', label: 'Administration' }}
        actions={
          scheduled > 0 && (
            <Badge tone="accent">
              {scheduled} scheduled change{scheduled > 1 ? 's' : ''}
            </Badge>
          )
        }
      />
      <div
        role="tablist"
        aria-label="Settings views"
        className="mb-5 inline-flex rounded-control bg-ink-100 p-1"
      >
        {(['settings', 'history'] as const).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={cx(
              'min-h-11 rounded-[0.5rem] px-4 text-sm font-medium transition-colors',
              tab === t ? 'bg-surface text-primary-700 shadow-card' : 'text-ink-600',
            )}
          >
            {t === 'settings' ? 'Current settings' : 'History'}
          </button>
        ))}
      </div>
      {tab === 'history' ? (
        <History labels={labels} />
      ) : settings.isPending ? (
        <Card>
          <SkeletonRows />
        </Card>
      ) : settings.isError ? (
        <Alert tone="danger">{errorMessage(settings.error)}</Alert>
      ) : (
        <SettingsForm settings={settings.data} />
      )}
    </>
  );
}
