import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import {
  LayoutDashboard, Users, Car, Wrench, CalendarCheck,
  Calendar, FileText, Receipt, UserCog, Settings,
  LogOut, Menu, X, Zap,
} from 'lucide-react';

const navItems = [
  { to: '/app', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/app/customers', icon: Users, label: 'Customers' },
  { to: '/app/sessions', icon: CalendarCheck, label: 'Sessions' },
  { to: '/app/calendar', icon: Calendar, label: 'Calendar' },
  { to: '/app/services', icon: Wrench, label: 'Services' },
  { to: '/app/quotes', icon: FileText, label: 'Quotes' },
  { to: '/app/invoices', icon: Receipt, label: 'Invoices' },
];

const ownerNav = [
  { to: '/app/staff', icon: UserCog, label: 'Staff' },
  { to: '/app/settings', icon: Settings, label: 'Settings' },
];

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); };

  const linkClass = ({ isActive }) =>
    `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
      isActive
        ? 'bg-brand-600 text-white'
        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
    }`;

  const Sidebar = () => (
    <nav className="flex flex-col gap-1 p-4 h-full">
      <div className="flex items-center gap-2 px-3 py-3 mb-4">
        <Zap className="w-6 h-6 text-brand-600" />
        <span className="text-lg font-bold text-gray-900">DetailSnap</span>
      </div>

      {navItems.map(({ to, icon: Icon, label, end }) => (
        <NavLink key={to} to={to} end={end} className={linkClass} onClick={() => setOpen(false)}>
          <Icon className="w-4 h-4" />
          {label}
        </NavLink>
      ))}

      {user?.role === 'owner' && (
        <>
          <div className="my-2 border-t border-gray-200" />
          {ownerNav.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} className={linkClass} onClick={() => setOpen(false)}>
              <Icon className="w-4 h-4" />
              {label}
            </NavLink>
          ))}
        </>
      )}

      <div className="mt-auto pt-4 border-t border-gray-200">
        <div className="px-3 py-2 text-xs text-gray-500 truncate">{user?.email}</div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </nav>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-56 bg-white border-r border-gray-200 shrink-0">
        <Sidebar />
      </aside>

      {/* Mobile sidebar overlay */}
      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <aside className="relative z-50 flex flex-col w-56 h-full bg-white">
            <Sidebar />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Mobile topbar */}
        <header className="md:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200">
          <button onClick={() => setOpen(true)} className="text-gray-500 hover:text-gray-900">
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <span className="font-semibold text-gray-900">DetailSnap</span>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
