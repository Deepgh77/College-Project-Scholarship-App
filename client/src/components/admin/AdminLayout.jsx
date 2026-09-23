import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  Building2,
  Building,
  GraduationCap,
  FileSpreadsheet,
  CreditCard,
  MessageSquare,
  Bell,
  History,
  LogOut,
  ShieldCheck,
} from 'lucide-react';

const NAV_ITEMS = [
  { path: '/admin/dashboard', label: 'Overview', icon: LayoutDashboard },
  { path: '/admin/users', label: 'Users', icon: Users },
  { path: '/admin/colleges', label: 'Colleges', icon: Building2 },
  { path: '/admin/departments', label: 'Departments', icon: Building },
  { path: '/admin/scholarships', label: 'Scholarships', icon: GraduationCap },
  { path: '/admin/applications', label: 'Applications', icon: FileSpreadsheet },
  { path: '/admin/payments', label: 'Payment Simulation', icon: CreditCard },
  { path: '/admin/grievances', label: 'Grievances', icon: MessageSquare },
  { path: '/admin/notifications', label: 'Notifications', icon: Bell },
  { path: '/admin/audit-logs', label: 'Audit Logs', icon: History },
];

export function AdminLayout({ children, title, subtitle, action }) {
  const { user, logout } = useAuth();
  const location = useLocation();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Admin Master Header */}
      <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Brand / Title */}
            <div className="flex items-center space-x-2.5 sm:space-x-3 overflow-hidden">
              <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center text-white shadow-xs shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center space-x-2">
                  <span className="text-xs sm:text-sm font-black tracking-wider uppercase text-purple-400 truncate">
                    Maha Scholarship Portal
                  </span>
                  <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded-full font-bold bg-purple-900/60 text-purple-300 border border-purple-700/50 shrink-0">
                    ADMIN
                  </span>
                </div>
                <h1 className="text-sm sm:text-base font-bold text-white leading-tight truncate">
                  System Administration & Management
                </h1>
              </div>
            </div>

            {/* Session Actions */}
            <div className="flex items-center space-x-4">
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-xs font-semibold text-slate-200">{user?.email}</span>
                <span className="text-[10px] text-purple-300 uppercase tracking-wider font-bold">
                  System Administrator
                </span>
              </div>
              <button
                onClick={logout}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-rose-400 text-xs font-medium transition shadow-xs"
                title="Log out of Admin session"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>

          {/* Navigation Bar */}
          <nav className="flex space-x-1 overflow-x-auto py-2 scrollbar-none border-t border-slate-800/80">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive =
                location.pathname === item.path ||
                (item.path !== '/admin/dashboard' && location.pathname.startsWith(item.path));
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`inline-flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${
                    isActive
                      ? 'bg-purple-600 text-white shadow-xs font-bold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Main Content View */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Page Banner */}
        {(title || action) && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
            <div>
              {title && (
                <h2 className="text-xl font-black text-slate-900 tracking-tight">
                  {title}
                </h2>
              )}
              {subtitle && (
                <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
              )}
            </div>
            {action && <div>{action}</div>}
          </div>
        )}

        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-400">
        Maha Scholarship Portal &bull; System Administration & Governance
      </footer>
    </div>
  );
}
