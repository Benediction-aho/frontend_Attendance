import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'motion/react';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { EmptyState } from '../../ui/EmptyState';
import { Modal } from '../../ui/Modal';
import { PageHeader } from '../../ui/PageHeader';
import { Pagination } from '../../ui/Pagination';
import { SkeletonRows } from '../../ui/Skeleton';
import { Alert } from '../../ui/Alert';
import { useToast } from '../../ui/Toast';
import { ApiError, errorMessage } from '../../lib/api';
import { formatDateTime, TYPE_LABEL } from '../../lib/format';
import type { User } from '../../lib/types';
import { ACTION_DONE, runUserAction, useUsers } from './useAdminUsers';

export function RequestsPage() {
  const [page, setPage] = useState(1);
  const list = useUsers({ status: 'pending', page });
  const qc = useQueryClient();
  const toast = useToast();
  const [busy, setBusy] = useState<number | null>(null);
  const [rejecting, setRejecting] = useState<User | null>(null);

  const act = async (u: User, kind: 'approve' | 'reject') => {
    setBusy(u.id);
    try {
      await runUserAction(u.id, { kind });
      toast.show(
        kind === 'approve'
          ? `${u.full_name} approved. The identification code has been emailed.`
          : ACTION_DONE.reject,
      );
      setRejecting(null);
      await qc.invalidateQueries({ queryKey: ['admin', 'users'] });
    } catch (e) {
      toast.show(
        e instanceof ApiError && e.status === 403
          ? 'This request was already handled or you are not allowed to do this.'
          : errorMessage(e),
        'danger',
      );
      void qc.invalidateQueries({ queryKey: ['admin', 'users'] });
    } finally {
      setBusy(null);
    }
  };

  const rows = list.data?.data ?? [];
  return (
    <>
      <PageHeader
        title="Sign-up requests"
        description="Approving a request emails an identification code to the person automatically."
        back={{ to: '/app/admin', label: 'Administration' }}
      />
      <Card>
        {list.isPending ? (
          <SkeletonRows />
        ) : list.isError ? (
          <div className="p-5">
            <Alert tone="danger">{errorMessage(list.error)}</Alert>
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            title="No requests waiting"
            description="New sign-up requests will appear here, and you will be notified."
          />
        ) : (
          <>
            <ul className="divide-y divide-ink-100">
              <AnimatePresence initial={false}>
                {rows.map((u) => (
                  <motion.li
                    key={u.id}
                    layout
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: 24 }}
                    className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-ink-900">{u.full_name}</p>
                      <p className="truncate text-sm text-ink-500">{u.email}</p>
                      <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-ink-600">
                        <Badge tone="neutral">{TYPE_LABEL[u.employee_type]}</Badge>
                        <span>{u.job_title ?? '–'}</span>
                        <span className="text-xs text-ink-400">
                          · {formatDateTime(u.created_at)}
                        </span>
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setRejecting(u)}
                        disabled={busy === u.id}
                        className="flex-1 sm:flex-none"
                      >
                        Reject
                      </Button>
                      <Button
                        onClick={() => void act(u, 'approve')}
                        loading={busy === u.id && !rejecting}
                        className="flex-1 sm:flex-none"
                      >
                        Approve
                      </Button>
                    </div>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
            <Pagination
              page={list.data.meta.current_page}
              lastPage={list.data.meta.last_page}
              total={list.data.meta.total}
              onPage={setPage}
            />
          </>
        )}
      </Card>
      <Modal
        open={Boolean(rejecting)}
        onClose={() => setRejecting(null)}
        title="Reject this request?"
        description={
          rejecting
            ? `${rejecting.full_name} (${rejecting.email}) will not get access. They can send a new request later.`
            : undefined
        }
        footer={
          <>
            <Button variant="outline" onClick={() => setRejecting(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={busy !== null}
              onClick={() => rejecting && void act(rejecting, 'reject')}
            >
              Reject request
            </Button>
          </>
        }
      />
    </>
  );
}
