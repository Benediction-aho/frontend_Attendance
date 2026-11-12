import { motion } from 'motion/react';
import { Link } from 'react-router';
import { PageHeader } from '../../ui/PageHeader';
import { fadeUp, stagger } from '../../ui/motion';
import { navFor } from '../../app/AppLayout';
import { useMe } from '../auth/useSession';

const DESCRIPTIONS: Record<string, string> = {
  '/app/admin/requests': 'Approve or reject people asking for an account.',
  '/app/admin/users': 'Search accounts, block, unlock, send new codes and manage access.',
  '/app/admin/settings': 'Office location, working hours, reports and security rules.',
  '/app/admin/logs': 'Everything that happens on each account, read-only.',
  '/app/admin/attendance':
    "Today's check-ins, history per employee, missions and refused attempts.",
  '/app/admin/faceid-devices': 'Approve or reject new phones registered for Face ID.',
  '/app/admin/leave': 'Declare leave for employees and manage public holidays.',
};

/** Phone entry point to the administration sections. */
export function AdminHubPage() {
  const { data: me } = useMe();
  const { admin } = navFor(me);
  return (
    <>
      <PageHeader title="Administration" />
      <motion.ul
        variants={stagger}
        initial="hidden"
        animate="show"
        className="grid gap-3 sm:grid-cols-2"
      >
        {admin.map((i) => (
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
    </>
  );
}
