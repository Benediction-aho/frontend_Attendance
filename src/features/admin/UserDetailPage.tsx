import { useState, type ReactNode } from 'react';
import { motion } from 'motion/react';
import { useNavigate, useParams } from 'react-router';
import { Alert } from '../../ui/Alert';
import { Avatar } from '../../ui/Avatar';
import { Badge, STATUS_TONE } from '../../ui/Badge';
import { Button, type ButtonVariant } from '../../ui/Button';
import { Card, CardBody, CardHeader } from '../../ui/Card';
import { Select } from '../../ui/Field';
import { Modal } from '../../ui/Modal';
import { PageHeader } from '../../ui/PageHeader';
import { SkeletonRows } from '../../ui/Skeleton';
import { useToast } from '../../ui/Toast';
import { fadeUp, stagger } from '../../ui/motion';
import { ApiError, errorMessage } from '../../lib/api';
import { employeeTypeLabel } from '../../lib/employeeType';
import { ROLE_LABEL, STATUS_LABEL, formatDate, formatDateTime } from '../../lib/format';
import { accountActions } from '../../lib/permissions';
import type { Role, User } from '../../lib/types';
import { useMe } from '../auth/useSession';
import { PermissionsEditor } from './PermissionsEditor';
import {
  ACTION_DONE,
  conflictMessage,
  usePermissionCatalogue,
  useUser,
  useUserAction,
  type UserAction,
} from './useAdminUsers';

interface Confirm {
  action: UserAction;
  title: string;
  body: ReactNode;
  cta: string;
  variant: ButtonVariant;
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[8.5rem_minmax(0,1fr)] gap-3 py-2.5 text-sm">
      <dt className="text-ink-500">{label}</dt>
      <dd className="wrap-anywhere text-ink-800">{children || '–'}</dd>
    </div>
  );
}

export function UserDetailPage() {
  const id = Number(useParams().id);
  const { data: me } = useMe();
  const navigate = useNavigate();
  const toast = useToast();
  const user = useUser(id);
  const action = useUserAction(id);
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [sendNewCode, setSendNewCode] = useState(false);
  const [role, setRole] = useState<Role | ''>('');
  const superA = me?.role === 'super_admin';
  const catalogue = usePermissionCatalogue(superA);

  const run = (a: UserAction) =>
    action.mutate(a, {
      onSuccess: () => {
        toast.show(ACTION_DONE[a.kind]);
        setConfirm(null);
        if (a.kind === 'delete' || a.kind === 'reject')
          navigate('/app/admin/users', { replace: true });
      },
      onError: (e) => {
        toast.show(
          e instanceof ApiError && e.status === 409
            ? conflictMessage(e.code, e.message)
            : errorMessage(e),
          'danger',
        );
        setConfirm(null);
      },
    });

  if (user.isPending)
    return (
      <Card>
        <SkeletonRows rows={3} />
      </Card>
    );
  if (user.isError)
    return (
      <>
        <PageHeader title="Account" back={{ to: '/app/admin/users', label: 'Users' }} />
        <Alert tone="danger">
          {user.error instanceof ApiError && user.error.status === 404
            ? 'This account does not exist or was deleted.'
            : errorMessage(user.error)}
        </Alert>
      </>
    );

  const u: User = user.data;
  const can = accountActions(me, u);
  const ask = (c: Confirm) => {
    setSendNewCode(false);
    setConfirm(c);
  };
  const anyAction = can.approve || can.block || can.unblock || can.unlock || can.newCode;

  return (
    <>
      <PageHeader title={u.full_name} back={{ to: '/app/admin/users', label: 'Users' }} />
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="grid gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]"
      >
        <motion.div variants={fadeUp} className="flex flex-col gap-5">
          <Card>
            <CardBody className="flex items-center gap-4 py-5">
              <Avatar src={u.photo_url} first={u.first_name} last={u.last_name} size="lg" />
              <div className="min-w-0">
                <p className="truncate text-sm text-ink-500">{u.email}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge tone={STATUS_TONE[u.status]}>{STATUS_LABEL[u.status]}</Badge>
                  <Badge tone="primary">{ROLE_LABEL[u.role]}</Badge>
                  {u.employee_type && <Badge>{employeeTypeLabel(u)}</Badge>}
                </div>
              </div>
            </CardBody>
            <CardBody className="border-t border-ink-100 pt-2">
              <dl className="divide-y divide-ink-100">
                <Row label="Job title">{u.job_title}</Row>
                <Row label="Phone">{u.phone}</Row>
                <Row label="WhatsApp">{u.whatsapp}</Row>
                <Row label="Date of birth">{u.birth_date ? formatDate(u.birth_date) : null}</Row>
                <Row label="Address">{u.address}</Row>
                <Row label="Requested">{formatDateTime(u.created_at)}</Row>
                <Row label="Approved">{u.approved_at ? formatDateTime(u.approved_at) : null}</Row>
                <Row label="Last sign-in">
                  {u.last_login_at ? formatDateTime(u.last_login_at) : 'Never'}
                </Row>
                {u.code_pending && (
                  <Row label="Code">
                    Not yet replaced
                    {u.code_expires_at ? ` · expires ${formatDateTime(u.code_expires_at)}` : ''}
                  </Row>
                )}
              </dl>
            </CardBody>
          </Card>
          {can.editPermissions && (
            <Card>
              <CardHeader
                title="Admin permissions"
                description="This admin can only do what is ticked here."
              />
              <CardBody>
                <PermissionsEditor
                  key={(u.permissions ?? []).join()}
                  catalogue={catalogue.data}
                  initial={u.permissions ?? []}
                  saving={action.isPending && action.variables?.kind === 'permissions'}
                  onSave={(permissions) => run({ kind: 'permissions', permissions })}
                />
              </CardBody>
            </Card>
          )}
        </motion.div>
        <motion.div variants={fadeUp} className="flex flex-col gap-5">
          {anyAction && (
            <Card>
              <CardHeader title="Actions" />
              <CardBody className="flex flex-col gap-2">
                {can.approve && (
                  <Button
                    onClick={() => run({ kind: 'approve' })}
                    loading={action.isPending && action.variables?.kind === 'approve'}
                  >
                    Approve and send code
                  </Button>
                )}
                {can.reject && (
                  <Button
                    variant="outline"
                    onClick={() =>
                      ask({
                        action: { kind: 'reject' },
                        title: 'Reject this request?',
                        body: 'The person will not get access. They can request again later.',
                        cta: 'Reject request',
                        variant: 'danger',
                      })
                    }
                  >
                    Reject request
                  </Button>
                )}
                {can.unlock && (
                  <Button
                    onClick={() =>
                      ask({
                        action: { kind: 'unlock', sendNewCode: false },
                        title: 'Restore sign-in?',
                        body: 'The failed attempts are cleared and the person can sign in again.',
                        cta: 'Restore sign-in',
                        variant: 'primary',
                      })
                    }
                  >
                    Unlock sign-in
                  </Button>
                )}
                {can.unblock && (
                  <Button
                    onClick={() =>
                      ask({
                        action: { kind: 'unblock' },
                        title: 'Unblock this account?',
                        body: 'The person can use the app again.',
                        cta: 'Unblock',
                        variant: 'primary',
                      })
                    }
                  >
                    Unblock
                  </Button>
                )}
                {can.newCode && (
                  <Button
                    variant="outline"
                    onClick={() =>
                      ask({
                        action: { kind: 'code' },
                        title: 'Send a new identification code?',
                        body: 'The current code or password stops working and the person is signed out of every device.',
                        cta: 'Send new code',
                        variant: 'primary',
                      })
                    }
                  >
                    Send a new code
                  </Button>
                )}
                {can.block && (
                  <Button
                    variant="outline"
                    onClick={() =>
                      ask({
                        action: { kind: 'block' },
                        title: 'Block this account?',
                        body: 'Access is cut immediately on every device until you unblock it.',
                        cta: 'Block account',
                        variant: 'danger',
                      })
                    }
                  >
                    Block
                  </Button>
                )}
              </CardBody>
            </Card>
          )}
          {can.changeRole && (
            <Card>
              <CardHeader
                title="Role"
                description="Changing the role signs the person out of every device."
              />
              <CardBody className="flex flex-col gap-3">
                <Select
                  label="Role"
                  value={role || u.role}
                  onChange={(e) => setRole(e.target.value as Role)}
                >
                  <option value="employee">{ROLE_LABEL.employee}</option>
                  <option value="admin">{ROLE_LABEL.admin}</option>
                  <option value="super_admin">{ROLE_LABEL.super_admin}</option>
                </Select>
                {role === 'super_admin' &&
                  u.role !== 'super_admin' &&
                  !(u.permissions ?? []).includes('promote_to_super_admin') &&
                  u.role === 'admin' && (
                    <Alert tone="warning">
                      This admin is not marked as eligible for promotion.
                    </Alert>
                  )}
                <Button
                  disabled={!role || role === u.role}
                  onClick={() =>
                    role &&
                    ask({
                      action: { kind: 'role', role },
                      title: `Make ${u.first_name} ${role === 'super_admin' ? 'a super admin' : role === 'admin' ? 'an admin' : 'staff'}?`,
                      body:
                        role === 'super_admin'
                          ? 'A super admin can do everything, including managing other super admins.'
                          : 'The new role applies at the next sign-in.',
                      cta: 'Change role',
                      variant: 'primary',
                    })
                  }
                >
                  Change role
                </Button>
              </CardBody>
            </Card>
          )}
          {can.remove && (
            <Card className="border-t-2 border-t-danger-200" data-testid="danger-zone">
              <CardHeader
                title="Danger zone"
                description="Closes the account for good. This cannot be undone."
              />
              <CardBody>
                <Button
                  variant="danger-outline"
                  className="w-full sm:w-auto"
                  onClick={() =>
                    ask({
                      action: { kind: 'delete' },
                      title: `Delete ${u.full_name}?`,
                      body: 'The account is closed and signed out everywhere. History keeps the name.',
                      cta: 'Delete account',
                      variant: 'danger',
                    })
                  }
                >
                  Delete account
                </Button>
              </CardBody>
            </Card>
          )}
        </motion.div>
      </motion.div>
      <Modal
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        title={confirm?.title ?? ''}
        description={confirm?.body}
        footer={
          <>
            <Button variant="outline" onClick={() => setConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant={confirm?.variant ?? 'primary'}
              loading={action.isPending}
              onClick={() =>
                confirm &&
                run(
                  confirm.action.kind === 'unlock'
                    ? { kind: 'unlock', sendNewCode }
                    : confirm.action,
                )
              }
            >
              {confirm?.cta}
            </Button>
          </>
        }
      >
        {confirm?.action.kind === 'unlock' && (
          <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-ink-700">
            <input
              type="checkbox"
              checked={sendNewCode}
              onChange={(e) => setSendNewCode(e.target.checked)}
              className="size-4 accent-primary-600"
            />
            Also email a new identification code
          </label>
        )}
      </Modal>
    </>
  );
}
