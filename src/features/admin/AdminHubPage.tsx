import { motion } from 'motion/react';
import { Link } from 'react-router';
import { PageHeader } from '../../ui/PageHeader';
import { fadeUp, stagger } from '../../ui/motion';
import { navFor } from '../../app/AppLayout';
import { tracksAttendance } from '../../lib/permissions';
import { useMe } from '../auth/useSession';
import { DashboardPage } from '../dashboard/DashboardPage';

const DESCRIPTIONS: Record<string, string> = {
  '/app/admin/requests': 'Approve or reject people asking for an account.',
  '/app/admin/users': 'Search accounts, block, unlock, send new codes and manage access.',
  '/app/admin/settings': 'Attendance, report and security rules you are allowed to manage.',
  '/app/admin/logs': 'Everything that happens on each account, read-only.',
  '/app/admin/attendance':
    "Today's check-ins, history per employee, missions and refused attempts.",
  '/app/admin/faceid-devices': 'Approve or reject new phones registered for Face ID.',
  '/app/admin/reports':
    'Daily work, weekly PDF reports, activity reports and who has not sent theirs.',
  '/app/admin/leave': 'Declare leave for employees and manage public holidays.',
};

function SectionCards() {
  const { data: me } = useMe();
  const { sections } = navFor(me);
  return (
    <motion.ul
      variants={stagger}
      initial="hidden"
      animate="show"
      className="grid gap-3 sm:grid-cols-2"
      data-testid="admin-sections"
    >
      {sections.map((i) => (
        <motion.li key={i.to} variants={fadeUp}>
          <Link
            to={i.to}
            className="flex min-h-11 flex-col rounded-card bg-surface p-5 shadow-card transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-raised"
          >
            <span className="font-semibold text-primary-700">{i.label}</span>
            <span className="mt-1 text-sm text-ink-500">{DESCRIPTIONS[i.to]}</span>
          </Link>
        </motion.li>
      ))}
    </motion.ul>
  );
}

/**
 * Entry point of the administration area. Staff who do not check in keep their dashboard
 * on Home and find the list of sections here. An admin who checks in lands on Today, so
 * the team dashboard ("Waiting for you", team figures) opens this page, followed by the
 * sections on phones and tablets (the desktop sidebar already lists them).
 */
export function AdminHubPage() {
  const { data: me } = useMe();
  if (tracksAttendance(me))
    return (
      <>
        <DashboardPage heading="Administration" />
        <section aria-labelledby="admin-sections-title" className="mt-8 lg:hidden">
          <h2 id="admin-sections-title" className="mb-3 text-base font-semibold text-ink-900">
            Sections
          </h2>
          <SectionCards />
        </section>
      </>
    );
  return (
    <>
      <PageHeader title="Administration" />
      <SectionCards />
    </>
  );
}
