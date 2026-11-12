import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'motion/react';
import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { api, ApiError, errorMessage, qs } from '../../lib/api';
import { formatDateTime } from '../../lib/format';
import { can, isSuperAdmin } from '../../lib/permissions';
import type { PageMeta } from '../../lib/types';
import { Alert } from '../../ui/Alert';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { Card, CardBody } from '../../ui/Card';
import { EmptyState } from '../../ui/EmptyState';
import { Modal } from '../../ui/Modal';
import { PageHeader } from '../../ui/PageHeader';
import { SkeletonRows } from '../../ui/Skeleton';
import { useToast } from '../../ui/Toast';
import { fadeUp, stagger } from '../../ui/motion';
import { useMe } from '../auth/useSession';
import { Tabs } from '../../ui/Tabs';
import type { FaceIdCredential } from './useFaceId';

type Status = 'pending' | 'approved' | 'revoked';

const REVOKE_REASON: Record<string, string> = {
  superseded: 'Replaced by a newer device',
  replaced: 'Replaced by a newer device',
  rejected: 'Request rejected',
  revoked: 'Revoked by a super admin',
};

function Detail({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-ink-500">{label}</dt>
      <dd className="break-words text-ink-900">{value || '–'}</dd>
    </div>
  );
}

function DeviceCard({ c, onRevoke }: { c: FaceIdCredential; onRevoke?: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const { data: me } = useMe();
  const decide = useMutation({
    mutationFn: (d: 'approve' | 'reject') => api.post(`/admin/faceid/credentials/${c.id}/${d}`),
    onSuccess: (_r, d) => {
      toast.show(
        d === 'approve'
          ? 'Device approved. The previous one is no longer valid.'
          : 'Request rejected.',
      );
      void qc.invalidateQueries({ queryKey: ['admin', 'faceid'] });
    },
    onError: (e) => {
      if (e instanceof ApiError && e.code === 'faceid_already_reviewed') {
        toast.show('Another administrator already reviewed this request.', 'info');
        void qc.invalidateQueries({ queryKey: ['admin', 'faceid'] });
      }
    },
  });
  const r = c.registration;
  const name = c.user ? `${c.user.first_name} ${c.user.last_name}` : 'Employee';
  return (
    <Card>
      <CardBody>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="font-semibold text-ink-900">{name}</p>
            <p className="text-sm text-ink-600">{c.name ?? c.device?.name ?? 'Unnamed device'}</p>
          </div>
          <Badge
            tone={
              c.status === 'approved' ? 'success' : c.status === 'pending' ? 'accent' : 'neutral'
            }
          >
            {c.status === 'approved' ? 'Approved' : c.status === 'pending' ? 'Waiting' : 'Revoked'}
          </Badge>
        </div>
        <dl className="mt-4 grid gap-x-4 gap-y-2 text-sm sm:grid-cols-2">
          <Detail label="Phone system" value={r?.platform} />
          <Detail label="Browser" value={r?.browser} />
          <Detail label="Registered" value={formatDateTime(r?.registered_at ?? c.created_at)} />
          <Detail
            label="Device first seen"
            value={r?.device_first_seen_at ? formatDateTime(r.device_first_seen_at) : null}
          />
          <Detail label="IP address" value={r?.ip} />
          {c.last_used_at && <Detail label="Last used" value={formatDateTime(c.last_used_at)} />}
          {c.revoke_reason && (
            <Detail
              label="Status detail"
              value={REVOKE_REASON[c.revoke_reason] ?? c.revoke_reason}
            />
          )}
          {r?.user_agent && (
            <div className="sm:col-span-2">
              <dt className="text-ink-500">Technical details</dt>
              <dd className="break-all text-xs text-ink-600">{r.user_agent}</dd>
            </div>
          )}
        </dl>
        {c.status === 'pending' && can(me, 'approve_faceid_devices') && (
          <>
            <p className="mt-4 text-xs text-ink-500">
              Approve only if the employee confirmed this new phone. Approving replaces their
              previous device.
            </p>
            {decide.isError &&
              !(
                decide.error instanceof ApiError && decide.error.code === 'faceid_already_reviewed'
              ) && (
                <Alert tone="danger" className="mt-3">
                  {errorMessage(decide.error)}
                </Alert>
              )}
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                loading={decide.isPending && decide.variables === 'approve'}
                disabled={decide.isPending}
                onClick={() => decide.mutate('approve')}
              >
                Approve device
              </Button>
              <Button
                variant="danger-outline"
                loading={decide.isPending && decide.variables === 'reject'}
                disabled={decide.isPending}
                onClick={() => decide.mutate('reject')}
              >
                Reject
              </Button>
            </div>
          </>
        )}
        {c.status === 'approved' && onRevoke && (
          <Button variant="danger-ghost" className="mt-3" onClick={onRevoke}>
            Revoke
          </Button>
        )}
      </CardBody>
    </Card>
  );
}

/** New Face ID devices to approve (approve_faceid_devices); revoke for super admins. */
export function FaceIdDevicesPage() {
  const { data: me } = useMe();
  const [params, setParams] = useSearchParams();
  const status = (params.get('status') as Status) || 'pending';
  const qc = useQueryClient();
  const toast = useToast();
  const [revoking, setRevoking] = useState<FaceIdCredential | null>(null);
  const q = useQuery({
    queryKey: ['admin', 'faceid', status],
    queryFn: () =>
      api.get<{ data: FaceIdCredential[]; meta: PageMeta }>(
        `/admin/faceid/credentials${qs({ status })}`,
      ),
  });
  const revoke = useMutation({
    mutationFn: (id: number) => api.post(`/admin/faceid/credentials/${id}/revoke`),
    onSuccess: () => {
      toast.show('Face ID revoked. The employee must register again.');
      setRevoking(null);
      void qc.invalidateQueries({ queryKey: ['admin', 'faceid'] });
    },
  });
  return (
    <>
      <PageHeader
        title="Face ID devices"
        description="New phones waiting for approval, and approved devices."
      />
      <Tabs
        label="Device status"
        value={status}
        onChange={(v) => setParams({ status: v }, { replace: true })}
        tabs={[
          { v: 'pending', label: 'Waiting' },
          { v: 'approved', label: 'Approved' },
          { v: 'revoked', label: 'Revoked' },
        ]}
      />
      {q.isPending && <SkeletonRows rows={3} />}
      {q.isError && <Alert tone="danger">{errorMessage(q.error)}</Alert>}
      {q.data && q.data.data.length === 0 && (
        <EmptyState title={status === 'pending' ? 'Nothing to review' : 'No devices'} />
      )}
      <motion.ul
        variants={stagger}
        initial="hidden"
        animate="show"
        className="flex max-w-2xl flex-col gap-3"
      >
        {q.data?.data.map((c) => (
          <motion.li key={c.id} variants={fadeUp}>
            <DeviceCard c={c} onRevoke={isSuperAdmin(me) ? () => setRevoking(c) : undefined} />
          </motion.li>
        ))}
      </motion.ul>
      <Modal
        open={revoking !== null}
        onClose={() => setRevoking(null)}
        title="Revoke this Face ID?"
        description="The employee can no longer check in with this phone until they register again and an administrator approves it."
        footer={
          <>
            <Button variant="ghost" onClick={() => setRevoking(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={revoke.isPending}
              onClick={() => revoking && revoke.mutate(revoking.id)}
            >
              Revoke
            </Button>
          </>
        }
      >
        {revoke.isError && <Alert tone="danger">{errorMessage(revoke.error)}</Alert>}
      </Modal>
    </>
  );
}
