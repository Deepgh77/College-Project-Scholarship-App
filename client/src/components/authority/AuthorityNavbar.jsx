import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Landmark, LayoutDashboard, FileSpreadsheet, LogOut, ShieldCheck, Menu, X } from 'lucide-react';

export function AuthorityNavbar({ departmentName, departmentCode }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isDashboard = location.pathname === '/authority/dashboard';
  const isQueue = location.pathname.startsWith('/authority/applications');

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-[1600px] w-full mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Left: Branding & Central Authority Desk */}
        <div className="flex items-center space-x-2.5 sm:space-x-3 overflow-hidden">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-700 to-emerald-800 text-white flex items-center justify-center shadow-xs shrink-0">
            <Landmark className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center space-x-2">
              <h1 className="text-sm sm:text-base font-bold text-slate-900 leading-tight truncate max-w-[180px] sm:max-w-xs md:max-w-sm lg:max-w-none">
                {departmentName || 'Centralized Authority Portal'}
              </h1>
              {departmentCode ? (
                <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-teal-50 text-teal-700 border border-teal-200 shrink-0">
                  {departmentCode}
                </span>
              ) : (
                <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200 uppercase tracking-wide shrink-0">
                  All Departments
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 flex items-center space-x-1 truncate">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 inline shrink-0" />
              <span>State Scholarship Scrutiny Desk</span>
            </p>
          </div>
        </div>

        {/* Center: Desktop Navigation Links */}
        <nav className="hidden md:flex items-center space-x-1">
          <Link
            to="/authority/dashboard"
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition ${
              isDashboard
                ? 'bg-teal-50 text-teal-800 border border-teal-200 font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Dashboard</span>
          </Link>
          <Link
            to="/authority/applications"
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition ${
              isQueue
                ? 'bg-teal-50 text-teal-800 border border-teal-200 font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Application Queue</span>
          </Link>
        </nav>

        {/* Right: Officer Info & Logout / Mobile Menu Toggle */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          <div className="hidden sm:block text-right">
            <p className="text-xs font-semibold text-slate-800 truncate max-w-[180px]">{user?.email}</p>
            <span className="inline-block text-[10px] uppercase tracking-wider font-bold text-teal-700 bg-teal-100/70 px-1.5 py-0.2 rounded">
              STATE AUTHORITY OFFICER
            </span>
          </div>

          <button
            onClick={logout}
            className="hidden sm:inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 hover:text-rose-600 transition shadow-xs cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>

          {/* Mobile menu toggle */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 py-3 space-y-2 animate-in slide-in-from-top-2 duration-150 shadow-md">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 text-xs">
            <span className="font-semibold text-slate-800 truncate max-w-[200px]">{user?.email}</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800">
              AUTHORITY
            </span>
          </div>
          <nav className="flex flex-col space-y-1 pt-1">
            <Link
              to="/authority/dashboard"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-xs font-semibold ${
                isDashboard ? 'bg-teal-50 text-teal-800 font-bold' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard</span>
            </Link>
            <Link
              to="/authority/applications"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-xs font-semibold ${
                isQueue ? 'bg-teal-50 text-teal-800 font-bold' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Application Queue</span>
            </Link>
            <div className="pt-2 border-t border-slate-100">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  logout();
                }}
                className="w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
