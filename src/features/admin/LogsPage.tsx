import { Fragment, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'motion/react';
import { useSearchParams } from 'react-router';
import { Alert } from '../../ui/Alert';
import { Badge, type Tone } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { FilterPanel } from '../../ui/FilterPanel';
import { Card } from '../../ui/Card';
import { Input, Select } from '../../ui/Field';
import { EmptyState } from '../../ui/EmptyState';
import { PageHeader } from '../../ui/PageHeader';
import { Pagination } from '../../ui/Pagination';
import { SkeletonRows } from '../../ui/Skeleton';
import { api, errorMessage, qs } from '../../lib/api';
import { formatDateTime } from '../../lib/format';
import { canManageAccounts } from '../../lib/permissions';
import type { ActivityLog, Paginated, User } from '../../lib/types';
import { useMe } from '../auth/useSession';

const LEVEL_TONE: Record<ActivityLog['level'], Tone> = {
  info: 'neutral',
  warning: 'warning',
  error: 'danger',
  critical: 'danger',
};
const TYPE_LABEL: Record<ActivityLog['type'], string> = {
  action: 'Action',
  error: 'Error',
  security: 'Security',
  automatic: 'Automatic',
};
const LEVEL_LABEL: Record<ActivityLog['level'], string> = {
  info: 'Info',
  warning: 'Warning',
  error: 'Error',
  critical: 'Critical',
};
const FILTERS = ['user_id', 'type', 'level', 'from', 'to', 'event'] as const;

function Details({ log }: { log: ActivityLog }) {
  return (
    <dl className="grid gap-x-6 gap-y-2 text-xs sm:grid-cols-2">
      <div>
        <dt className="text-ink-500">Event</dt>
        <dd className="font-mono break-all text-ink-800">{log.event}</dd>
      </div>
      <div>
        <dt className="text-ink-500">By</dt>
        <dd className="text-ink-800">{log.actor?.name ?? 'System'}</dd>
      </div>
      <div>
        <dt className="text-ink-500">IP address</dt>
        <dd className="text-ink-800">{log.ip ?? '–'}</dd>
      </div>
      <div>
        <dt className="text-ink-500">Device</dt>
        <dd className="font-mono break-all text-ink-800">{log.device_id ?? '–'}</dd>
      </div>
      <div className="sm:col-span-2">
        <dt className="text-ink-500">Browser</dt>
        <dd className="break-words text-ink-800">{log.user_agent ?? '–'}</dd>
      </div>
      {log.context && Object.keys(log.context).length > 0 && (
        <div className="sm:col-span-2">
          <dt className="text-ink-500">Details</dt>
          <dd>
            <pre className="mt-1 max-h-60 overflow-auto rounded-control bg-ink-50 p-3 whitespace-pre-wrap text-ink-700">
              {JSON.stringify(log.context, null, 2)}
            </pre>
          </dd>
        </div>
      )}
    </dl>
  );
}

export function LogsPage() {
  const { data: me } = useMe();
  const [params, setParams] = useSearchParams();
  const [open, setOpen] = useState<number | null>(null);
  const get = (k: string) => params.get(k) ?? '';
  const set = (k: string, v: string) => {
    const n = new URLSearchParams(params);
    if (v) n.set(k, v);
    else n.delete(k);
    if (k !== 'page') n.delete('page');
    setParams(n, { replace: true });
  };
  const page = Number(get('page') || 1);
  const filters = Object.fromEntries(FILTERS.map((k) => [k, get(k)]));
  const logs = useQuery({
    queryKey: ['admin', 'logs', filters, page],
    queryFn: () =>
      api.get<Paginated<ActivityLog>>(
        `/admin/activity-logs${qs({ ...filters, page, per_page: 50 })}`,
      ),
    placeholderData: (p) => p,
  });
  const users = useQuery({
    queryKey: ['admin', 'users', 'all-for-filter'],
    queryFn: () => api.get<Paginated<User>>(`/admin/users${qs({ per_page: 100 })}`),
    enabled: canManageAccounts(me),
    staleTime: 5 * 60_000,
  });
  const filtered = FILTERS.some((k) => get(k));

  return (
    <>
      <PageHeader
        title="Activity log"
        description="Read-only record of actions, security events, automatic tasks and errors."
        back={{ to: '/app/admin', label: 'Administration' }}
      />
      <FilterPanel
        gridClassName="sm:grid-cols-2 lg:grid-cols-3"
        activeMore={FILTERS.filter((k) => k !== 'type' && get(k)).length}
        onClear={() => {
          const n = new URLSearchParams();
          if (get('type')) n.set('type', get('type'));
          setParams(n, { replace: true });
        }}
        main={
          <Select label="Type" value={get('type')} onChange={(e) => set('type', e.target.value)}>
            <option value="">All types</option>
            {Object.entries(TYPE_LABEL).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </Select>
        }
        more={
          <>
            {users.data ? (
              <Select
                label="User"
                value={get('user_id')}
                onChange={(e) => set('user_id', e.target.value)}
              >
                <option value="">Everyone</option>
                {users.data.data.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.full_name} ({u.email})
                  </option>
                ))}
              </Select>
            ) : (
              <Input
                label="User ID"
                inputMode="numeric"
                value={get('user_id')}
                onChange={(e) => set('user_id', e.target.value.replace(/\D/g, ''))}
              />
            )}
            <Select
              label="Level"
              value={get('level')}
              onChange={(e) => set('level', e.target.value)}
            >
              <option value="">All levels</option>
              <option value="info">Info</option>
              <option value="warning">Warning</option>
              <option value="error">Error</option>
              <option value="critical">Critical</option>
            </Select>
            <Input
              label="From"
              type="date"
              value={get('from')}
              onChange={(e) => set('from', e.target.value)}
            />
            <Input
              label="To"
              type="date"
              value={get('to')}
              onChange={(e) => set('to', e.target.value)}
            />
            <Input
              label="Event starts with"
              placeholder="e.g. auth."
              value={get('event')}
              onChange={(e) => set('event', e.target.value.trim())}
            />
          </>
        }
        footer={
          <>
            {filtered && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-3"
                onClick={() => setParams(new URLSearchParams(), { replace: true })}
              >
                Clear filters
              </Button>
            )}
          </>
        }
      />
      <Card>
        {logs.isPending ? (
          <SkeletonRows rows={6} />
        ) : logs.isError ? (
          <div className="p-5">
            <Alert tone="danger">{errorMessage(logs.error)}</Alert>
          </div>
        ) : logs.data.data.length === 0 ? (
          <EmptyState
            title="No entries"
            description={filtered ? 'Nothing matches these filters.' : 'Activity will appear here.'}
          />
        ) : (
          <>
            <ul className="divide-y divide-ink-100">
              {logs.data.data.map((l) => {
                const expanded = open === l.id;
                return (
                  <Fragment key={l.id}>
                    <li>
                      <button
                        type="button"
                        aria-expanded={expanded}
                        onClick={() => setOpen(expanded ? null : l.id)}
                        className="flex w-full flex-col gap-1.5 px-5 py-3.5 text-left transition-colors hover:bg-surface-muted sm:flex-row sm:items-center sm:gap-4"
                      >
                        <span className="w-40 shrink-0 text-xs text-ink-500 tabular-nums">
                          {formatDateTime(l.created_at)}
                        </span>
                        <span className="flex shrink-0 gap-1.5">
                          <Badge
                            tone={
                              l.type === 'security'
                                ? 'primary'
                                : l.type === 'error'
                                  ? 'danger'
                                  : 'neutral'
                            }
                          >
                            {TYPE_LABEL[l.type]}
                          </Badge>
                          {l.level !== 'info' && (
                            <Badge tone={LEVEL_TONE[l.level]}>{LEVEL_LABEL[l.level]}</Badge>
                          )}
                        </span>
                        <span className="min-w-0 flex-1 text-sm text-ink-800">
                          {l.description}
                          {l.user && (
                            <span className="block truncate text-xs text-ink-500">
                              {l.user.name} · {l.user.email}
                              {l.user.deleted ? ' (deleted)' : ''}
                            </span>
                          )}
                        </span>
                      </button>
                      <AnimatePresence initial={false}>
                        {expanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="px-5 pb-4">
                              <Details log={l} />
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </li>
                  </Fragment>
                );
              })}
            </ul>
            <Pagination
              page={logs.data.meta.current_page}
              lastPage={logs.data.meta.last_page}
              total={logs.data.meta.total}
              onPage={(p) => set('page', String(p))}
            />
          </>
        )}
      </Card>
    </>
  );
}
