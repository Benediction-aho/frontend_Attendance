import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useNavigate } from 'react-router';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { EmptyState } from '../../ui/EmptyState';
import { PageHeader } from '../../ui/PageHeader';
import { Pagination } from '../../ui/Pagination';
import { SkeletonRows } from '../../ui/Skeleton';
import { Alert } from '../../ui/Alert';
import { useToast } from '../../ui/Toast';
import { cx } from '../../ui/cx';
import { errorMessage } from '../../lib/api';
import { formatDateTime } from '../../lib/format';
import type { AppNotification } from '../../lib/types';
import { useMarkRead, useNotifications, useUnreadCount } from './useNotifications';

export function NotificationsPage() {
  const [page, setPage] = useState(1);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const list = useNotifications(page, unreadOnly);
  const unread = useUnreadCount();
  const mark = useMarkRead();
  const toast = useToast();
  const navigate = useNavigate();

  const open = (n: AppNotification) => {
    if (!n.read_at) mark.mutate(n.id);
    const path = n.data.path;
    if (path && path.startsWith('/app')) navigate(path);
  };

  return (
    <>
      <PageHeader
        title="Notifications"
        description={unread.data ? `${unread.data} unread` : 'You are all caught up.'}
        actions={
          <Button
            variant="outline"
            size="sm"
            disabled={!unread.data}
            loading={mark.isPending && mark.variables === 'all'}
            onClick={() =>
              mark.mutate('all', {
                onSuccess: () => toast.show('All notifications marked as read.'),
                onError: (e) => toast.show(errorMessage(e), 'danger'),
              })
            }
          >
            Mark all as read
          </Button>
        }
      />
      <div
        role="tablist"
        aria-label="Filter"
        className="mb-4 inline-flex rounded-control bg-ink-100 p-1"
      >
        {[
          { v: false, l: 'All' },
          { v: true, l: 'Unread' },
        ].map((t) => (
          <button
            key={t.l}
            role="tab"
            aria-selected={unreadOnly === t.v}
            onClick={() => {
              setUnreadOnly(t.v);
              setPage(1);
            }}
            className={cx(
              'min-h-11 rounded-[0.5rem] px-4 text-sm font-medium transition-colors',
              unreadOnly === t.v ? 'bg-surface text-primary-700 shadow-card' : 'text-ink-600',
            )}
          >
            {t.l}
          </button>
        ))}
      </div>
      <Card>
        {list.isPending ? (
          <SkeletonRows rows={4} />
        ) : list.isError ? (
          <div className="p-5">
            <Alert tone="danger">{errorMessage(list.error)}</Alert>
          </div>
        ) : list.data.data.length === 0 ? (
          <EmptyState
            title={unreadOnly ? 'No unread notifications' : 'No notifications yet'}
            description="Approvals, reminders and alerts will appear here."
          />
        ) : (
          <>
            <ul className="divide-y divide-ink-100">
              <AnimatePresence initial={false}>
                {list.data.data.map((n, i) => (
                  <motion.li
                    key={n.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0, transition: { delay: Math.min(i, 8) * 0.03 } }}
                  >
                    <button
                      type="button"
                      onClick={() => open(n)}
                      className="flex w-full gap-3 px-5 py-4 text-left transition-colors hover:bg-surface-muted"
                    >
                      <span
                        aria-hidden
                        className={cx(
                          'mt-1.5 size-2 shrink-0 rounded-full',
                          n.read_at ? 'bg-transparent' : 'bg-secondary-500',
                        )}
                      />
                      <span className="min-w-0 flex-1">
                        <span
                          className={cx(
                            'block text-sm',
                            n.read_at ? 'text-ink-700' : 'font-semibold text-ink-900',
                          )}
                        >
                          {!n.read_at && <span className="sr-only">Unread: </span>}
                          {n.data.title ?? 'Notification'}
                        </span>
                        {n.data.body && (
                          <span className="mt-0.5 block text-sm text-ink-500">{n.data.body}</span>
                        )}
                        <span className="mt-1 block text-xs text-ink-400">
                          {formatDateTime(n.created_at)}
                        </span>
                      </span>
                    </button>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
            <Pagination
              page={list.data.meta.current_page}
              lastPage={list.data.meta.last_page}
              onPage={setPage}
            />
          </>
        )}
      </Card>
    </>
  );
}
