import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  GraduationCap,
  Plus,
  ExternalLink,
  ShieldCheck,
  RotateCcw,
  Eye,
} from 'lucide-react';

export function MyApplicationsPage() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' | 'SUBMITTED' | 'DRAFT'

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.getMyApplications();
      setApplications(res.applications || []);
    } catch (err) {
      setError(err.message || 'Failed to load your applications.');
    } finally {
      setLoading(false);
    }
  };

  const submittedApps = applications.filter((a) => a.status !== 'DRAFT');
  const draftApps = applications.filter((a) => a.status === 'DRAFT');

  const filteredApps =
    activeTab === 'SUBMITTED'
      ? submittedApps
      : activeTab === 'DRAFT'
      ? draftApps
      : applications;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-4 overflow-hidden">
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </Link>
            <span className="text-slate-300 hidden sm:inline">|</span>
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <h1 className="text-sm sm:text-base font-bold text-slate-900 truncate">My Applications</h1>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link
              to="/scholarships"
              className="inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 sm:py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Explore Schemes</span>
              <span className="sm:hidden">Explore</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8">
        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-rose-800 text-sm">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Header Intro */}
        <div className="mb-6">
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Submitted & In-Progress Applications
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Track multi-stage scrutiny status, resolve officer correction requests, and access official application PDFs.
          </p>
        </div>

        {/* Tab Filters */}
        <div className="flex items-center gap-2 mb-6 border-b border-slate-200 pb-3 overflow-x-auto whitespace-nowrap scrollbar-none">
          <button
            onClick={() => setActiveTab('ALL')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer shrink-0 ${
              activeTab === 'ALL' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            All Applications ({applications.length})
          </button>
          <button
            onClick={() => setActiveTab('SUBMITTED')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer shrink-0 ${
              activeTab === 'SUBMITTED' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Submitted ({submittedApps.length})
          </button>
          <button
            onClick={() => setActiveTab('DRAFT')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer shrink-0 ${
              activeTab === 'DRAFT' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Drafts ({draftApps.length})
          </button>
        </div>

        {/* List of Applications */}
        {loading ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-500">Loading your scholarship applications...</p>
          </div>
        ) : filteredApps.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center max-w-lg mx-auto">
            <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <GraduationCap className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">No applications found</h3>
            <p className="text-xs text-slate-500 mb-6">
              You have not started any scholarship applications under this filter. Explore eligible schemes to apply.
            </p>
            <Link
              to="/scholarships"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" /> Explore Scholarships
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredApps.map((app) => {
              const isDraft = app.status === 'DRAFT';

              return (
                <div
                  key={app.id}
                  className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs hover:border-slate-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 overflow-hidden">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          isDraft
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : app.statusMeta?.badgeVariant === 'rose'
                            ? 'bg-rose-100 text-rose-800 border border-rose-200 animate-pulse'
                            : app.statusMeta?.badgeVariant === 'emerald'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : app.statusMeta?.badgeVariant === 'red'
                            ? 'bg-red-100 text-red-800 border border-red-200'
                            : 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                        }`}
                      >
                        {app.statusMeta?.label || app.status}
                      </span>
                      {app.statusMeta?.isActionRequired && (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider bg-rose-600 text-white shadow-2xs">
                          Action Required
                        </span>
                      )}
                      <span className="text-xs font-bold text-slate-500">
                        AY {app.academicYear}
                      </span>
                      {app.applicationNumber && (
                        <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 break-all">
                          ARN: {app.applicationNumber}
                        </span>
                      )}
                    </div>

                    <h3 className="text-base font-bold text-slate-900 line-clamp-1">
                      {app.scholarship.name}
                    </h3>

                    <p className="text-xs text-slate-500">
                      {app.scholarship.department?.name || 'Government Department'} • Scheme Benefit: ₹{app.scholarship.benefitAmount?.toLocaleString('en-IN')}
                    </p>

                    <div className="flex items-center gap-4 text-[11px] text-slate-400 pt-1">
                      <span>Started: {new Date(app.createdAt).toLocaleDateString('en-IN')}</span>
                      {app.submittedAt && (
                        <span>Submitted: {new Date(app.submittedAt).toLocaleDateString('en-IN')}</span>
                      )}
                      {isDraft && (
                        <span className="font-semibold text-amber-700">
                          Completion Progress: {app.healthScore}%
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {!isDraft && (
                      <a
                        href={api.getApplicationPdfUrl(app.id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition-all border border-indigo-100 cursor-pointer"
                        title="View Application PDF"
                      >
                        <Eye className="w-3.5 h-3.5" /> View PDF
                      </a>
                    )}
                    <Link
                      to={isDraft ? `/applications/${app.id}/wizard` : `/applications/${app.id}`}
                      className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs ${
                        isDraft
                          ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                          : app.statusMeta?.isActionRequired
                          ? 'bg-rose-600 hover:bg-rose-700 text-white'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      {isDraft ? (
                        <>
                          <RotateCcw className="w-3.5 h-3.5" /> Continue Draft
                        </>
                      ) : app.statusMeta?.isActionRequired ? (
                        <>
                          <AlertCircle className="w-3.5 h-3.5" /> Resolve Corrections
                        </>
                      ) : (
                        <>
                          <FileText className="w-3.5 h-3.5" /> Track Application
                        </>
                      )}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
