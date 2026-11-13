import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { AnimatePresence, motion } from 'motion/react';
import { useToday } from '../attendance/useAttendance';
import type { ClientEntry, Task } from '../../lib/reports';
import { writeErrorMessage } from '../../lib/reports';
import { formatTime } from '../../lib/attendance';
import { Alert } from '../../ui/Alert';
import { Button } from '../../ui/Button';
import { Card, CardBody, CardHeader } from '../../ui/Card';
import { Input } from '../../ui/Field';
import { Modal } from '../../ui/Modal';
import { PageHeader } from '../../ui/PageHeader';
import { SkeletonRows } from '../../ui/Skeleton';
import { useToast } from '../../ui/Toast';
import { cx } from '../../ui/cx';
import { duration, easing, fadeUp, stagger } from '../../ui/motion';
import {
  useClientMutations,
  useClients,
  useServiceSuggestions,
  useTaskMutations,
  useTasks,
  type ClientInput,
} from './useReports';
import { ServicesList, WorkTabs } from './parts';

const listItem = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, height: 0, marginTop: 0 },
  transition: { duration: duration.base, ease: easing.standard },
};

/** Employee "My work": today's tasks and clients. Writes need today's check-in (server rule). */
export function WorkPage() {
  const today = useToday();
  const locked = today.data ? !today.data.checked_in : false;
  return (
    <motion.div variants={stagger} initial="hidden" animate="show">
      <PageHeader
        title="My work"
        description="Plan your day, tick tasks as done and record your clients."
      />
      <WorkTabs />
      {locked && (
        <Alert tone="info" title="Check in first" className="mb-4">
          You can read your tasks and clients, but adding or changing them needs today's check-in.{' '}
          <Link to="/app" className="font-semibold underline">
            Go to check-in
          </Link>
        </Alert>
      )}
      <div className="grid gap-4 lg:grid-cols-2">
        <motion.div variants={fadeUp}>
          <TasksCard locked={locked} />
        </motion.div>
        <motion.div variants={fadeUp}>
          <ClientsCard locked={locked} />
        </motion.div>
      </div>
    </motion.div>
  );
}

/* Tasks */

export function TasksCard({ locked }: { locked: boolean }) {
  const { data, isPending, isError, refetch } = useTasks();
  const { add, update, remove } = useTaskMutations();
  const toast = useToast();
  const [title, setTitle] = useState('');
  const [error, setError] = useState<string>();
  const [editing, setEditing] = useState<Task | null>(null);
  const [deleting, setDeleting] = useState<Task | null>(null);
  const tasks = data?.data ?? [];
  const done = tasks.filter((t) => t.status === 'done').length;

  const submit = (asDone: boolean) => (e?: FormEvent) => {
    e?.preventDefault();
    const t = title.trim();
    if (!t) return setError('Write the task first.');
    setError(undefined);
    add.mutate(
      { title: t, done: asDone },
      {
        onSuccess: () => {
          setTitle('');
          toast.show(asDone ? 'Task added as done.' : 'Task planned.', 'success');
        },
        onError: (err) => setError(writeErrorMessage(err)),
      },
    );
  };

  const toggle = (t: Task) =>
    update.mutate(
      { id: t.id, done: t.status !== 'done' },
      { onError: (err) => toast.show(writeErrorMessage(err), 'danger') },
    );

  return (
    <Card>
      <CardHeader
        title="Tasks for today"
        description={
          tasks.length ? `${done} of ${tasks.length} done` : 'Plan your tasks in the morning.'
        }
      />
      <CardBody>
        <form onSubmit={submit(false)} className="flex flex-col gap-2" noValidate>
          <Input
            label="New task"
            value={title}
            maxLength={500}
            disabled={locked}
            error={error}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="For example: prepare the visa file of a client"
          />
          <div className="grid grid-cols-2 gap-2">
            <Button type="submit" disabled={locked} loading={add.isPending && !add.variables?.done}>
              Plan task
            </Button>
            <Button
              variant="outline"
              disabled={locked}
              loading={add.isPending && Boolean(add.variables?.done)}
              onClick={() => submit(true)()}
            >
              Add as done
            </Button>
          </div>
        </form>
      </CardBody>
      {isPending ? (
        <CardBody>
          <SkeletonRows rows={3} />
        </CardBody>
      ) : isError ? (
        <CardBody>
          <Alert tone="danger">
            Your tasks could not be loaded.{' '}
            <button
              type="button"
              className="font-semibold underline"
              onClick={() => void refetch()}
            >
              Try again
            </button>
          </Alert>
        </CardBody>
      ) : tasks.length === 0 ? (
        <p className="border-t border-ink-100 px-5 py-6 text-center text-sm text-ink-500">
          No tasks yet today.
        </p>
      ) : (
        <ul className="divide-y divide-ink-100 border-t border-ink-100" data-testid="tasks">
          <AnimatePresence initial={false}>
            {tasks.map((t) => (
              <motion.li key={t.id} {...listItem} className="flex items-center gap-2 px-3 py-1.5">
                <label className="flex min-h-11 min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-control px-2">
                  <input
                    type="checkbox"
                    checked={t.status === 'done'}
                    disabled={locked}
                    onChange={() => toggle(t)}
                    className="size-5 shrink-0 accent-primary-600"
                  />
                  <span className="min-w-0">
                    <span
                      className={cx(
                        'block text-sm break-words transition-colors',
                        t.status === 'done' ? 'text-ink-500 line-through' : 'text-ink-900',
                      )}
                    >
                      {t.title}
                    </span>
                    {t.completed_at && (
                      <span className="block text-xs text-ink-500">
                        Done at {formatTime(t.completed_at)}
                      </span>
                    )}
                  </span>
                </label>
                <Button variant="ghost" size="sm" disabled={locked} onClick={() => setEditing(t)}>
                  Edit<span className="sr-only"> task {t.title}</span>
                </Button>
                <Button
                  variant="danger-ghost"
                  size="sm"
                  disabled={locked}
                  onClick={() => setDeleting(t)}
                >
                  Delete<span className="sr-only"> task {t.title}</span>
                </Button>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
      <EditTaskModal task={editing} onClose={() => setEditing(null)} />
      <ConfirmDelete
        open={Boolean(deleting)}
        title="Delete this task?"
        text={deleting?.title}
        loading={remove.isPending}
        onClose={() => setDeleting(null)}
        onConfirm={() =>
          deleting &&
          remove.mutate(deleting.id, {
            onSuccess: () => {
              setDeleting(null);
              toast.show('Task deleted.', 'success');
            },
            onError: (err) => toast.show(writeErrorMessage(err), 'danger'),
          })
        }
      />
    </Card>
  );
}

function EditTaskModal({ task, onClose }: { task: Task | null; onClose: () => void }) {
  return (
    <Modal open={Boolean(task)} onClose={onClose} title="Edit task">
      {task && <EditTaskForm key={task.id} task={task} onClose={onClose} />}
    </Modal>
  );
}

function EditTaskForm({ task, onClose }: { task: Task; onClose: () => void }) {
  const { update } = useTaskMutations();
  const toast = useToast();
  const [title, setTitle] = useState(task.title);
  const [error, setError] = useState<string>();
  const save = (e: FormEvent) => {
    e.preventDefault();
    const t = title.trim();
    if (!t) return setError('Write the task first.');
    update.mutate(
      { id: task.id, title: t },
      {
        onSuccess: () => {
          toast.show('Task updated.', 'success');
          onClose();
        },
        onError: (err) => setError(writeErrorMessage(err)),
      },
    );
  };
  return (
    <form onSubmit={save} className="flex flex-col gap-4" noValidate>
      <Input
        label="Task"
        value={title}
        maxLength={500}
        error={error}
        onChange={(e) => setTitle(e.target.value)}
      />
      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" loading={update.isPending}>
          Save
        </Button>
      </div>
    </form>
  );
}

function ConfirmDelete({
  open,
  title,
  text,
  loading,
  onClose,
  onConfirm,
}: {
  open: boolean;
  title: string;
  text?: string;
  loading: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={text ? <span className="break-words">{text}</span> : undefined}
      footer={
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="danger" loading={loading} onClick={onConfirm}>
            Delete
          </Button>
        </div>
      }
    />
  );
}

/* Clients */

export function ClientsCard({ locked }: { locked: boolean }) {
  const { data, isPending, isError, refetch } = useClients();
  const { add, remove } = useClientMutations();
  const toast = useToast();
  const [editing, setEditing] = useState<ClientEntry | null>(null);
  const [deleting, setDeleting] = useState<ClientEntry | null>(null);
  const [formKey, setFormKey] = useState(0);
  const clients = data?.data ?? [];

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader title="Clients" description="Each client you served today, with the service." />
        <CardBody>
          <ClientForm
            key={formKey}
            disabled={locked}
            submitLabel="Add client"
            loading={add.isPending}
            onSubmit={(v, setError) =>
              add.mutate(v, {
                onSuccess: () => {
                  setFormKey((k) => k + 1);
                  toast.show('Client added.', 'success');
                },
                onError: (err) => setError(writeErrorMessage(err)),
              })
            }
          />
        </CardBody>
      </Card>
      <Card>
        <CardHeader
          title="End-of-day client list"
          description={clients.length ? `${clients.length} today` : undefined}
        />
        {isPending ? (
          <CardBody>
            <SkeletonRows rows={3} />
          </CardBody>
        ) : isError ? (
          <CardBody>
            <Alert tone="danger">
              Your clients could not be loaded.{' '}
              <button
                type="button"
                className="font-semibold underline"
                onClick={() => void refetch()}
              >
                Try again
              </button>
            </Alert>
          </CardBody>
        ) : clients.length === 0 ? (
          <p className="px-5 py-6 text-center text-sm text-ink-500">No clients yet today.</p>
        ) : (
          <>
            <ul className="divide-y divide-ink-100" data-testid="clients">
              <AnimatePresence initial={false}>
                {clients.map((c) => (
                  <motion.li
                    key={c.id}
                    {...listItem}
                    className="flex flex-wrap items-center gap-2 px-5 py-2.5"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium break-words text-ink-900">{c.name}</p>
                      <p className="text-xs break-words text-ink-500">
                        {c.service} · quantity {c.quantity}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={locked}
                      onClick={() => setEditing(c)}
                    >
                      Edit<span className="sr-only"> client {c.name}</span>
                    </Button>
                    <Button
                      variant="danger-ghost"
                      size="sm"
                      disabled={locked}
                      onClick={() => setDeleting(c)}
                    >
                      Delete<span className="sr-only"> client {c.name}</span>
                    </Button>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
            <div className="border-t border-ink-100 px-5 py-4">
              <h3 className="mb-1 text-sm font-semibold text-ink-800">Services today</h3>
              <ServicesList services={data?.services ?? []} empty="No services yet." />
            </div>
          </>
        )}
      </Card>
      <EditClientModal client={editing} onClose={() => setEditing(null)} />
      <ConfirmDelete
        open={Boolean(deleting)}
        title="Delete this client?"
        text={deleting ? `${deleting.name} · ${deleting.service}` : undefined}
        loading={remove.isPending}
        onClose={() => setDeleting(null)}
        onConfirm={() =>
          deleting &&
          remove.mutate(deleting.id, {
            onSuccess: () => {
              setDeleting(null);
              toast.show('Client deleted.', 'success');
            },
            onError: (err) => toast.show(writeErrorMessage(err), 'danger'),
          })
        }
      />
    </div>
  );
}

function EditClientModal({ client, onClose }: { client: ClientEntry | null; onClose: () => void }) {
  const { update } = useClientMutations();
  const toast = useToast();
  return (
    <Modal open={Boolean(client)} onClose={onClose} title="Edit client">
      {client && (
        <ClientForm
          initial={client}
          submitLabel="Save"
          loading={update.isPending}
          onCancel={onClose}
          onSubmit={(v, setError) =>
            update.mutate(
              { id: client.id, ...v },
              {
                onSuccess: () => {
                  toast.show('Client updated.', 'success');
                  onClose();
                },
                onError: (err) => setError(writeErrorMessage(err)),
              },
            )
          }
        />
      )}
    </Modal>
  );
}

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export function ClientForm({
  initial,
  disabled,
  submitLabel,
  loading,
  onSubmit,
  onCancel,
}: {
  initial?: ClientInput;
  disabled?: boolean;
  submitLabel: string;
  loading: boolean;
  onSubmit: (v: ClientInput, setError: (m: string) => void) => void;
  onCancel?: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [service, setService] = useState(initial?.service ?? '');
  const [quantity, setQuantity] = useState(String(initial?.quantity ?? 1));
  const [errors, setErrors] = useState<{ name?: string; service?: string; quantity?: string }>({});
  const [formError, setFormError] = useState<string>();
  const [focused, setFocused] = useState(false);
  const q = useDebounced(service.trim(), 250);
  const sugg = useServiceSuggestions(q, focused && !disabled);
  const options = (sugg.data ?? [])
    .filter((s) => s.service.toLowerCase() !== service.trim().toLowerCase())
    .slice(0, 5);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const n = Number(quantity);
    const errs = {
      name: name.trim() ? undefined : 'Enter the client name.',
      service: service.trim() ? undefined : 'Enter the service.',
      quantity: Number.isInteger(n) && n >= 1 ? undefined : 'Enter a whole number, 1 or more.',
    };
    setErrors(errs);
    setFormError(undefined);
    if (errs.name || errs.service || errs.quantity) return;
    onSubmit({ name: name.trim(), service: service.trim(), quantity: n }, setFormError);
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-3" noValidate>
      <Input
        label="Client name"
        value={name}
        maxLength={200}
        disabled={disabled}
        error={errors.name}
        autoComplete="off"
        onChange={(e) => setName(e.target.value)}
      />
      <div>
        <Input
          label="Service"
          value={service}
          maxLength={200}
          disabled={disabled}
          error={errors.service}
          autoComplete="off"
          hint="Type freely or pick a service already used."
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          onChange={(e) => setService(e.target.value)}
        />
        <AnimatePresence>
          {focused && options.length > 0 && (
            <motion.ul
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: duration.fast, ease: easing.standard }}
              aria-label="Suggested services"
              className="mt-2 flex flex-wrap gap-2"
            >
              {options.map((s) => (
                <li key={s.service_key}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => setService(s.service)}
                    className="min-h-11 rounded-control border border-ink-200 bg-surface px-3 text-left text-sm break-words text-ink-800 hover:border-primary-300 hover:bg-primary-50"
                  >
                    {s.service}
                  </button>
                </li>
              ))}
            </motion.ul>
          )}
        </AnimatePresence>
      </div>
      <Input
        label="Quantity"
        type="number"
        inputMode="numeric"
        min={1}
        step={1}
        value={quantity}
        disabled={disabled}
        error={errors.quantity}
        wrapperClassName="max-w-40"
        onChange={(e) => setQuantity(e.target.value)}
      />
      {formError && <Alert tone="danger">{formError}</Alert>}
      <div className={cx('grid gap-2', onCancel ? 'grid-cols-2' : 'grid-cols-1')}>
        {onCancel && (
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={disabled} loading={loading}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
