import React, { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  GraduationCap,
  LogOut,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Folder,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  Clock,
  User,
  Sparkles,
  Building,
  AlertCircle,
  Loader2,
  RefreshCw,
  CreditCard,
  Layers,
  Menu,
  X,
} from 'lucide-react';

export function StudentDashboardPage() {
  const { user, logout } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Handle role-based redirects if accessed by non-student
  if (user?.role === 'COLLEGE') {
    return <Navigate to="/college/dashboard" replace />;
  }
  if (user?.role === 'AUTHORITY') {
    return <Navigate to="/authority/dashboard" replace />;
  }
  if (user?.role === 'ADMIN') {
    return <Navigate to="/admin/dashboard" replace />;
  }

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.getStudentDashboard();
      if (res && res.success !== false) {
        setData(res.dashboard || res);
      } else {
        setError(res?.message || 'Failed to load dashboard data.');
      }
    } catch (err) {
      setError(err.message || 'An error occurred while fetching your dashboard overview.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeClass = (variant) => {
    switch (variant) {
      case 'emerald':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'rose':
        return 'bg-rose-100 text-rose-800 border-rose-300';
      case 'amber':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'purple':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'teal':
        return 'bg-teal-100 text-teal-800 border-teal-300';
      case 'blue':
      case 'indigo':
      default:
        return 'bg-indigo-100 text-indigo-800 border-indigo-300';
    }
  };

  const getEligibilityBadge = (eligibility) => {
    if (!eligibility) return null;
    if (eligibility.isEligible) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          <span>Eligible</span>
        </span>
      );
    }
    if (eligibility.status === 'INCOMPLETE' || eligibility.status === 'INCOMPLETE_PROFILE') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
          <AlertCircle className="w-3 h-3 text-amber-600" />
          <span>Incomplete Profile</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-800 border border-rose-200">
        <AlertTriangle className="w-3 h-3 text-rose-600" />
        <span>Not Eligible</span>
      </span>
    );
  };

  const studentName =
    data?.student?.fullName ||
    data?.student?.profile?.fullName ||
    user?.email?.split('@')[0] ||
    'Student';
  const completionPercentage =
    data?.profile?.completionPercentage ??
    data?.student?.profile?.completionPercentage ??
    0;
  const sections = data?.profile?.sections ??
    data?.student?.profile?.sections ?? {
      personal: 0,
      address: 0,
      academic: 0,
      income: 0,
      bank: 0,
    };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      {/* Top Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2.5 sm:space-x-3 overflow-hidden">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-bold text-slate-900 leading-tight truncate">
                Maha Scholarship Portal
              </h1>
              <p className="text-[11px] text-slate-500 hidden sm:block truncate">Scholarship Application & Management System</p>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <div className="hidden sm:flex items-center space-x-2 sm:space-x-3">
            <Link
              to="/dashboard"
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 transition"
            >
              Dashboard
            </Link>
            <Link
              to="/scholarships"
              className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
              <span>Scholarships</span>
            </Link>
            <Link
              to="/applications"
              className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              <span>My Applications</span>
            </Link>
            <Link
              to="/documents"
              className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              <Folder className="w-3.5 h-3.5 text-slate-500" />
              <span>My Documents</span>
            </Link>
            <Link
              to="/profile"
              className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              <User className="w-3.5 h-3.5 text-slate-500" />
              <span>Profile</span>
            </Link>

            <span className="hidden md:inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
              STUDENT
            </span>

            <button
              onClick={logout}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-rose-600 transition shadow-2xs cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>

          {/* Mobile Actions: Hamburger Toggle */}
          <div className="flex sm:hidden items-center space-x-2">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu Drawer */}
        {mobileMenuOpen && (
          <div className="sm:hidden border-t border-slate-200 bg-white px-4 py-3 space-y-2 animate-in slide-in-from-top-2 duration-150 shadow-md">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 text-xs">
              <span className="font-semibold text-slate-800 truncate max-w-[200px]">{user?.email}</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                STUDENT
              </span>
            </div>
            <nav className="flex flex-col space-y-1 pt-1">
              <Link
                to="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center space-x-2 px-3 py-2 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700"
              >
                <span>Dashboard</span>
              </Link>
              <Link
                to="/scholarships"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center space-x-2 px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                <GraduationCap className="w-4 h-4 text-indigo-600" />
                <span>Scholarships Catalog</span>
              </Link>
              <Link
                to="/applications"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center space-x-2 px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                <FileText className="w-4 h-4 text-slate-500" />
                <span>My Applications</span>
              </Link>
              <Link
                to="/documents"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center space-x-2 px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                <Folder className="w-4 h-4 text-slate-500" />
                <span>My Documents Vault</span>
              </Link>
              <Link
                to="/profile"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center space-x-2 px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                <User className="w-4 h-4 text-slate-500" />
                <span>Student Profile</span>
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

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 space-y-6">
        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-600">Loading student dashboard overview...</p>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-rose-800 flex items-start gap-3">
            <AlertCircle className="w-6 h-6 flex-shrink-0 mt-0.5 text-rose-600" />
            <div className="flex-1">
              <h3 className="text-sm font-bold text-rose-900">Failed to load dashboard</h3>
              <p className="text-xs text-rose-700 mt-1">{error}</p>
              <button
                onClick={fetchDashboard}
                className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg transition"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Retry
              </button>
            </div>
          </div>
        )}

        {!loading && data && (
          <>
            {/* Hero / Welcome Greeting */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xl sm:text-2xl font-bold text-slate-900">
                    Welcome back, {studentName}
                  </span>
                  <span className="hidden sm:inline-block text-xl">👋</span>
                </div>
                <p className="text-xs sm:text-sm text-slate-500">
                  {data.student?.college
                    ? `Enrolled at ${data.student.college.name}`
                    : 'Here is an overview of your scholarship applications and required actions.'}
                </p>
              </div>

              {/* Quick Counter Pills */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-center">
                  <div className="text-[11px] font-medium text-slate-500">Applications</div>
                  <div className="text-base font-bold text-slate-800">
                    {data.totalApplicationsCount ?? 0}
                  </div>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-center">
                  <div className="text-[11px] font-medium text-slate-500">Vault Docs</div>
                  <div className="text-base font-bold text-slate-800">
                    {data.documents?.uploadedCount ?? 0}
                  </div>
                </div>
                <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-3.5 py-2 text-center">
                  <div className="text-[11px] font-medium text-indigo-600">Profile Complete</div>
                  <div className="text-base font-bold text-indigo-700">
                    {completionPercentage}%
                  </div>
                </div>
              </div>
            </div>

            {/* PRIORITY 1: ACTION REQUIRED NOTIFICATION BANNER */}
            {data.actionRequired?.count > 0 ? (
              <div className="bg-gradient-to-r from-amber-50 to-rose-50 border-2 border-amber-300 rounded-2xl p-5 sm:p-6 shadow-xs">
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div className="flex-1 space-y-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-base font-bold text-slate-900">
                          {data.actionRequired.count} Action
                          {data.actionRequired.count > 1 ? 's' : ''} Required on Your Application
                        </h2>
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-200 text-amber-900">
                          Attention Needed
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1">
                        The scrutiny officer has sent back your form with structured correction
                        requests. Resolve these items to continue scrutiny.
                      </p>
                    </div>

                    {/* Correction Items List */}
                    <div className="space-y-2">
                      {data.actionRequired.items.map((item) => (
                        <div
                          key={item.id}
                          className="bg-white/90 border border-amber-200 rounded-xl p-3 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-800">
                                {item.affectedDocumentType
                                  ? `Document: ${item.affectedDocumentType}`
                                  : `Field: ${item.affectedField || item.affectedSection}`}
                              </span>
                              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
                                {item.rejectionCategory || 'CORRECTION'}
                              </span>
                            </div>
                            <p className="text-slate-600 text-[11px]">
                              {item.reasonText || item.actionRequiredText || 'Please review and update this entry.'}
                            </p>
                          </div>
                          <Link
                            to={`/applications/${item.applicationId}`}
                            className="inline-flex items-center gap-1 self-start sm:self-center px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs rounded-lg transition shadow-2xs whitespace-nowrap"
                          >
                            Resolve Now
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl px-4 py-3 text-xs text-emerald-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span className="font-medium">
                    No action required right now. All your submissions are in order.
                  </span>
                </div>
                {data.activeApplication && (
                  <Link
                    to={`/applications/${data.activeApplication.id}`}
                    className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 underline ml-2"
                  >
                    View Status
                  </Link>
                )}
              </div>
            )}

            {/* MAIN TWO-COLUMN DASHBOARD GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* LEFT COLUMN: ACTIVE APPLICATION, DISCOVERY & TIMELINE (2 cols) */}
              <div className="lg:col-span-2 space-y-6">
                {/* 1. ACTIVE / LATEST APPLICATION CARD */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <h2 className="text-base font-bold text-slate-900">Application Overview</h2>
                        <p className="text-[11px] text-slate-500">Your most relevant active scholarship submission</p>
                      </div>
                    </div>
                    {data.totalApplicationsCount > 1 && (
                      <Link
                        to="/applications"
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                      >
                        All Applications ({data.totalApplicationsCount})
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    )}
                  </div>

                  {data.activeApplication ? (
                    <div className="space-y-4">
                      {/* Scheme & Status Header */}
                      <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                          <div>
                            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                              {data.activeApplication.scholarship.department?.name || 'Department'}
                            </span>
                            <h3 className="text-base font-bold text-slate-900 mt-0.5">
                              {data.activeApplication.scholarship.name}
                            </h3>
                          </div>
                          <div className="flex items-center gap-2 self-start">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusBadgeClass(
                                data.activeApplication.statusMeta?.badgeVariant
                              )}`}
                            >
                              {data.activeApplication.statusMeta?.label || data.activeApplication.status}
                            </span>
                          </div>
                        </div>

                        {/* Metadata row */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-200/60 text-xs">
                          <div>
                            <span className="text-slate-400 block text-[10px]">Application ID / ARN</span>
                            <span className="font-mono font-semibold text-slate-800">
                              {data.activeApplication.applicationNumber || 'In Draft'}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px]">Academic Year</span>
                            <span className="font-semibold text-slate-800">
                              {data.activeApplication.academicYear}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px]">Benefit Amount</span>
                            <span className="font-bold text-emerald-700">
                              ₹{data.activeApplication.scholarship.benefitAmount.toLocaleString('en-IN')}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Current Stage Description */}
                      <div className="text-xs text-slate-600 bg-indigo-50/50 border border-indigo-100 rounded-xl p-3.5 space-y-1">
                        <div className="flex items-center gap-2 font-semibold text-indigo-900">
                          <Clock className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Stage: {data.activeApplication.statusMeta?.stage || 'Processing'}</span>
                          {data.activeApplication.cycleNumber > 1 && (
                            <span className="text-[10px] px-1.5 py-0.2 bg-indigo-200 text-indigo-800 rounded font-bold">
                              Cycle {data.activeApplication.cycleNumber}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-600">
                          {data.activeApplication.statusMeta?.description}
                        </p>
                        {data.activeApplication.statusMeta?.suggestedNextAction && (
                          <p className="text-[11px] text-indigo-700 font-medium pt-1">
                            <strong>Next step:</strong> {data.activeApplication.statusMeta.suggestedNextAction}
                          </p>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex flex-wrap items-center gap-2.5 pt-1">
                        <Link
                          to={`/applications/${data.activeApplication.id}`}
                          className="inline-flex items-center gap-2 px-4 sm:px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          Track Application
                        </Link>
                        {data.activeApplication.status === 'DRAFT' && (
                          <Link
                            to={`/applications/${data.activeApplication.id}/wizard`}
                            className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl transition"
                          >
                            Continue Application
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        )}
                        <Link
                          to="/applications"
                          className="inline-flex items-center gap-1 px-3 py-2 text-slate-600 hover:text-slate-900 font-semibold text-xs transition sm:ml-auto"
                        >
                          View All
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  ) : (
                    /* EMPTY STATE FOR FIRST-TIME STUDENTS */
                    <div className="text-center py-10 px-4 space-y-3 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto shadow-2xs">
                        <GraduationCap className="w-6 h-6" />
                      </div>
                      <div className="space-y-1 max-w-sm mx-auto">
                        <h3 className="text-sm font-bold text-slate-800">
                          You haven't started an application yet
                        </h3>
                        <p className="text-xs text-slate-500">
                          Explore verified scholarship schemes and apply directly with your profile certificates.
                        </p>
                      </div>
                      <div className="pt-2">
                        <Link
                          to="/scholarships"
                          className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
                        >
                          <GraduationCap className="w-4 h-4" />
                          Find a Scholarship
                        </Link>
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. PAYMENT SUMMARY (IF APPLICABLE) */}
                {data.payment && (
                  <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                          <CreditCard className="w-4 h-4" />
                        </div>
                        <div>
                          <h2 className="text-base font-bold text-slate-900">
                            Administrative Payment Simulation
                          </h2>
                          <p className="text-[11px] text-slate-500">
                            Simulated disbursement state for approved scholarship
                          </p>
                        </div>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold border ${
                          data.payment.status === 'DISBURSED'
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : data.payment.status === 'UNDISBURSED'
                            ? 'bg-rose-100 text-rose-800 border-rose-300'
                            : 'bg-indigo-100 text-indigo-800 border-indigo-300'
                        }`}
                      >
                        {data.payment.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200/80 text-xs">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Benefit Amount</span>
                        <span className="text-sm font-bold text-emerald-700">
                          ₹{data.payment.amount.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Simulation Ref</span>
                        <span className="font-mono text-slate-800 font-semibold truncate block">
                          {data.payment.simulationReference || 'Assigned in batch'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Batch Number</span>
                        <span className="font-mono text-slate-800 font-semibold truncate block">
                          {data.payment.batchNumber || 'Pending batch'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Disbursed Date</span>
                        <span className="font-semibold text-slate-800">
                          {data.payment.disbursedAt
                            ? new Date(data.payment.disbursedAt).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })
                            : 'Awaiting Simulation'}
                        </span>
                      </div>
                    </div>

                    {data.payment.failureReason && (
                      <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-800 flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <strong>Disbursement Exception:</strong> {data.payment.failureReason}
                        </div>
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-slate-500 pt-1 gap-1">
                      <span>* Academic simulation only. No real banking, DBT, or treasury integration.</span>
                      {data.activeApplication && (
                        <Link
                          to={`/applications/${data.activeApplication.id}`}
                          className="font-semibold text-indigo-600 hover:text-indigo-800 self-start sm:self-auto"
                        >
                          View Details →
                        </Link>
                      )}
                    </div>
                  </div>
                )}

                {/* 3. SCHOLARSHIP DISCOVERY (RECOMMENDED SCHEMES) */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div>
                        <h2 className="text-base font-bold text-slate-900">Explore Scholarships</h2>
                        <p className="text-[11px] text-slate-500">
                          Available schemes evaluated against your current profile
                        </p>
                      </div>
                    </div>
                    <Link
                      to="/scholarships"
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                    >
                      View All Schemes
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>

                  {data.featuredScholarships?.length > 0 ? (
                    <div className="space-y-3">
                      {data.featuredScholarships.map((scheme) => (
                        <div
                          key={scheme.id}
                          className="border border-slate-200 hover:border-indigo-300 rounded-xl p-4 transition hover:shadow-2xs bg-white space-y-2"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="space-y-0.5">
                              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                                {scheme.departmentCode || 'DEPT'} • {scheme.academicYear}
                              </span>
                              <h3 className="text-sm font-bold text-slate-900 hover:text-indigo-600 transition">
                                <Link to={`/scholarships/${scheme.id}`}>{scheme.name}</Link>
                              </h3>
                            </div>
                            <div className="flex items-center gap-2 self-start sm:self-center">
                              {getEligibilityBadge(scheme.eligibility)}
                              <span className="text-xs font-bold text-emerald-700 whitespace-nowrap bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                                ₹{scheme.benefitAmount.toLocaleString('en-IN')}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                            <span>
                              {scheme.eligibility?.summary || 'Check scheme criteria'}
                            </span>
                            <Link
                              to={`/scholarships/${scheme.id}`}
                              className="font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 ml-2 whitespace-nowrap"
                            >
                              Details
                              <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-xs text-slate-500">
                      No active scholarships available right now.{' '}
                      <Link to="/scholarships" className="text-indigo-600 font-semibold underline">
                        Browse catalog
                      </Link>
                    </div>
                  )}
                </div>

                {/* 4. RECENT ACTIVITY TIMELINE */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                        <Clock className="w-4 h-4" />
                      </div>
                      <div>
                        <h2 className="text-base font-bold text-slate-900">Recent Application Activity</h2>
                        <p className="text-[11px] text-slate-500">
                          Chronological audit log events from real application actions
                        </p>
                      </div>
                    </div>
                    {data.activeApplication && (
                      <Link
                        to={`/applications/${data.activeApplication.id}`}
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                      >
                        Full History
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    )}
                  </div>

                  {data.recentActivity?.length > 0 ? (
                    <div className="space-y-3">
                      {data.recentActivity.map((event, idx) => (
                        <div
                          key={event.id || idx}
                          className="flex items-start gap-3 text-xs p-3 rounded-xl bg-slate-50/70 border border-slate-200/60"
                        >
                          <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Clock className="w-3.5 h-3.5" />
                          </div>
                          <div className="flex-1 space-y-0.5">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-bold text-slate-900">{event.title}</span>
                              <span className="text-[10px] text-slate-400 whitespace-nowrap">
                                {event.timestamp
                                  ? new Date(event.timestamp).toLocaleDateString('en-IN', {
                                      day: 'numeric',
                                      month: 'short',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })
                                  : ''}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-600">
                              {event.description || event.remarks || 'Event logged in system activity trail.'}
                            </p>
                            {event.applicationNumber && (
                              <div className="text-[10px] font-mono text-slate-400">
                                ARN: {event.applicationNumber}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-xs text-slate-400">
                      No recent application activity recorded yet.
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT COLUMN: PROFILE COMPLETION, VAULT & QUICK ACTIONS (1 col) */}
              <div className="space-y-6">
                {/* 1. PROFILE COMPLETION WIDGET */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                        <User className="w-4 h-4" />
                      </div>
                      <h2 className="text-sm font-bold text-slate-900">Profile Completion</h2>
                    </div>
                    <span className="text-sm font-bold text-indigo-700">{completionPercentage}%</span>
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-1.5">
                    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${
                          completionPercentage === 100
                            ? 'bg-emerald-500'
                            : completionPercentage >= 60
                            ? 'bg-indigo-600'
                            : 'bg-amber-500'
                        }`}
                        style={{ width: `${completionPercentage}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>0%</span>
                      <span>Target: 100%</span>
                    </div>
                  </div>

                  {/* Section Breakdown Grid */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                      <span className="text-slate-400 block text-[10px]">Personal</span>
                      <span className="font-semibold text-slate-800">
                        {sections.personal}/20%
                      </span>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                      <span className="text-slate-400 block text-[10px]">Address</span>
                      <span className="font-semibold text-slate-800">
                        {sections.address}/20%
                      </span>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                      <span className="text-slate-400 block text-[10px]">Academic</span>
                      <span className="font-semibold text-slate-800">
                        {sections.academic}/20%
                      </span>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                      <span className="text-slate-400 block text-[10px]">Income</span>
                      <span className="font-semibold text-slate-800">
                        {sections.income}/20%
                      </span>
                    </div>
                    <div className="col-span-2 p-2 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between">
                      <span className="text-slate-400 text-[10px]">Bank Information</span>
                      <span className="font-semibold text-slate-800">
                        {sections.bank}/20%
                      </span>
                    </div>
                  </div>

                  <div className="pt-1">
                    {completionPercentage === 100 ? (
                      <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                        <span>Profile 100% completed and verified!</span>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-[11px] text-slate-500">
                          Complete your remaining profile sections to unlock automatic scheme eligibility.
                        </p>
                        <Link
                          to="/profile"
                          className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-xs transition"
                        >
                          Complete Your Profile
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. DOCUMENT VAULT WIDGET */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                        <Folder className="w-4 h-4" />
                      </div>
                      <h2 className="text-sm font-bold text-slate-900">Document Vault</h2>
                    </div>
                    <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100">
                      {data.documents?.uploadedCount ?? 0} Uploaded
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 leading-relaxed">
                    Store Income, Caste, Domicile, and Marksheet certificates in your central vault for instant reuse across all scholarship submissions.
                  </p>

                  <Link
                    to="/documents"
                    className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl transition shadow-2xs"
                  >
                    <Folder className="w-3.5 h-3.5 text-indigo-600" />
                    Manage Documents
                  </Link>
                </div>

                {/* 3. QUICK ACTIONS WIDGET */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-3">
                  <h2 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100">
                    Quick Actions
                  </h2>
                  <div className="space-y-1.5 text-xs font-semibold">
                    <Link
                      to="/scholarships"
                      className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 text-slate-700 transition"
                    >
                      <span className="flex items-center gap-2">
                        <GraduationCap className="w-4 h-4 text-indigo-600" />
                        Explore All Scholarships
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </Link>
                    <Link
                      to="/applications"
                      className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 text-slate-700 transition"
                    >
                      <span className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-indigo-600" />
                        My Application History
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </Link>
                    <Link
                      to="/documents"
                      className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 text-slate-700 transition"
                    >
                      <span className="flex items-center gap-2">
                        <Folder className="w-4 h-4 text-indigo-600" />
                        Manage Certificate Vault
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </Link>
                    <Link
                      to="/profile"
                      className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 text-slate-700 transition"
                    >
                      <span className="flex items-center gap-2">
                        <User className="w-4 h-4 text-indigo-600" />
                        Update Profile Information
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
