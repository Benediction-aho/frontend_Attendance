import { NavLink } from 'react-router';
import { motion } from 'motion/react';
import { cx } from '../../ui/cx';
import { duration, easing } from '../../ui/motion';
import { formatDayEnGb } from '../../lib/format';
import type {
  ServiceTotal,
  WeeklyClient,
  WeeklySubmission,
  WeeklySummary,
} from '../../lib/reports';
import { formatDateTime, formatSize, weekLabel } from '../../lib/reports';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { Card, CardBody, CardHeader } from '../../ui/Card';
import { Input } from '../../ui/Field';
import { Table, TBody, TD, TH, THead, TR } from '../../ui/Table';
import { fadeUp, stagger } from '../../ui/motion';

/** Date field with one row of Previous / Today / Next (step in days). */
export function DateNav({
  label,
  value,
  today,
  step = 1,
  onChange,
  unit = 'day',
}: {
  label: string;
  value: string;
  today: string;
  step?: number;
  unit?: 'day' | 'week';
  onChange: (d: string) => void;
}) {
  const shift = (n: number) => {
    const d = new Date(`${value}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + n);
    const out = d.toISOString().slice(0, 10);
    onChange(out > today ? today : out);
  };
  return (
    <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end">
      <Input
        label={label}
        type="date"
        value={value}
        max={today}
        wrapperClassName="sm:w-44"
        onChange={(e) => e.target.value && onChange(e.target.value)}
      />
      <div
        className="grid grid-cols-3 gap-2 sm:flex"
        role="group"
        aria-label={`${label} navigation`}
      >
        <Button
          variant="ghost"
          size="sm"
          aria-label={`Previous ${unit}`}
          onClick={() => shift(-step)}
        >
          Previous
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={value === today}
          onClick={() => onChange(today)}
        >
          {unit === 'week' ? 'This week' : 'Today'}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          aria-label={`Next ${unit}`}
          disabled={value >= today}
          onClick={() => shift(step)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}

/** Figure with a caption, used in report summaries. */
export function Figure({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-control bg-surface-muted px-4 py-3">
      <dt className="text-xs text-ink-500">{label}</dt>
      <dd className="mt-0.5 text-2xl font-semibold text-primary-700 tabular-nums">{value}</dd>
    </div>
  );
}

export function ServicesList({ services, empty }: { services: ServiceTotal[]; empty: string }) {
  if (services.length === 0) return <p className="text-sm text-ink-500">{empty}</p>;
  return (
    <ul className="divide-y divide-ink-100" data-testid="services">
      {services.map((s) => (
        <li key={s.service_key} className="flex items-center justify-between gap-3 py-2 text-sm">
          <span className="min-w-0 wrap-anywhere text-ink-800">{s.service}</span>
          <span className="shrink-0 font-semibold text-ink-900 tabular-nums">{s.quantity}</span>
        </li>
      ))}
    </ul>
  );
}

/** Clients recap of a week (names only when the API returned them). */
export function WeeklyClientsList({ clients }: { clients: WeeklyClient[] }) {
  if (clients.length === 0) return <p className="text-sm text-ink-500">No clients this week.</p>;
  return (
    <ul className="divide-y divide-ink-100" data-testid="weekly-clients">
      {clients.map((c, i) => (
        <li key={`${c.work_date}-${i}`} className="flex items-start justify-between gap-3 py-2.5">
          <div className="min-w-0">
            <p className="wrap-anywhere text-sm font-medium text-ink-900">{c.name}</p>
            <p className="wrap-anywhere text-xs text-ink-500">
              {c.service} · {formatDayEnGb(c.work_date)}
            </p>
          </div>
          <span className="shrink-0 text-sm font-semibold text-ink-900 tabular-nums">
            {c.quantity}
          </span>
        </li>
      ))}
    </ul>
  );
}

const weekdayFmt = new Intl.DateTimeFormat('en-GB', { weekday: 'short', timeZone: 'UTC' });
const weekday = (iso: string) => weekdayFmt.format(new Date(`${iso}T00:00:00Z`));
const dayMonthFmt = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
});
/** "9 Nov" – the week range above already gives the year. */
const dayMonth = (iso: string) => dayMonthFmt.format(new Date(`${iso}T00:00:00Z`));

/** Monday → Friday summary with totals, services and (when returned) the clients recap. */
export function WeeklySummaryView({ week }: { week: WeeklySummary }) {
  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="flex flex-col gap-4">
      <motion.div variants={fadeUp}>
        <Card>
          <CardHeader title="Week" description={weekLabel(week.week_start, week.week_end)} />
          <CardBody>
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Figure label="Clients" value={week.clients_count} />
              <Figure label="Tasks done" value={`${week.tasks_done} / ${week.tasks_planned}`} />
            </dl>
          </CardBody>
          <Table data-testid="week-days">
            <THead>
              <tr>
                <TH>Day</TH>
                <TH className="text-right">Tasks done</TH>
                <TH className="text-right">Clients</TH>
              </tr>
            </THead>
            <TBody>
              {week.days.map((d) => (
                <TR key={d.work_date}>
                  <TD>
                    <span className="font-medium text-ink-900">{weekday(d.work_date)}</span>{' '}
                    <span className="text-ink-500">{dayMonth(d.work_date)}</span>
                  </TD>
                  <TD className="text-right tabular-nums">
                    {d.tasks_done} / {d.tasks_planned}
                  </TD>
                  <TD className="text-right tabular-nums">{d.clients_count}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </Card>
      </motion.div>
      <motion.div variants={fadeUp}>
        <Card>
          <CardHeader title="Services of the week" />
          <CardBody>
            <ServicesList services={week.services} empty="No services this week." />
          </CardBody>
        </Card>
      </motion.div>
      {week.clients && (
        <motion.div variants={fadeUp}>
          <Card>
            <CardHeader title="Clients of the week" description="Name, service and quantity." />
            <CardBody>
              <WeeklyClientsList clients={week.clients} />
            </CardBody>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
}

/** One weekly PDF version with its temporary download link. */
export function VersionRow({ v }: { v: WeeklySubmission }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 py-3">
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-ink-900">
          Version {v.version}
          {v.is_current && <Badge tone="primary">Current</Badge>}
          {v.is_late && <Badge tone="warning">Late</Badge>}
        </p>
        <p className="text-xs text-ink-500">
          {formatDateTime(v.submitted_at)} · {formatSize(v.size_bytes)}
        </p>
      </div>
      {v.file_url ? (
        <a
          href={v.file_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center rounded-control px-3 text-sm font-medium text-primary-700 hover:bg-primary-50"
        >
          Open PDF<span className="sr-only">, version {v.version}</span>
        </a>
      ) : (
        <span className="px-3 text-xs text-ink-500">Link not available</span>
      )}
    </li>
  );
}

/** Sub-navigation of the employee "My work" area. */
export function WorkTabs() {
  const tabs = [
    { to: '/app/work', label: 'Today' },
    { to: '/app/reports/daily', label: 'Daily report' },
    { to: '/app/reports/weekly', label: 'Weekly report' },
  ];
  return <TabLinks label="My work sections" tabs={tabs} />;
}

export function TabLinks({
  label,
  tabs,
}: {
  label: string;
  tabs: { to: string; label: string }[];
}) {
  return (
    <nav aria-label={label} className="-mx-1 mb-5 flex gap-1 overflow-x-auto px-1">
      {tabs.map((t) => (
        <NavLink
          key={t.to}
          to={t.to}
          end
          className={({ isActive }) =>
            cx(
              'relative inline-flex min-h-11 shrink-0 items-center rounded-control px-3.5 text-sm font-medium transition-colors',
              isActive ? 'text-primary-700' : 'text-ink-600 hover:bg-ink-50',
            )
          }
        >
          {({ isActive }) => (
            <>
              {isActive && (
                <motion.span
                  layoutId={`tab-${label}`}
                  className="absolute inset-0 rounded-control bg-primary-50"
                  transition={{ duration: duration.base, ease: easing.standard }}
                />
              )}
              <span className="relative">{t.label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
