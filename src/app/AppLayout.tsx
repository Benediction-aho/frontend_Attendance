import {
  CalendarCheck,
  LayoutDashboard,
  ListChecks,
  Settings,
  type LucideIcon,
} from 'lucide-react';
import { NavLink, Outlet } from 'react-router';
import { Logo } from '../ui/Logo';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

// Icons are allowed in the navigation menu only.
const NAV: NavItem[] = [
  { to: '/app', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/app/attendance', label: 'Attendance', icon: CalendarCheck },
  { to: '/app/tasks', label: 'Tasks', icon: ListChecks },
  { to: '/app/settings', label: 'Settings', icon: Settings },
];

function navClass({ isActive }: { isActive: boolean }) {
  return `flex min-h-11 items-center gap-3 rounded-control px-3 text-sm font-medium transition-colors ${
    isActive ? 'bg-primary-50 text-primary-700' : 'text-ink-600 hover:bg-ink-50 hover:text-ink-800'
  }`;
}

/** Placeholder authenticated layout. The auth guard arrives in phase 2. */
export function AppLayout() {
  return (
    <div className="min-h-dvh md:flex">
      <aside className="hidden w-64 shrink-0 border-r border-ink-100 bg-surface p-4 md:block">
        <Logo className="mb-6 h-9 w-auto" />
        <nav aria-label="Main" className="flex flex-col gap-1">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end className={navClass}>
              <Icon aria-hidden size={18} strokeWidth={1.5} />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="flex-1 p-4 pb-24 md:p-8">
        <Outlet />
      </main>
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 grid grid-cols-4 border-t border-ink-100 bg-surface pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end
            className={({ isActive }) =>
              `flex min-h-14 flex-col items-center justify-center gap-1 text-xs ${isActive ? 'text-primary-700' : 'text-ink-500'}`
            }
          >
            <Icon aria-hidden size={20} strokeWidth={1.5} />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

export function PlaceholderPage({ title }: { title: string }) {
  return (
    <section className="rounded-card bg-surface p-6 shadow-card">
      <h1 className="text-xl font-semibold text-primary-700">{title}</h1>
      <p className="mt-2 text-ink-600">This section will be built in a later phase.</p>
    </section>
  );
}
