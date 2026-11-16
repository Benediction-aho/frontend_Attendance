import { useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Link } from 'react-router';
import { AnimatePresence, motion } from 'motion/react';
import { formatTime } from '../../lib/attendance';
import type { ActivityFormErrors, ActivityLimits, ActivityReport } from '../../lib/reports';
import {
  ACTIVITY_NOTE_MAX,
  ACTIVITY_TITLE_MAX,
  activityDeleteError,
  activityUploadErrors,
  formatDateTime,
  formatSize,
  pdfFileHint,
} from '../../lib/reports';
import { Alert } from '../../ui/Alert';
import { Button } from '../../ui/Button';
import { Card, CardBody, CardHeader } from '../../ui/Card';
import { Input, Textarea } from '../../ui/Field';
import { Modal } from '../../ui/Modal';
import { PageHeader } from '../../ui/PageHeader';
import { Pagination } from '../../ui/Pagination';
import { SkeletonRows } from '../../ui/Skeleton';
import { useToast } from '../../ui/Toast';
import { duration, easing, fadeUp, stagger } from '../../ui/motion';
import { useToday } from '../attendance/useAttendance';
import { WorkTabs } from './parts';
import { useServerNow } from './useServerNow';
import { useDeleteActivityReport, useMyActivityReports, useSendActivityReport } from './useReports';

/** "2 of 5 sent today · 3 left" – every number comes from the server. */
export function quotaLine(l: ActivityLimits): string {
  if (l.remaining_today <= 0)
    return `You have sent today's ${l.per_day} activity reports. You can send more tomorrow.`;
  return `${l.sent_today} of ${l.per_day} sent today · ${l.remaining_today} left`;
}

/**
 * Display hint only: on a day the person is expected, the server refuses the upload before
 * the check-in (403 checkin_required). Days off, leave and holidays are never locked.
 */
function useLockedByCheckIn(): boolean {
  const today = useToday();
  const t = today.data;
  return t ? t.expected && !t.checked_in : false;
}

function ActivityReportForm({
  limits,
  locked,
  onDone,
  onBusy,
}: {
  limits: ActivityLimits | undefined;
  locked: boolean;
  onDone: () => void;
  onBusy: (busy: boolean) => void;
}) {
  const send = useSendActivityReport();
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [fileWarn, setFileWarn] = useState<string>();
  const [errors, setErrors] = useState<ActivityFormErrors>({});
  const [progress, setProgress] = useState(0);
  const maxMb = limits?.max_size_mb ?? 0;
  const full = limits ? limits.remaining_today <= 0 : false;

  const pick = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    e.target.value = '';
    if (!f) return;
    const hint = pdfFileHint(f, maxMb);
    if (hint.block) {
      setFile(null);
      setFileWarn(undefined);
      setErrors((x) => ({ ...x, file: hint.block }));
      return;
    }
    setFile(f);
    setFileWarn(hint.warn);
    setErrors((x) => ({ ...x, file: undefined, form: undefined }));
  };

  const sending = useRef(false);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const t = title.trim();
    const errs: ActivityFormErrors = {
      title: t ? undefined : 'Give the report a title.',
      file: file ? undefined : 'Choose the PDF to send.',
    };
    setErrors(errs);
    if (errs.title || errs.file || !file) return;
    // A double tap must not send the file twice (the button re-renders as busy a frame later).
    if (sending.current) return;
    sending.current = true;
    setProgress(0);
    onBusy(true);
    send.mutate(
      { title: t, note: note.trim(), file, onProgress: setProgress },
      {
        onSuccess: () => {
          toast.show('Activity report sent.', 'success');
          onDone();
        },
        onError: (err) => setErrors(activityUploadErrors(err, maxMb)),
        onSettled: () => {
          sending.current = false;
          onBusy(false);
        },
      },
    );
  };

  const percent = Math.round(progress * 100);
  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate data-testid="activity-form">
      {locked && (
        <Alert tone="info" title="Check in first">
          Sending a report needs today's check-in.{' '}
          <Link to="/app" className="font-semibold underline">
            Go to check-in
          </Link>
        </Alert>
      )}
      {full && limits && <Alert tone="warning">{quotaLine(limits)}</Alert>}
      <Input
        label="Title"
        value={title}
        maxLength={ACTIVITY_TITLE_MAX}
        error={errors.title}
        autoComplete="off"
        placeholder="e.g. Visit to the immigration office"
        hint={`What the report is about. Up to ${ACTIVITY_TITLE_MAX} characters, no link or email address.`}
        onChange={(e) => {
          setTitle(e.target.value);
          setErrors((x) => ({ ...x, title: undefined }));
        }}
      />
      <Textarea
        label="Note"
        optional
        rows={3}
        value={note}
        maxLength={ACTIVITY_NOTE_MAX}
        error={errors.note}
        hint={`${note.length} of ${ACTIVITY_NOTE_MAX} characters`}
        onChange={(e) => {
          setNote(e.target.value);
          setErrors((x) => ({ ...x, note: undefined }));
        }}
      />
      <div className="flex flex-col gap-1.5">
        <p className="text-sm font-medium text-ink-700" id="activity-file-label">
          PDF file
        </p>
        <input
          ref={input}
          type="file"
          accept="application/pdf,.pdf"
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={pick}
          data-testid="activity-pdf-input"
        />
        {/* One bordered row: file (or prompt), Change, and a reserved progress slot (UI-4). */}
        <div className="rounded-control border border-ink-200 bg-surface-muted px-4 py-2.5">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 text-sm">
              {file ? (
                <>
                  <p className="font-medium wrap-anywhere text-ink-900">{file.name}</p>
                  <p className="text-ink-500">{formatSize(file.size)}</p>
                </>
              ) : (
                <p className="text-ink-500">No file chosen</p>
              )}
            </div>
            <Button
              variant={file ? 'ghost' : 'outline'}
              size="sm"
              className="shrink-0"
              aria-describedby="activity-file-hint"
              disabled={send.isPending}
              onClick={() => input.current?.click()}
            >
              {file ? 'Change' : 'Choose the PDF'}
            </Button>
          </div>
          <div className="mt-2 min-h-8" aria-live="polite">
            {send.isPending ? (
              <div data-testid="upload-progress">
                <div className="flex items-center justify-between text-xs text-ink-700">
                  <span>{percent >= 100 ? 'Checking the PDF…' : 'Sending your report…'}</span>
                  <span className="tabular-nums">{percent} %</span>
                </div>
                <div
                  className="mt-1 h-1.5 overflow-hidden rounded-full bg-ink-100"
                  role="progressbar"
                  aria-label="Upload progress"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={percent}
                >
                  <motion.div
                    className="h-full rounded-full bg-primary-600"
                    initial={false}
                    animate={{ width: `${Math.max(4, percent)}%` }}
                    transition={{ duration: duration.fast, ease: easing.standard }}
                  />
                </div>
              </div>
            ) : (
              <p id="activity-file-hint" className="text-xs text-ink-500">
                One PDF{maxMb > 0 ? `, up to ${maxMb} MB` : ''}. No password, no embedded files.
              </p>
            )}
          </div>
        </div>
        {fileWarn && !errors.file && <p className="text-sm text-secondary-800">{fileWarn}</p>}
        {errors.file && (
          <p role="alert" className="text-sm text-danger-700" data-testid="activity-file-error">
            {errors.file}
          </p>
        )}
      </div>
      {errors.form && <Alert tone="danger">{errors.form}</Alert>}
      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" disabled={send.isPending} onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" loading={send.isPending} disabled={locked || full}>
          Send activity report
        </Button>
      </div>
    </form>
  );
}

/** "Upload an activity report" button with its form in a sheet (phones) or a dialog. */
export function UploadReportButton({
  variant = 'primary',
  limits,
}: {
  variant?: 'primary' | 'outline';
  limits: ActivityLimits | undefined;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const locked = useLockedByCheckIn();
  const full = limits ? limits.remaining_today <= 0 : false;
  return (
    <>
      {/* At the daily limit the button is unavailable (UXC-08); the quota line says why. */}
      <Button
        variant={full ? 'outline' : variant}
        disabled={full}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      >
        Upload an activity report
      </Button>
      <Modal
        open={open}
        // The sheet stays open while the file is on its way.
        onClose={() => !busy && setOpen(false)}
        title="Upload an activity report"
        description="A report of an activity or of something you did, sent right away to the administration. It does not replace your Friday weekly report."
      >
        {open && (
          <ActivityReportForm
            limits={limits}
            locked={locked}
            onBusy={setBusy}
            onDone={() => setOpen(false)}
          />
        )}
      </Modal>
    </>
  );
}

/**
 * Shown on the Daily report and Weekly report tabs: explains what an activity report is
 * (never the Friday weekly report) and opens the upload form.
 */
export function ActivityReportCallout({ variant }: { variant?: 'primary' | 'outline' }) {
  const q = useMyActivityReports(1);
  const limits = q.data?.limits;
  return (
    <Card data-testid="activity-callout">
      <CardBody className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-ink-900">Activity report</h2>
          <p className="mt-0.5 text-sm text-ink-600">
            Something to report now? Send a PDF about an activity at any time. This is not the
            Friday weekly report.
          </p>
          <p className="mt-1 text-sm text-ink-600">
            {limits
              ? limits.remaining_today <= 0
                ? `${quotaLine(limits)} `
                : `${limits.sent_today} sent today. `
              : ''}
            <Link
              to="/app/reports/activity"
              className="inline-flex min-h-11 items-center text-ink-700 underline underline-offset-2 hover:text-primary-700"
            >
              See sent reports
            </Link>
          </p>
        </div>
        <div className="shrink-0 [&>button]:w-full sm:[&>button]:w-auto">
          <UploadReportButton variant={variant} limits={limits} />
        </div>
      </CardBody>
    </Card>
  );
}

function ReportRow({
  r,
  now,
  onDelete,
}: {
  r: ActivityReport;
  now: Date;
  onDelete: (r: ActivityReport) => void;
}) {
  // The server says whether it can still be deleted; its own deadline hides the button in between.
  const deletable =
    r.can_delete === true && (!r.delete_until || now.getTime() < Date.parse(r.delete_until));
  return (
    <motion.li
      layout="position"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: duration.base, ease: easing.standard }}
      className="px-5 py-3.5"
    >
      <p className="font-medium wrap-anywhere text-ink-900">{r.title}</p>
      {r.note && (
        <p className="mt-0.5 text-sm wrap-anywhere whitespace-pre-line text-ink-600">{r.note}</p>
      )}
      <p className="mt-1 text-xs wrap-anywhere text-ink-500">
        {formatDateTime(r.submitted_at)} · {r.file_name} · {formatSize(r.size_bytes)}
      </p>
      <div className="mt-1 -ml-3 flex flex-wrap items-center gap-x-1">
        {r.file_url ? (
          <a
            href={r.file_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center rounded-control px-3 text-sm font-medium text-primary-700 hover:bg-primary-50"
          >
            Open PDF<span className="sr-only">, {r.title}</span>
          </a>
        ) : (
          <span className="px-3 text-xs text-ink-500">Link not available</span>
        )}
        {deletable && (
          <>
            <Button variant="quiet-danger" size="sm" onClick={() => onDelete(r)}>
              Delete<span className="sr-only"> report {r.title}</span>
            </Button>
            {r.delete_until && (
              <span className="text-xs text-ink-500" data-testid="delete-until">
                Can be deleted until {formatTime(r.delete_until)}
              </span>
            )}
          </>
        )}
      </div>
    </motion.li>
  );
}

/** My work › Activity reports: send one at any time and see the ones already sent. */
export function ActivityReportsPage() {
  const [page, setPage] = useState(1);
  const q = useMyActivityReports(page);
  const remove = useDeleteActivityReport();
  const toast = useToast();
  const now = useServerNow(15_000);
  const [deleting, setDeleting] = useState<ActivityReport | null>(null);
  const limits = q.data?.limits;
  const rows = q.data?.data ?? [];

  const confirmDelete = () => {
    if (!deleting) return;
    remove.mutate(deleting.id, {
      onSuccess: () => {
        setDeleting(null);
        toast.show('Activity report deleted.', 'success');
      },
      onError: (err) => {
        setDeleting(null);
        toast.show(activityDeleteError(err), 'danger');
      },
    });
  };

  return (
    <motion.div variants={stagger} initial="hidden" animate="show">
      <PageHeader
        title="Activity reports"
        description="A report of an activity or of something you did, sent at any time. Not the Friday weekly report."
      />
      <WorkTabs />
      <div className="flex max-w-3xl flex-col gap-4">
        <motion.div variants={fadeUp}>
          <Card>
            <CardBody className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-ink-900">Send a report now</h2>
                <p className="mt-0.5 text-sm text-ink-600" data-testid="activity-quota">
                  {limits
                    ? `${quotaLine(limits)}${
                        limits.max_size_mb > 0 ? ` · PDF up to ${limits.max_size_mb} MB` : ''
                      }`
                    : 'A title, an optional note and one PDF.'}
                </p>
              </div>
              <div className="shrink-0 [&>button]:w-full sm:[&>button]:w-auto">
                <UploadReportButton limits={limits} />
              </div>
            </CardBody>
          </Card>
        </motion.div>
        <motion.div variants={fadeUp}>
          <Card>
            <CardHeader
              title="Activity reports sent"
              description={
                limits && limits.delete_minutes > 0
                  ? `Newest first. You can delete a report during ${limits.delete_minutes} minutes after sending it.`
                  : 'Newest first.'
              }
            />
            {q.isPending ? (
              <CardBody>
                <SkeletonRows rows={3} />
              </CardBody>
            ) : q.isError ? (
              <CardBody>
                <Alert tone="danger">
                  Your activity reports could not be loaded.{' '}
                  <button
                    type="button"
                    className="font-semibold underline"
                    onClick={() => void q.refetch()}
                  >
                    Try again
                  </button>
                </Alert>
              </CardBody>
            ) : rows.length === 0 ? (
              <p className="px-5 py-6 text-center text-sm text-ink-500">
                No activity report sent yet.
              </p>
            ) : (
              <>
                <ul className="divide-y divide-ink-100" data-testid="activity-reports">
                  <AnimatePresence initial={false}>
                    {rows.map((r) => (
                      <ReportRow key={r.id} r={r} now={now} onDelete={setDeleting} />
                    ))}
                  </AnimatePresence>
                </ul>
                <Pagination
                  page={q.data.meta.current_page}
                  lastPage={q.data.meta.last_page}
                  total={q.data.meta.total}
                  onPage={setPage}
                />
              </>
            )}
          </Card>
        </motion.div>
      </div>
      <Modal
        open={Boolean(deleting)}
        onClose={() => !remove.isPending && setDeleting(null)}
        title="Delete this activity report?"
        description={
          deleting && (
            <>
              <span className="block font-medium wrap-anywhere text-ink-800">{deleting.title}</span>
              The administration will no longer see it. It still counts in today's limit.
              {deleting.delete_until
                ? ` You can delete it until ${formatTime(deleting.delete_until)}.`
                : ''}
            </>
          )
        }
        footer={
          <div className="grid w-full grid-cols-2 gap-2 sm:w-auto">
            <Button variant="outline" onClick={() => setDeleting(null)}>
              Cancel
            </Button>
            <Button variant="danger" loading={remove.isPending} onClick={confirmDelete}>
              Delete
            </Button>
          </div>
        }
      />
    </motion.div>
  );
}
