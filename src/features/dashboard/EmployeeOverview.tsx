import { motion } from 'motion/react';
import { Link } from 'react-router';
import { Alert } from '../../ui/Alert';
import { Button } from '../../ui/Button';
import { Skeleton } from '../../ui/Skeleton';
import { fadeUp } from '../../ui/motion';
import { cx } from '../../ui/cx';
import { Figures, Section } from './parts';
import { periodLabel, ratio, weeklyReportText } from './logic';
import { useMyDashboard } from './useDashboard';

/** Employee home, below today's main action: this week and this month (server figures only). */
export function EmployeeOverview() {
  const q = useMyDashboard();
  if (q.isPending)
    return (
      <motion.div variants={fadeUp} className="flex flex-col gap-4">
        <Skeleton className="h-40 w-full" />
      </motion.div>
    );
  if (q.isError || !q.data)
    return (
      <Alert tone="warning" title="Your week could not be loaded">
        <Button variant="outline" size="sm" className="mt-2" onClick={() => void q.refetch()}>
          Reload my week
        </Button>
      </Alert>
    );
  const { today, week, month } = q.data;
  const wr = weeklyReportText(week.weekly_report);
  return (
    <>
      {today.checked_in && (
        <motion.div variants={fadeUp}>
          <Section title="Today" action={{ to: '/app/work', label: 'My work' }} testId="dash-today">
            <Figures
              cols={2}
              items={[
                { label: 'Tasks done', value: ratio(today.tasks_done, today.tasks_planned) },
                { label: 'Clients served', value: today.clients_count },
              ]}
            />
          </Section>
        </motion.div>
      )}
      <motion.div variants={fadeUp}>
        <Section
          title="This week"
          description={periodLabel(week.week_start, week.week_end)}
          testId="dash-week"
        >
          <Figures
            items={[
              {
                label: 'Days present',
                value: ratio(week.presence_days, week.expected_days_so_far),
                hint: 'Of expected days so far',
              },
              { label: 'Late arrivals', value: week.late_count, attention: week.late_count > 0 },
              { label: 'Tasks done', value: ratio(week.tasks_done, week.tasks_planned) },
              { label: 'Clients served', value: week.clients_count },
            ]}
          />
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-ink-100 px-5 py-3">
            <div className="min-w-0">
              <p className="text-xs text-ink-500">Weekly report</p>
              <p
                className={cx(
                  'text-sm font-semibold',
                  wr.attention ? 'text-secondary-700' : 'text-ink-900',
                )}
                data-testid="weekly-report-status"
              >
                {wr.label}
              </p>
              {wr.hint && <p className="text-xs text-ink-500">{wr.hint}</p>}
            </div>
            {wr.action && (
              <Link
                to="/app/reports/weekly"
                className="inline-flex min-h-11 items-center text-sm font-semibold text-primary-700 hover:underline"
              >
                {wr.action}
              </Link>
            )}
          </div>
        </Section>
      </motion.div>
      <motion.div variants={fadeUp}>
        <Section
          title="This month"
          description={`Report period ${periodLabel(month.period_start, month.period_end)}`}
          testId="dash-month"
        >
          <Figures
            cols={3}
            items={[
              { label: 'Days present', value: month.presence_days },
              { label: 'Late arrivals', value: month.late_count, attention: month.late_count > 0 },
              { label: 'Clients served', value: month.clients_count },
            ]}
          />
        </Section>
      </motion.div>
    </>
  );
}
