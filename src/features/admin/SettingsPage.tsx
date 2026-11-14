import { Fragment, useEffect, useMemo, useState } from 'react';
import { Link, useBlocker, useParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'motion/react';
import { Alert } from '../../ui/Alert';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { Card, CardBody, CardHeader } from '../../ui/Card';
import { Input, Select } from '../../ui/Field';
import { Modal } from '../../ui/Modal';
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
import { formatDate, formatDateTime, isoDay } from '../../lib/format';
import { serverNow } from '../../lib/serverTime';
import {
  boundsHint,
  displayValue,
  friendlyServerMessage,
  groupSettings,
  isSettingsSection,
  normalizeTime,
  parseInput,
  PERIMETER_HELP,
  SECTION_INFO,
  sectionOf,
  sameValue,
  toInput,
} from '../../lib/settings';
import type { Paginated, Setting, SettingHistoryEntry } from '../../lib/types';
import { settingsSections, type SettingsSection } from '../../lib/permissions';
import { useMe } from '../auth/useSession';

interface SettingsResponse {
  data: Setting[];
  /** Parts the caller may edit (absent on older API versions). */
  sections?: SettingsSection[];
}

function useSettings() {
  return useQuery({
    queryKey: ['admin', 'settings'],
    queryFn: () => api.get<SettingsResponse>('/admin/settings'),
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
  const range = boundsHint(s);
  const hint = (
    <>
      {range && <span className="block">{range}</span>}
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
      // Never a native time input: it follows the browser locale and may show AM/PM.
      type="text"
      inputMode={s.type === 'int' ? 'numeric' : s.type === 'float' ? 'decimal' : undefined}
      placeholder={s.type === 'time' ? 'e.g. 8:10 AM' : undefined}
      maxLength={s.type === 'time' ? 10 : undefined}
      autoComplete="off"
      value={String(value)}
      disabled={!s.editable}
      onChange={(e) => onChange(e.target.value)}
      onBlur={
        s.type === 'time'
          ? (e) => {
              const t = normalizeTime(e.target.value);
              if (t !== e.target.value) onChange(t);
            }
          : undefined
      }
      error={error}
      hint={
        s.editable ? (
          <>
            {s.type === 'time' && (
              <span className="block">12-hour clock, e.g. 8:10 AM or 5:00 PM.</span>
            )}
            {hint}
          </>
        ) : s.super_admin_only ? (
          'Only a super admin can change this.'
        ) : (
          'Fixed by the system.'
        )
      }
    />
  );
}

/** Fields that open the phone keyboard (switches and buttons do not). */
function isTextEntry(el: EventTarget): boolean {
  return (
    el instanceof HTMLInputElement && !['checkbox', 'radio', 'button', 'submit'].includes(el.type)
  );
}

function omit(o: Record<string, string>, key: string): Record<string, string> {
  if (!(key in o)) return o;
  const out = { ...o };
  delete out[key];
  return out;
}

/** Warns before leaving the page (in-app navigation and tab close) with unsaved changes. */
function useLeaveGuard(dirty: boolean) {
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      dirty && currentLocation.pathname !== nextLocation.pathname,
  );
  useEffect(() => {
    if (!dirty) return;
    const onUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onUnload);
    return () => window.removeEventListener('beforeunload', onUnload);
  }, [dirty]);
  return blocker;
}

function SettingsForm({
  settings,
  canEdit,
  superA,
}: {
  settings: Setting[];
  canEdit: boolean;
  superA: boolean;
}) {
  const qc = useQueryClient();
  const toast = useToast();
  const [draft, setDraft] = useState<Record<string, string | boolean>>({});
  const [effective, setEffective] = useState('');
  const [scheduling, setScheduling] = useState(false);
  const [editing, setEditing] = useState(false);
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  const byKey = useMemo(() => Object.fromEntries(settings.map((s) => [s.key, s])), [settings]);
  const today = isoDay(serverNow());

  const parsed = useMemo(() => {
    const values: Record<string, unknown> = {};
    const errors: Record<string, string> = {};
    for (const [k, raw] of Object.entries(draft)) {
      const s = byKey[k];
      if (!s) continue;
      const r = parseInput(raw, s.type, s);
      if (!r.ok) errors[k] = r.error;
      else if (!sameValue(r.value, s.value)) values[k] = r.value;
    }
    return { values, errors };
  }, [draft, byKey]);
  const changed = Object.keys(parsed.values).length;
  const invalid = Object.keys(parsed.errors).length > 0;
  const dateError =
    serverErrors.effective_from ??
    (effective && effective < today ? 'Choose today or a later date.' : undefined);
  const blocker = useLeaveGuard(changed > 0 || invalid);

  const discard = () => {
    setDraft({});
    setServerErrors({});
    setEffective('');
    setScheduling(false);
  };

  const save = useMutation({
    mutationFn: () =>
      api.put<SettingsResponse>('/admin/settings', {
        values: parsed.values,
        ...(effective ? { effective_from: effective } : {}),
      }),
    onSuccess: () => {
      // Refetch: the PUT answer may not carry the caller's sections.
      void qc.invalidateQueries({ queryKey: ['admin', 'settings'] });
      void qc.invalidateQueries({ queryKey: ['admin', 'settings', 'history'] });
      toast.show(
        effective
          ? `Changes scheduled for ${formatDate(effective)}.`
          : 'Settings saved. They apply now.',
      );
      discard();
    },
    onError: (e) => {
      if (e instanceof ApiError && e.status === 422) {
        const out: Record<string, string> = {};
        for (const [k, m] of Object.entries(e.fieldErrors))
          out[k.replace(/^values\./, '').replace(/\.\d+$/, '')] = friendlyServerMessage(m);
        setServerErrors(out);
        if (out.effective_from) setScheduling(true);
        toast.show(
          out.effective_from ?? 'Some values were not accepted. Check the highlighted fields.',
          'danger',
        );
      } else if (e instanceof ApiError && e.status === 403) {
        toast.show(
          'You are not allowed to change these settings. Your access may have changed.',
          'danger',
        );
        discard();
        void qc.invalidateQueries({ queryKey: ['admin', 'settings'] });
        void qc.invalidateQueries({ queryKey: ['me'] });
      } else toast.show(errorMessage(e), 'danger');
    },
  });

  return (
    <>
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="grid gap-5 pb-36"
        onFocus={(e) => setEditing(isTextEntry(e.target))}
        onBlur={() => setEditing(false)}
      >
        {groupSettings(settings).map((g) => (
          <motion.section key={g.key} variants={fadeUp}>
            <Card>
              <CardHeader title={g.title} description={g.description} />
              <CardBody className="grid gap-x-6 gap-y-5 md:grid-cols-2">
                {g.items.map((s) => (
                  <Fragment key={s.key}>
                    {s.key === 'checkin_radius_m' && (
                      <p
                        className="text-sm text-ink-600 md:col-span-2"
                        data-testid="perimeter-help"
                      >
                        {PERIMETER_HELP}
                      </p>
                    )}
                    <SettingControl
                      s={canEdit && (superA || !s.super_admin_only) ? s : { ...s, editable: false }}
                      value={draft[s.key] ?? toInput(s.value, s.type)}
                      error={parsed.errors[s.key] ?? serverErrors[s.key]}
                      onChange={(v) => {
                        setDraft((d) => ({ ...d, [s.key]: v }));
                        setServerErrors((errs) => omit(errs, s.key));
                      }}
                    />
                  </Fragment>
                ))}
              </CardBody>
            </Card>
          </motion.section>
        ))}
      </motion.div>
      <AnimatePresence>
        {(changed > 0 || invalid) && (
          <motion.div
            data-testid="unsaved-bar"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: duration.base, ease: easing.standard }}
            className={cx(
              'fixed inset-x-3 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-40 md:inset-x-auto md:right-8 md:bottom-6 md:left-72',
              // Phones: while a field is being edited (keyboard open) the bar steps aside.
              editing && 'max-md:hidden',
            )}
          >
            <div className="mx-auto flex max-w-4xl flex-col gap-2 rounded-panel border border-primary-100 bg-surface px-4 py-3 shadow-raised">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <p className="min-w-0 flex-1 text-sm font-semibold text-ink-900">
                  {invalid
                    ? 'Fix the highlighted values'
                    : `${changed} unsaved change${changed > 1 ? 's' : ''}`}
                  {!scheduling && (
                    <button
                      type="button"
                      onClick={() => setScheduling(true)}
                      className="ml-2 inline-flex min-h-11 items-center text-sm font-medium text-primary-700 underline-offset-2 hover:underline"
                    >
                      Schedule for later
                    </button>
                  )}
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={discard}>
                    Discard
                  </Button>
                  <Button
                    disabled={invalid || changed === 0 || Boolean(dateError)}
                    loading={save.isPending}
                    onClick={() => save.mutate()}
                  >
                    {effective ? 'Schedule' : 'Save now'}
                  </Button>
                </div>
              </div>
              {scheduling && (
                <div className="flex flex-wrap items-end gap-3 border-t border-ink-100 pt-2">
                  <Input
                    label="Apply from"
                    type="date"
                    min={today}
                    value={effective}
                    onChange={(e) => {
                      setEffective(e.target.value);
                      setServerErrors((errs) => omit(errs, 'effective_from'));
                    }}
                    error={dateError}
                    hint={
                      effective
                        ? 'Past records keep the rules that applied at the time.'
                        : 'Empty = immediately.'
                    }
                    wrapperClassName="w-full sm:w-56"
                  />
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <Modal
        open={blocker.state === 'blocked'}
        onClose={() => blocker.reset?.()}
        title="Leave without saving?"
        description="Your changes to the settings have not been saved."
        footer={
          <>
            <Button variant="outline" onClick={() => blocker.reset?.()}>
              Stay on this page
            </Button>
            <Button variant="danger" onClick={() => blocker.proceed?.()}>
              Discard changes
            </Button>
          </>
        }
      />
    </>
  );
}

function History({
  labels,
  section,
}: {
  labels: Record<string, string>;
  section: SettingsSection;
}) {
  const [page, setPage] = useState(1);
  const [key, setKey] = useState('');
  const h = useQuery({
    queryKey: ['admin', 'settings', 'history', section, page, key],
    queryFn: async () => {
      const r = await api.get<Paginated<SettingHistoryEntry>>(
        `/admin/settings/history${qs({ page, key, section })}`,
      );
      // Only changes to settings of this part (the server filters too).
      return { ...r, data: r.data.filter((e) => e.key in labels) };
    },
    placeholderData: (p) => p,
  });
  return (
    <Card>
      <div className="border-b border-ink-100 p-4">
        <Select
          label="Setting"
          value={key}
          onChange={(e) => {
            setKey(e.target.value);
            setPage(1);
          }}
          wrapperClassName="sm:max-w-xs"
        >
          <option value="">All settings</option>
          {Object.entries(labels).map(([k, l]) => (
            <option key={k} value={k}>
              {l}
            </option>
          ))}
        </Select>
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
          {/* Phones: stacked rows; from sm: table */}
          <ul className="divide-y divide-ink-100 sm:hidden" data-testid="history-list">
            {h.data.data.map((e, i) => (
              <li key={`${e.key}-${e.changed_at}-${i}`} className="px-4 py-3.5">
                <p className="font-semibold text-ink-900">{labels[e.key] ?? e.key}</p>
                <p className="mt-0.5 text-sm">
                  <span className="text-ink-500">{displayValue(e.old_value)}</span>
                  <span className="mx-1.5 text-ink-500">to</span>
                  <span className="font-semibold text-ink-900">{displayValue(e.new_value)}</span>
                </p>
                <p className="mt-0.5 text-xs text-ink-500">
                  From {formatDate(e.effective_from)} · {e.changed_by?.name ?? 'System'}
                </p>
              </li>
            ))}
          </ul>
          <div className="hidden sm:block">
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
                      <span className="text-ink-500">{displayValue(e.old_value)}</span>
                      <span className="mx-1.5 text-ink-500">to</span>
                      <span className="font-semibold text-ink-900">
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
          </div>
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

export function SettingsPage({ section: forced }: { section?: SettingsSection }) {
  const { part } = useParams();
  const section: SettingsSection = forced ?? (isSettingsSection(part) ? part : 'attendance');
  const settings = useSettings();
  const { data: me } = useMe();
  const parts = settingsSections(me);
  const [tab, setTab] = useState<'settings' | 'history'>('settings');
  const mine = useMemo(
    () => (settings.data?.data ?? []).filter((s) => sectionOf(s) === section),
    [settings.data, section],
  );
  const labels = useMemo(() => Object.fromEntries(mine.map((s) => [s.key, s.label])), [mine]);
  const editable = settings.data?.sections;
  // Older API (no `sections`): only super admins could read settings at all.
  const canEdit = editable ? editable.includes(section) : true;
  const scheduled = mine.filter((s) => s.scheduled.length).length;
  const info = SECTION_INFO[section];
  return (
    <>
      <PageHeader
        title={parts.length > 1 ? 'Settings' : `Settings – ${info.title}`}
        description={`${info.description} Changes are recorded and can start on a future date.`}
        back={{ to: '/app/admin', label: 'Administration' }}
        actions={
          scheduled > 0 && (
            <Badge tone="accent">
              {scheduled} scheduled change{scheduled > 1 ? 's' : ''}
            </Badge>
          )
        }
      />
      {parts.length > 1 && (
        <nav aria-label="Settings parts" className="-mx-4 mb-4 overflow-x-auto px-4">
          <ul className="flex min-w-max gap-1 border-b border-ink-200">
            {parts.map((p) => (
              <li key={p}>
                <Link
                  to={`/app/admin/settings/${p}`}
                  aria-current={p === section ? 'page' : undefined}
                  onClick={() => setTab('settings')}
                  className={cx(
                    '-mb-px inline-flex min-h-11 items-center border-b-2 px-4 text-sm font-medium transition-colors',
                    p === section
                      ? 'border-primary-600 text-primary-700'
                      : 'border-transparent text-ink-600 hover:text-ink-900',
                  )}
                >
                  {SECTION_INFO[p].title}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
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
      {settings.isPending ? (
        <Card>
          <SkeletonRows />
        </Card>
      ) : settings.isError ? (
        <Alert tone="danger">{errorMessage(settings.error)}</Alert>
      ) : tab === 'history' ? (
        <History key={section} labels={labels} section={section} />
      ) : mine.length === 0 ? (
        <Card>
          <EmptyState
            title="No settings in this part"
            description="Nothing to configure here yet."
          />
        </Card>
      ) : (
        <SettingsForm
          key={section}
          settings={mine}
          canEdit={canEdit}
          superA={me?.role === 'super_admin'}
        />
      )}
    </>
  );
}
