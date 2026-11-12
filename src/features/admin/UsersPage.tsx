import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { FilterPanel } from '../../ui/FilterPanel';
import { Card } from '../../ui/Card';
import { Badge, STATUS_TONE } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { Input, Select } from '../../ui/Field';
import { EmptyState } from '../../ui/EmptyState';
import { PageHeader } from '../../ui/PageHeader';
import { Pagination } from '../../ui/Pagination';
import { SkeletonRows } from '../../ui/Skeleton';
import { Alert } from '../../ui/Alert';
import { Avatar } from '../../ui/Avatar';
import { Table, TBody, TD, TH, THead, TR } from '../../ui/Table';
import { errorMessage } from '../../lib/api';
import { ROLE_LABEL, STATUS_LABEL, TYPE_LABEL, formatDateTime } from '../../lib/format';
import { can, isSuperAdmin } from '../../lib/permissions';
import { useMe } from '../auth/useSession';
import { useUsers } from './useAdminUsers';

export function UsersPage() {
  const { data: me } = useMe();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const get = (k: string) => params.get(k) ?? '';
  const [q, setQ] = useState(get('q'));
  const page = Number(get('page') || 1);
  const set = (k: string, v: string) => {
    const n = new URLSearchParams(params);
    if (v) n.set(k, v);
    else n.delete(k);
    if (k !== 'page') n.delete('page');
    setParams(n, { replace: true });
  };

  useEffect(() => {
    const t = setTimeout(() => {
      if (window.location.pathname === '/app/admin/users' && q !== (params.get('q') ?? ''))
        set('q', q.trim());
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const list = useUsers({
    q: get('q'),
    status: get('status'),
    role: get('role'),
    employee_type: get('type'),
    page,
  });
  const rows = list.data?.data ?? [];
  const filtered = Boolean(get('q') || get('status') || get('role') || get('type'));

  return (
    <>
      <PageHeader
        title="Users"
        description={
          list.data
            ? `${list.data.meta.total} account${list.data.meta.total === 1 ? '' : 's'}`
            : undefined
        }
        back={{ to: '/app/admin', label: 'Administration' }}
        actions={
          can(me, 'create_users') && (
            <Button onClick={() => navigate('/app/admin/users/new')}>Add a user</Button>
          )
        }
      />
      <FilterPanel
        activeMore={['status', 'role', 'type'].filter((k) => get(k)).length}
        onClear={() => {
          const n = new URLSearchParams(params);
          ['status', 'role', 'type', 'page'].forEach((k) => n.delete(k));
          setParams(n, { replace: true });
        }}
        main={
          <Input
            label="Search"
            type="search"
            placeholder="Name or email"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        }
        more={
          <>
            <Select
              label="Status"
              value={get('status')}
              onChange={(e) => set('status', e.target.value)}
            >
              <option value="">All statuses</option>
              {Object.entries(STATUS_LABEL).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </Select>
            {isSuperAdmin(me) && (
              <Select
                label="Role"
                value={get('role')}
                onChange={(e) => set('role', e.target.value)}
              >
                <option value="">All roles</option>
                {Object.entries(ROLE_LABEL).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </Select>
            )}
            <Select label="Type" value={get('type')} onChange={(e) => set('type', e.target.value)}>
              <option value="">Interns and employees</option>
              <option value="intern">Interns</option>
              <option value="employee">Employees</option>
            </Select>
          </>
        }
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
            title={filtered ? 'No account matches these filters' : 'No accounts yet'}
            action={
              filtered && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setQ('');
                    setParams(new URLSearchParams(), { replace: true });
                  }}
                >
                  Clear filters
                </Button>
              )
            }
          />
        ) : (
          <>
            {/* Phones: list; larger screens: table */}
            <ul className="divide-y divide-ink-100 md:hidden">
              {rows.map((u, i) => (
                <motion.li
                  key={u.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1, transition: { delay: Math.min(i, 10) * 0.02 } }}
                >
                  <Link
                    to={`/app/admin/users/${u.id}`}
                    className="flex items-center gap-3 px-4 py-3.5 hover:bg-surface-muted"
                  >
                    <Avatar src={u.photo_url} first={u.first_name} last={u.last_name} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold text-ink-900">
                        {u.full_name}
                      </span>
                      <span className="block truncate text-sm text-ink-500">
                        {u.job_title ?? u.email}
                      </span>
                    </span>
                    <Badge tone={STATUS_TONE[u.status]}>{STATUS_LABEL[u.status]}</Badge>
                  </Link>
                </motion.li>
              ))}
            </ul>
            <div className="hidden md:block">
              <Table>
                <THead>
                  <tr>
                    <TH>Name</TH>
                    <TH>Role</TH>
                    <TH>Type</TH>
                    <TH>Status</TH>
                    <TH>Last sign-in</TH>
                  </tr>
                </THead>
                <TBody>
                  {rows.map((u) => (
                    <TR
                      key={u.id}
                      className="cursor-pointer hover:bg-surface-muted"
                      onClick={() => navigate(`/app/admin/users/${u.id}`)}
                    >
                      <TD>
                        <div className="flex items-center gap-3">
                          <Avatar
                            src={u.photo_url}
                            first={u.first_name}
                            last={u.last_name}
                            size="sm"
                          />
                          <div className="min-w-0">
                            <Link
                              to={`/app/admin/users/${u.id}`}
                              onClick={(e) => e.stopPropagation()}
                              className="font-semibold text-ink-900 hover:text-primary-700"
                            >
                              {u.full_name}
                            </Link>
                            <p className="truncate text-xs text-ink-500">{u.email}</p>
                          </div>
                        </div>
                      </TD>
                      <TD>{ROLE_LABEL[u.role]}</TD>
                      <TD>{TYPE_LABEL[u.employee_type]}</TD>
                      <TD>
                        <Badge tone={STATUS_TONE[u.status]}>{STATUS_LABEL[u.status]}</Badge>
                      </TD>
                      <TD className="whitespace-nowrap text-ink-500">
                        {formatDateTime(u.last_login_at)}
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </div>
            <Pagination
              page={list.data.meta.current_page}
              lastPage={list.data.meta.last_page}
              total={list.data.meta.total}
              onPage={(p) => set('page', String(p))}
            />
          </>
        )}
      </Card>
    </>
  );
}
