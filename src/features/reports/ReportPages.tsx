import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { ApiError } from '../../lib/api';
import { useSearchParams } from 'react-router';
import { AnimatePresence, motion } from 'motion/react';
import { formatTime } from '../../lib/attendance';
import { formatDayEnGb } from '../../lib/format';
import type { DailyReport, SubmissionStatus } from '../../lib/reports';
import {
  countdown,
  dayAndTime,
  formatDateTime,
  formatSize,
  hasGrace,
  pdfFileHint,
  uploadErrorMessage,
  weekLabel,
  windowPhase,
} from '../../lib/reports';
import { Alert } from '../../ui/Alert';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { Card, CardBody, CardHeader } from '../../ui/Card';
import { PageHeader } from '../../ui/PageHeader';
import { SkeletonRows } from '../../ui/Skeleton';
import { Table, TBody, TD, TH, THead, TR } from '../../ui/Table';
import { useToast } from '../../ui/Toast';
import { useServerNow, useServerToday } from './useServerNow';
import { duration, easing, fadeUp, stagger } from '../../ui/motion';
import { DateNav, Figure, ServicesList, VersionRow, WeeklySummaryView, WorkTabs } from './parts';
import {
  useDailyReport,
  useSubmissionStatus,
  useUploadReport,
  useWeeklySummary,
} from './useReports';

function LoadError({ what, retry }: { what: string; retry: () => void }) {
  return (
    <Alert tone="danger">
      {what} could not be loaded.{' '}
      <button type="button" className="font-semibold underline" onClick={retry}>
        Try again
      </button>
    </Alert>
  );
}

/** Date in the URL (?date=) so a report can be shared or reopened. */
export function useDateParam(today: string): [string, (d: string) => void] {
  const [params, setParams] = useSearchParams();
  const raw = params.get('date');
  const value = raw && /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : today;
  const set = (d: string) =>
    setParams(
      (prev) => {
        // Keep other parameters (e.g. ?from=daily for the back link).
        const next = new URLSearchParams(prev);
        if (d === today) next.delete('date');
        else next.set('date', d);
        return next;
      },
      { replace: true, preventScrollReset: true },
    );
  return [value, set];
}

export function DailyReportPage() {
  const today = useServerToday();
  const [date, setDate] = useDateParam(today);
  const q = useDailyReport(date === today ? undefined : date);
  return (
    <div>
      <PageHeader
        title="Daily report"
        description="Built by the server from your tasks and clients."
      />
      <WorkTabs />
      <DateNav label="Day" value={date} today={today} onChange={setDate} />
      {q.isPending ? (
        <SkeletonRows rows={4} />
      ) : q.isError ? (
        <LoadError what="The report" retry={() => void q.refetch()} />
      ) : (
        <DailyReportView report={q.data} />
      )}
    </div>
  );
}

export function DailyReportView({ report }: { report: DailyReport }) {
  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="flex flex-col gap-4">
      <motion.div variants={fadeUp}>
        <Card>
          <CardHeader
            title={formatDayEnGb(report.work_date)}
            description={
              report.generated_at
                ? `Report generated ${formatDateTime(report.generated_at)}. Later changes update it.`
                : 'The report is generated at the end of the day. You can still change it.'
            }
          />
          <CardBody>
            <dl className="grid grid-cols-2 gap-3">
              <Figure label="Tasks done" value={`${report.tasks_done} / ${report.tasks_planned}`} />
              <Figure label="Clients" value={report.clients_count} />
            </dl>
          </CardBody>
        </Card>
      </motion.div>
      <motion.div variants={fadeUp}>
        <Card>
          <CardHeader title="Tasks" />
          {report.tasks.length === 0 ? (
            <p className="px-5 py-6 text-center text-sm text-ink-500">No tasks this day.</p>
          ) : (
            <ul className="divide-y divide-ink-100" data-testid="report-tasks">
              {report.tasks.map((t) => (
                <li key={t.id} className="flex items-start justify-between gap-3 px-5 py-2.5">
                  <span className="min-w-0 text-sm wrap-anywhere text-ink-900">{t.title}</span>
                  {t.status === 'done' ? (
                    <Badge tone="success">
                      Done{t.completed_at ? ` ${formatTime(t.completed_at)}` : ''}
                    </Badge>
                  ) : (
                    <Badge tone="neutral">Not done</Badge>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </motion.div>
      <motion.div variants={fadeUp}>
        <Card>
          <CardHeader title="Clients" />
          {report.clients.length === 0 ? (
            <p className="px-5 py-6 text-center text-sm text-ink-500">No clients this day.</p>
          ) : (
            <Table data-testid="report-clients">
              <THead>
                <tr>
                  <TH>Client</TH>
                  <TH>Service</TH>
                  <TH className="text-right">Qty</TH>
                </tr>
              </THead>
              <TBody>
                {report.clients.map((c) => (
                  <TR key={c.id}>
                    <TD className="wrap-anywhere">{c.name}</TD>
                    <TD className="wrap-anywhere">{c.service}</TD>
                    <TD className="text-right tabular-nums">{c.quantity}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
          <CardBody className="border-t border-ink-100">
            <h3 className="mb-1 text-sm font-semibold text-ink-800">Services</h3>
            <ServicesList services={report.services} empty="No services this day." />
          </CardBody>
        </Card>
      </motion.div>
    </motion.div>
  );
}

export function WeeklyReportPage() {
  const today = useServerToday();
  const [date, setDate] = useDateParam(today);
  const q = useWeeklySummary(date === today ? undefined : date);
  return (
    <div>
      <PageHeader title="Weekly report" description="Monday to Friday, and your PDF report." />
      <WorkTabs />
      <SubmissionCard />
      <div className="mt-6">
        <DateNav
          label="Week of"
          value={date}
          today={today}
          step={7}
          unit="week"
          onChange={setDate}
        />
        {q.isPending ? (
          <SkeletonRows rows={5} />
        ) : q.isError ? (
          <LoadError what="The weekly summary" retry={() => void q.refetch()} />
        ) : (
          <WeeklySummaryView week={q.data} />
        )}
      </div>
    </div>
  );
}

/** What the employee should do now about the weekly PDF (all times from the API). */
export function submissionState(s: SubmissionStatus, now: Date) {
  const phase = windowPhase(s, now);
  if (!s.expected && !s.current)
    return {
      tone: 'info' as const,
      title: 'No report expected',
      text: 'No weekly report is expected from you for this week.',
    };
  if (s.current)
    return {
      tone: 'success' as const,
      title: 'Report sent',
      text: `Version ${s.current.version} received ${formatDateTime(s.current.submitted_at)}.${s.current.is_late ? ' It was marked late.' : ''} You can replace it with a new version.`,
    };
  if (phase === 'before')
    return s.can_submit
      ? {
          tone: 'warning' as const,
          title: 'Last week’s report is missing',
          text: 'You can still send it now. It will be marked late.',
        }
      : {
          tone: 'info' as const,
          title: 'Not open yet',
          text: `The upload opens on ${dayAndTime(s.opens_at)}. Opens in ${countdown(s.opens_at, now)}.`,
        };
  if (phase === 'open')
    return {
      tone: 'warning' as const,
      title: 'Your weekly report is due',
      text: `Send your PDF before ${formatTime(s.closes_at)}. Closes in ${countdown(s.closes_at, now)}.`,
    };
  if (hasGrace(s) && now.getTime() < Date.parse(s.deadline))
    return {
      tone: 'warning' as const,
      title: 'Extra time because you were absent',
      text: `You can send it until ${dayAndTime(s.deadline)} without being late.`,
    };
  return {
    tone: 'danger' as const,
    title: 'Deadline passed',
    text: 'Your report has not been received. Send it now: it will be marked late.',
  };
}

export function SubmissionCard() {
  const q = useSubmissionStatus();
  const upload = useUploadReport();
  const toast = useToast();
  const now = useServerNow();
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState<{
    tone: 'danger' | 'warning' | 'info';
    text: string;
  } | null>(null);
  /** Offline when sending: resent automatically once the connection is back. */
  const [waitingOnline, setWaitingOnline] = useState(false);
  const sendBtn = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!waitingOnline) return;
    const onOnline = () => {
      setWaitingOnline(false);
      setMessage({ tone: 'info', text: 'You are back online. Sending your report…' });
      // Send the same file again (the button stays enabled while waiting).
      setTimeout(() => sendBtn.current?.click(), 0);
    };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [waitingOnline]);

  if (q.isPending) return <SkeletonRows rows={3} />;
  if (q.isError) return <LoadError what="Your weekly PDF status" retry={() => void q.refetch()} />;
  const s = q.data;
  const state = submissionState(s, now);
  const canUpload = s.can_submit;

  const pick = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    e.target.value = '';
    upload.reset();
    if (!f) return;
    const hint = pdfFileHint(f, s.max_size_mb);
    if (hint.block) {
      setFile(null);
      setMessage({ tone: 'danger', text: hint.block });
      return;
    }
    setFile(f);
    setMessage(hint.warn ? { tone: 'warning', text: hint.warn } : null);
  };

  const send = () => {
    if (!file) return;
    const offlineNow = typeof navigator !== 'undefined' && navigator.onLine === false;
    if (offlineNow) {
      setWaitingOnline(true);
      setMessage({
        tone: 'warning',
        text: 'You are offline. Your report was not sent yet. It will be sent automatically when you are back online.',
      });
      return;
    }
    upload.mutate(file, {
      onSuccess: (r) => {
        setFile(null);
        setWaitingOnline(false);
        setMessage(null);
        toast.show(
          r.data.is_late
            ? `Report received (version ${r.data.version}). It was marked late.`
            : `Report received (version ${r.data.version}).`,
          'success',
        );
      },
      onError: (err) => {
        if (err instanceof ApiError && err.kind === 'network') {
          if (typeof navigator !== 'undefined' && navigator.onLine === false) {
            setWaitingOnline(true);
            setMessage({
              tone: 'warning',
              text: 'You are offline. Your report was not sent yet. It will be sent automatically when you are back online.',
            });
          } else {
            setMessage({
              tone: 'danger',
              text: 'The connection was lost and your report may not have been sent. Check the versions below, then send it again if needed.',
            });
            void q.refetch();
          }
          return;
        }
        setMessage({ tone: 'danger', text: uploadErrorMessage(err, s.max_size_mb) });
      },
    });
  };

  return (
    <Card data-testid="submission">
      <CardHeader
        title="Weekly PDF report"
        description={`Week ${weekLabel(s.week_start, s.window_date)} · PDF only, up to ${s.max_size_mb} MB`}
      />
      <CardBody className="flex flex-col gap-4">
        <Alert tone={state.tone} title={state.title}>
          {state.text}
        </Alert>
        {canUpload && s.is_late_now && !s.current && windowPhase(s, now) === 'open' && (
          <p className="text-sm text-ink-600">If you send it now, it will be marked late.</p>
        )}
        {canUpload && (
          <div className="flex flex-col gap-3">
            <input
              ref={input}
              type="file"
              accept="application/pdf,.pdf"
              className="sr-only"
              tabIndex={-1}
              aria-hidden
              onChange={pick}
              data-testid="pdf-input"
            />
            <AnimatePresence initial={false}>
              {file && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: duration.base, ease: easing.standard }}
                  className="overflow-hidden"
                >
                  <div className="rounded-control border border-ink-100 bg-surface-muted px-4 py-3 text-sm">
                    <p className="font-medium wrap-anywhere text-ink-900">{file.name}</p>
                    <p className="text-ink-500">{formatSize(file.size)}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            {message && <Alert tone={message.tone}>{message.text}</Alert>}
            <div className="grid gap-2 sm:flex">
              <Button
                variant={file || s.current ? 'outline' : 'primary'}
                onClick={() => input.current?.click()}
                disabled={upload.isPending}
              >
                {file ? 'Choose another file' : s.current ? 'Replace the PDF' : 'Choose the PDF'}
              </Button>
              {file && (
                <Button ref={sendBtn} onClick={send} loading={upload.isPending}>
                  {waitingOnline
                    ? 'Waiting for connection'
                    : s.current
                      ? 'Send new version'
                      : 'Send report'}
                </Button>
              )}
            </div>
          </div>
        )}
        {s.versions.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-ink-800">Versions sent</h3>
            <ul className="divide-y divide-ink-100" data-testid="versions">
              {s.versions.map((v) => (
                <VersionRow key={v.id} v={v} />
              ))}
            </ul>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
