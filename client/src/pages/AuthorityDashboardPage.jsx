import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { AuthorityNavbar } from '../components/authority/AuthorityNavbar';
import {
  Inbox,
  Clock,
  Send,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowRight,
  Loader2,
  Building2,
  Landmark,
  Layers,
} from 'lucide-react';

export function AuthorityDashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getAuthorityDashboard();
      setData(res);
    } catch (err) {
      setError(err.message || 'Failed to load centralized authority dashboard metrics.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <AuthorityNavbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-3">
            <Loader2 className="w-8 h-8 text-teal-600 animate-spin mx-auto" />
            <p className="text-xs font-medium text-slate-500">Loading state authority dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <AuthorityNavbar />
        <div className="flex-1 max-w-2xl mx-auto p-8 flex items-center justify-center">
          <div className="bg-white p-6 rounded-2xl border border-rose-200 text-center space-y-3 shadow-xs">
            <AlertCircle className="w-10 h-10 text-rose-600 mx-auto" />
            <h3 className="text-base font-bold text-slate-900">Dashboard Error</h3>
            <p className="text-xs text-slate-600">{error}</p>
            <button
              onClick={fetchDashboard}
              className="px-4 py-2 bg-teal-700 text-white rounded-lg text-xs font-bold hover:bg-teal-800 transition cursor-pointer"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { homeDepartment, metrics, workload } = data;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <AuthorityNavbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Centralized Overview Banner */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 mb-1">
              <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-teal-100 text-teal-800 uppercase tracking-wide">
                Centralized Authority Portal
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs text-slate-500 font-medium">All State Departments</span>
              {homeDepartment && (
                <span className="text-[11px] font-medium text-slate-500">
                  (Attached: {homeDepartment.code})
                </span>
              )}
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              State Scholarship Scrutiny Dashboard
            </h2>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl">
              Cross-department oversight, workload monitoring, and department-level scrutiny across all scholarship schemes.
            </p>
          </div>

          <div className="flex items-center space-x-3 shrink-0">
            <Link
              to="/authority/applications?status=AWAITING_ACTION"
              className="inline-flex items-center space-x-2 px-4 py-2.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
            >
              <Inbox className="w-4 h-4" />
              <span>Review Awaiting Action ({metrics.awaitingAction})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Core Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          {/* Card 1: Awaiting Action */}
          <Link
            to="/authority/applications?status=AWAITING_ACTION"
            className="p-4 bg-white rounded-xl border border-amber-200/80 hover:border-amber-400 hover:shadow-xs transition group cursor-pointer"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-600">Awaiting Action</span>
              <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <Inbox className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-black text-amber-600">{metrics.awaitingAction}</p>
            <p className="text-[11px] text-slate-500 mt-1">Forwarded by institutes</p>
          </Link>

          {/* Card 2: Under Scrutiny */}
          <Link
            to="/authority/applications?status=UNDER_AUTHORITY_REVIEW"
            className="p-4 bg-white rounded-xl border border-indigo-200/80 hover:border-indigo-400 hover:shadow-xs transition group cursor-pointer"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-600">Under Scrutiny</span>
              <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-black text-indigo-600">{metrics.underReviewCount}</p>
            <p className="text-[11px] text-slate-500 mt-1">Active review desk</p>
          </Link>

          {/* Card 3: Sent Back */}
          <Link
            to="/authority/applications?status=AUTHORITY_SENT_BACK"
            className="p-4 bg-white rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-xs transition group cursor-pointer"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-600">Sent Back</span>
              <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                <Send className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-black text-rose-600">{metrics.sentBackCount}</p>
            <p className="text-[11px] text-slate-500 mt-1">Corrections in progress</p>
          </Link>

          {/* Card 4: Approved */}
          <Link
            to="/authority/applications?status=APPROVED"
            className="p-4 bg-white rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-xs transition group cursor-pointer"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-600">Approved</span>
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-black text-emerald-600">{metrics.approvedCount}</p>
            <p className="text-[11px] text-slate-500 mt-1">Sanctioned applications</p>
          </Link>

          {/* Card 5: Rejected */}
          <Link
            to="/authority/applications?status=AUTHORITY_REJECTED"
            className="p-4 bg-white rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-xs transition group cursor-pointer col-span-2 lg:col-span-1"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-600">Rejected</span>
              <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
                <XCircle className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-black text-slate-700">{metrics.rejectedCount}</p>
            <p className="text-[11px] text-slate-500 mt-1">Closed applications</p>
          </Link>
        </div>

        {/* Workload Intelligence: Department, Aging, Scheme, College */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* 1. Department Distribution */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center">
                  <Landmark className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Departments</h3>
                  <p className="text-[11px] text-slate-500">Volume by department</p>
                </div>
              </div>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {workload.departmentDistribution?.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">No departmental applications recorded.</p>
              ) : (
                workload.departmentDistribution?.map((d) => (
                  <Link
                    key={d.id}
                    to={`/authority/applications?departmentId=${d.id}`}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 hover:bg-teal-50/70 border border-slate-100 hover:border-teal-200 transition text-xs group cursor-pointer"
                  >
                    <div className="truncate mr-2">
                      <p className="font-bold text-slate-800 group-hover:text-teal-900 truncate">{d.name}</p>
                      <span className="text-[10px] text-slate-500">{d.code}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded font-bold bg-white text-slate-800 border border-slate-200 shrink-0">
                      {d.count}
                    </span>
                  </Link>
                ))
              )}
            </div>
          </div>

          {/* 2. Aging Breakdown */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Workload Aging</h3>
                  <p className="text-[11px] text-slate-500">Scrutiny queue time</p>
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-1">
              <div className="p-2.5 rounded-xl bg-emerald-50/60 border border-emerald-200/60 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-emerald-900">&lt; 3 Days (Fresh)</div>
                  <div className="text-[10px] text-emerald-700">Within optimal review window</div>
                </div>
                <span className="text-lg font-black text-emerald-800 font-mono">
                  {workload.aging.freshUnder3Days}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-amber-50/60 border border-amber-200/60 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-amber-900">3 – 7 Days (Moderate)</div>
                  <div className="text-[10px] text-amber-700">Needs attention soon</div>
                </div>
                <span className="text-lg font-black text-amber-800 font-mono">
                  {workload.aging.moderate3To7Days}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-rose-50/60 border border-rose-200/60 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-rose-900">&gt; 7 Days (Overdue)</div>
                  <div className="text-[10px] text-rose-700">Escalated pending scrutiny</div>
                </div>
                <span className="text-lg font-black text-rose-800 font-mono">
                  {workload.aging.overdueOver7Days}
                </span>
              </div>
            </div>
          </div>

          {/* 3. Scheme Distribution */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Scheme Volume</h3>
                  <p className="text-[11px] text-slate-500">Top scholarship schemes</p>
                </div>
              </div>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {workload.schemeDistribution.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">No scheme applications recorded yet.</p>
              ) : (
                workload.schemeDistribution.map((s) => (
                  <div key={s.id} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 text-xs">
                    <div className="truncate mr-2">
                      <p className="font-bold text-slate-800 truncate">{s.name}</p>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {s.code} {s.departmentCode ? `• ${s.departmentCode}` : ''}
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded font-bold bg-white text-slate-800 border border-slate-200 shrink-0">
                      {s.count}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 4. College Distribution */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Institutions</h3>
                  <p className="text-[11px] text-slate-500">Applying colleges</p>
                </div>
              </div>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {workload.collegeDistribution.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">No college applications recorded yet.</p>
              ) : (
                workload.collegeDistribution.map((c) => (
                  <div key={c.id} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 text-xs">
                    <div className="truncate mr-2">
                      <p className="font-bold text-slate-800 truncate">{c.name}</p>
                      <span className="text-[10px] text-slate-500">{c.code}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded font-bold bg-white text-slate-800 border border-slate-200 shrink-0">
                      {c.count}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Immediate Action Required Table across all departments */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Immediate Action Required</h3>
              <p className="text-xs text-slate-500">Oldest pending applications awaiting scrutiny across all departments</p>
            </div>
            <Link
              to="/authority/applications?status=AWAITING_ACTION"
              className="text-xs font-bold text-teal-700 hover:text-teal-800 inline-flex items-center space-x-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {workload.immediateActionRequired.length === 0 ? (
            <div className="py-8 text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
              <p className="text-xs font-medium text-slate-600">All forwarded applications have been reviewed!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-3">ARN</th>
                    <th className="py-2.5 px-3">Student</th>
                    <th className="py-2.5 px-3">Department</th>
                    <th className="py-2.5 px-3">College</th>
                    <th className="py-2.5 px-3">Scheme</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Aging</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {workload.immediateActionRequired.map((app) => (
                    <tr key={app.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3 px-3 font-mono font-bold text-teal-800">{app.applicationNumber}</td>
                      <td className="py-3 px-3">
                        <p className="font-bold text-slate-900">{app.studentName}</p>
                        <span className="text-[11px] text-slate-500">{app.studentEmail}</span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          {app.departmentCode || app.departmentName}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-700 truncate max-w-[180px]">{app.collegeName}</td>
                      <td className="py-3 px-3 text-slate-700 truncate max-w-[180px]">{app.scholarshipName}</td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                          {app.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-700">{app.daysPending}d pending</td>
                      <td className="py-3 px-3 text-right">
                        <Link
                          to={`/authority/applications/${app.id}`}
                          className="inline-flex items-center space-x-1 px-3 py-1.5 bg-teal-50 text-teal-700 hover:bg-teal-100 font-bold rounded-lg transition cursor-pointer"
                        >
                          <span>Review</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
