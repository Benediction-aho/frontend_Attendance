import {
  Bell,
  CalendarDays,
  Clock3,
  ScanFace,
  CalendarClock,
  ClipboardList,
  FileText,
  ListChecks,
  LayoutDashboard,
  LogOut,
  Menu,
  ScrollText,
  Settings2,
  ShieldCheck,
  UserRound,
  UsersRound,
  type LucideIcon,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { onCheckInRequired } from '../lib/api';
import { useToast } from '../ui/Toast';
import { Link, NavLink, useLocation, useNavigate, useOutlet } from 'react-router';
import { Modal } from '../ui/Modal';
import { Logo } from '../ui/Logo';
import { Avatar } from '../ui/Avatar';
import { cx } from '../ui/cx';
import { duration, easing } from '../ui/motion';
import { signOut, useMe } from '../features/auth/useSession';
import { useUnreadCount } from '../features/notifications/useNotifications';
import {
  can,
  canManageAccounts,
  canSeeWeeklyPdfs,
  canViewAttendance,
  canViewLogs,
  isEmployee,
  isSuperAdmin,
} from '../lib/permissions';
import type { User } from '../lib/types';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
  badge?: number;
}

export function navFor(user: User | undefined, unread = 0) {
  const employee = isEmployee(user);
  const home: NavItem = employee
    ? { to: '/app', label: 'Today', icon: Clock3, end: true }
    : { to: '/app', label: 'Home', icon: LayoutDashboard, end: true };
  const history: NavItem = { to: '/app/attendance/history', label: 'History', icon: CalendarClock };
  const alerts: NavItem = {
    to: '/app/notifications',
    label: 'Notifications',
    icon: Bell,
    badge: unread,
  };
  const profile: NavItem = { to: '/app/profile', label: 'Profile', icon: UserRound };
  const work: NavItem = { to: '/app/work', label: 'My work', icon: ListChecks };
  const main: NavItem[] = employee
    ? [home, work, history, alerts, profile]
    : [home, alerts, profile];
  const admin: NavItem[] = [];
  if (canViewAttendance(user))
    admin.push({ to: '/app/admin/attendance', label: 'Attendance', icon: Clock3 });
  if (canSeeWeeklyPdfs(user))
    admin.push({ to: '/app/admin/reports', label: 'Reports', icon: FileText });
  if (can(user, 'approve_faceid_devices'))
    admin.push({ to: '/app/admin/faceid-devices', label: 'Face ID devices', icon: ScanFace });
  if (isSuperAdmin(user) || can(user, 'manage_leaves'))
    admin.push({ to: '/app/admin/leave', label: 'Leave and holidays', icon: CalendarDays });
  if (can(user, 'approve_users'))
    admin.push({ to: '/app/admin/requests', label: 'Sign-up requests', icon: ClipboardList });
  if (canManageAccounts(user))
    admin.push({ to: '/app/admin/users', label: 'Users', icon: UsersRound });
  if (isSuperAdmin(user))
    admin.push({ to: '/app/admin/settings', label: 'Settings', icon: Settings2 });
  if (canViewLogs(user))
    admin.push({ to: '/app/admin/logs', label: 'Activity log', icon: ScrollText });
  // Phones: at most four entries; admin sections are grouped behind "Admin".
  // Employees: History stays reachable from the Today screen.
  const mobile: NavItem[] = employee ? [home, work, alerts] : [home, alerts];
  if (admin.length) mobile.push({ to: '/app/admin', label: 'Admin', icon: ShieldCheck });
  mobile.push(profile);
  return { main, admin, mobile };
}

function Count({ n }: { n?: number }) {
  if (!n) return null;
  return (
    <span className="ml-auto min-w-5 rounded-full bg-secondary-500 px-1.5 text-center text-[11px] leading-5 font-semibold text-ink-900">
      <span className="sr-only">, </span>
      {n > 99 ? '99+' : n}
      <span className="sr-only"> unread</span>
    </span>
  );
}

function SideLink({ item, activeId = 'side-active' }: { item: NavItem; activeId?: string }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      end={item.end}
      className={({ isActive }) =>
        cx(
          'relative flex min-h-11 items-center gap-3 rounded-control px-3 text-sm font-medium transition-colors',
          isActive ? 'text-primary-700' : 'text-ink-600 hover:bg-ink-50 hover:text-ink-800',
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <motion.span
              layoutId={activeId}
              className="absolute inset-0 rounded-control bg-primary-50"
              transition={{ duration: duration.base, ease: easing.standard }}
            />
          )}
          <Icon aria-hidden size={18} strokeWidth={1.5} className="relative" />
          <span className="relative">{item.label}</span>
          <span className="relative ml-auto">
            <Count n={item.badge} />
          </span>
        </>
      )}
    </NavLink>
  );
}

export function AppLayout() {
  const { data: me } = useMe();
  const { data: unread } = useUnreadCount();
  const nav = navFor(me, unread ?? 0);
  const location = useLocation();
  // The element (not <Outlet/>) is captured so an exiting page keeps its own content.
  const outlet = useOutlet();
  const navigate = useNavigate();
  const toast = useToast();
  // Gate: an employee who has not checked in today is sent to the check-in screen.
  useEffect(() => {
    let last = 0;
    return onCheckInRequired(() => {
      // Several requests can be refused at once: one message is enough.
      if (Date.now() - last > 5000)
        toast.show('Please check in first to use the app today.', 'info');
      last = Date.now();
      navigate('/app', { replace: true });
    });
  }, [navigate, toast]);
  const logout = () => void signOut().then(() => navigate('/sign-in', { replace: true }));
  // The phone menu belongs to the page it was opened on: navigating closes it.
  const [menuPath, setMenuPath] = useState<string | null>(null);
  const menuOpen = menuPath === location.pathname;
  const setMenuOpen = (open: boolean) => setMenuPath(open ? location.pathname : null);

  return (
    <div className="min-h-dvh lg:flex">
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-ink-100 bg-surface p-4 lg:flex">
        <Logo variant="sidebar" className="mb-8 ml-2 self-start" />
        <nav aria-label="Sidebar" className="flex flex-1 flex-col gap-1 overflow-y-auto">
          {nav.main.map((i) => (
            <SideLink key={i.to} item={i} />
          ))}
          {nav.admin.length > 0 && (
            <>
              <p className="mt-6 mb-1 px-3 text-xs font-semibold tracking-wide text-ink-400 uppercase">
                Administration
              </p>
              {nav.admin.map((i) => (
                <SideLink key={i.to} item={i} />
              ))}
            </>
          )}
        </nav>
        {me && (
          <div className="mt-4 flex items-center gap-3 border-t border-ink-100 pt-4">
            <Avatar src={me.photo_url} first={me.first_name} last={me.last_name} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink-800">{me.full_name}</p>
              <p className="truncate text-xs text-ink-500">{me.job_title ?? me.email}</p>
            </div>
            <button
              type="button"
              onClick={logout}
              aria-label="Sign out"
              title="Sign out"
              className="flex size-11 items-center justify-center rounded-control text-ink-500 hover:bg-ink-50 hover:text-ink-800"
            >
              <LogOut aria-hidden size={18} strokeWidth={1.5} />
            </button>
          </div>
        )}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-ink-100 bg-surface/90 px-4 pt-[env(safe-area-inset-top)] backdrop-blur lg:hidden">
          <Logo variant="topbar" className="my-2.5" />
          <div className="flex items-center gap-1">
            {me && (
              <Link
                to="/app/profile"
                aria-label="My profile"
                className="flex size-11 items-center justify-center rounded-full"
              >
                <Avatar src={me.photo_url} first={me.first_name} last={me.last_name} size="sm" />
              </Link>
            )}
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
              aria-haspopup="dialog"
              aria-expanded={menuOpen}
              data-testid="mobile-menu-button"
              className="flex size-11 items-center justify-center rounded-control text-ink-600 hover:bg-ink-50 hover:text-ink-900"
            >
              <Menu aria-hidden size={22} strokeWidth={1.5} />
            </button>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-5 pb-[calc(6rem+env(safe-area-inset-bottom))] sm:px-6 lg:px-8 lg:pt-8 lg:pb-10">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, transition: { duration: duration.fast } }}
              transition={{ duration: duration.base, ease: easing.standard }}
            >
              {outlet}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <Modal open={menuOpen} onClose={() => setMenuOpen(false)} title="Menu" showClose>
        <nav aria-label="Full menu" className="flex flex-col gap-1">
          {nav.main.map((i) => (
            <SideLink key={i.to} item={i} activeId="menu-active" />
          ))}
          {nav.admin.length > 0 && (
            <>
              <p className="mt-4 mb-1 px-3 text-xs font-semibold tracking-wide text-ink-400 uppercase">
                Administration
              </p>
              {nav.admin.map((i) => (
                <SideLink key={i.to} item={i} activeId="menu-active" />
              ))}
            </>
          )}
          <button
            type="button"
            onClick={logout}
            className="mt-4 flex min-h-11 items-center gap-3 rounded-control border-t border-ink-100 px-3 pt-2 text-sm font-medium text-ink-600 hover:bg-ink-50 hover:text-ink-900"
          >
            <LogOut aria-hidden size={18} strokeWidth={1.5} />
            Sign out
          </button>
        </nav>
      </Modal>

      <nav
        aria-label="Bottom menu"
        className="fixed inset-x-0 bottom-0 z-30 flex border-t border-ink-100 bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        {nav.mobile.map(({ to, label, icon: Icon, end, badge }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cx(
                'relative flex min-h-14 flex-1 flex-col items-center justify-center gap-1 text-xs',
                isActive ? 'font-semibold text-primary-700' : 'text-ink-500',
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.span
                    layoutId="tab-active"
                    className="absolute inset-x-6 top-0 h-0.5 rounded-full bg-primary-600"
                  />
                )}
                <span className="relative">
                  <Icon aria-hidden size={20} strokeWidth={1.5} />
                  {badge ? (
                    <span className="absolute -top-1 -right-2 size-2.5 rounded-full bg-secondary-500 ring-2 ring-surface">
                      <span className="sr-only">{badge} unread</span>
                    </span>
                  ) : null}
                </span>
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
