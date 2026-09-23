import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AdminLayout } from '../components/admin/AdminLayout';
import { api } from '../services/api';
import {
  Users,
  Building2,
  GraduationCap,
  FileSpreadsheet,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  CreditCard,
  MessageSquare,
  ArrowRight,
  Loader2,
  RefreshCw,
  Building,
  Activity,
} from 'lucide-react';

export function AdminDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getAdminDashboardStats();
      setData(res);
    } catch (err) {
      setError(err.message || 'Failed to load system statistics.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout
      title="System Overview & Analytics"
      subtitle="Real-time institutional and application metrics across all departments"
      action={
        <button
          onClick={loadStats}
          disabled={loading}
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Metrics</span>
        </button>
      }
    >
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin mb-3 text-purple-600" />
          <p className="text-sm font-medium">Aggregating system-wide metrics...</p>
        </div>
      ) : error ? (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={loadStats}
            className="underline font-bold text-rose-900 hover:text-rose-950"
          >
            Retry
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Institutional Master Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Total Students
                </span>
                <Users className="w-4 h-4 text-indigo-500" />
              </div>
              <p className="text-2xl font-black text-slate-900 mt-2">
                {data.overview?.totalStudents?.toLocaleString('en-IN') || 0}
              </p>
              <span className="text-[11px] text-slate-500 block mt-0.5">Registered accounts</span>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Colleges
                </span>
                <Building2 className="w-4 h-4 text-blue-500" />
              </div>
              <p className="text-2xl font-black text-slate-900 mt-2">
                {data.overview?.totalColleges || 0}
              </p>
              <span className="text-[11px] text-emerald-600 font-semibold block mt-0.5">
                {data.overview?.activeColleges || 0} active
              </span>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Departments
                </span>
                <Building className="w-4 h-4 text-purple-500" />
              </div>
              <p className="text-2xl font-black text-slate-900 mt-2">
                {data.overview?.totalDepartments || 0}
              </p>
              <span className="text-[11px] text-slate-500 block mt-0.5">State departments</span>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Scholarships
                </span>
                <GraduationCap className="w-4 h-4 text-emerald-500" />
              </div>
              <p className="text-2xl font-black text-slate-900 mt-2">
                {data.overview?.totalScholarships || 0}
              </p>
              <span className="text-[11px] text-slate-500 block mt-0.5">Active schemes</span>
            </div>
          </div>

          {/* Key Application Metrics (Correction #5 - High-Level Consolidated Metrics) */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4 text-purple-600" />
                <span>Application Lifecycle Metrics</span>
              </h3>
              <Link
                to="/admin/applications"
                className="text-xs font-bold text-purple-600 hover:text-purple-700 inline-flex items-center"
              >
                <span>View Queue</span>
                <ArrowRight className="w-3 h-3 ml-1" />
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
              {/* Total Applications */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Total Applications
                </span>
                <p className="text-2xl font-black text-slate-900 mt-1">
                  {data.metrics?.totalApplications || 0}
                </p>
                <span className="text-[11px] text-slate-500 mt-0.5 block">All states</span>
              </div>

              {/* Pending College */}
              <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200/80 shadow-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 block flex items-center justify-between">
                  <span>Pending College</span>
                  <Clock className="w-3.5 h-3.5 text-blue-500" />
                </span>
                <p className="text-2xl font-black text-blue-900 mt-1">
                  {data.metrics?.pendingCollege || 0}
                </p>
                <span className="text-[11px] text-blue-600 mt-0.5 block">Submitted / In review</span>
              </div>

              {/* Pending Authority */}
              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 shadow-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block flex items-center justify-between">
                  <span>Pending Authority</span>
                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                </span>
                <p className="text-2xl font-black text-amber-900 mt-1">
                  {data.metrics?.pendingAuthority || 0}
                </p>
                <span className="text-[11px] text-amber-600 mt-0.5 block">Forwarded to Dept</span>
              </div>

              {/* Sent Back */}
              <div className="p-4 rounded-2xl bg-orange-50/70 border border-orange-200/80 shadow-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-orange-700 block flex items-center justify-between">
                  <span>Sent Back</span>
                  <AlertTriangle className="w-3.5 h-3.5 text-orange-500" />
                </span>
                <p className="text-2xl font-black text-orange-900 mt-1">
                  {data.metrics?.sentBack || 0}
                </p>
                <span className="text-[11px] text-orange-600 mt-0.5 block">Action required</span>
              </div>

              {/* Approved */}
              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 shadow-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block flex items-center justify-between">
                  <span>Approved</span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                </span>
                <p className="text-2xl font-black text-emerald-900 mt-1">
                  {data.metrics?.approved || 0}
                </p>
                <span className="text-[11px] text-emerald-600 mt-0.5 block">Sanctioned</span>
              </div>

              {/* Rejected */}
              <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-200/80 shadow-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 block flex items-center justify-between">
                  <span>Rejected</span>
                  <XCircle className="w-3.5 h-3.5 text-rose-500" />
                </span>
                <p className="text-2xl font-black text-rose-900 mt-1">
                  {data.metrics?.rejected || 0}
                </p>
                <span className="text-[11px] text-rose-600 mt-0.5 block">College or Authority</span>
              </div>

              {/* Payment Processing */}
              <div className="p-4 rounded-2xl bg-cyan-50/70 border border-cyan-200/80 shadow-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-700 block flex items-center justify-between">
                  <span>Payment Processing</span>
                  <CreditCard className="w-3.5 h-3.5 text-cyan-500" />
                </span>
                <p className="text-2xl font-black text-cyan-900 mt-1">
                  {data.metrics?.paymentProcessing || 0}
                </p>
                <span className="text-[11px] text-cyan-600 mt-0.5 block">Batched / Initiated</span>
              </div>

              {/* Disbursed */}
              <div className="p-4 rounded-2xl bg-teal-50/70 border border-teal-200/80 shadow-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 block flex items-center justify-between">
                  <span>Disbursed</span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-teal-500" />
                </span>
                <p className="text-2xl font-black text-teal-900 mt-1">
                  {data.metrics?.disbursed || 0}
                </p>
                <span className="text-[11px] text-teal-600 mt-0.5 block">Simulated benefit</span>
              </div>

              {/* Undisbursed */}
              <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-300 shadow-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 block flex items-center justify-between">
                  <span>Undisbursed</span>
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                </span>
                <p className="text-2xl font-black text-amber-950 mt-1">
                  {data.metrics?.undisbursed || 0}
                </p>
                <span className="text-[11px] text-amber-700 mt-0.5 block">Simulation exception</span>
              </div>

              {/* Open Grievances */}
              <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-200/80 shadow-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 block flex items-center justify-between">
                  <span>Open Grievances</span>
                  <MessageSquare className="w-3.5 h-3.5 text-purple-500" />
                </span>
                <p className="text-2xl font-black text-purple-900 mt-1">
                  {data.metrics?.openGrievances || 0}
                </p>
                <span className="text-[11px] text-purple-600 mt-0.5 block">Student tickets</span>
              </div>
            </div>
          </div>

          {/* Department Breakdown & Academic Year Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Department Distribution */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                <Building className="w-4 h-4 text-purple-600" />
                <span>Applications by Department</span>
              </h3>
              {data.departmentDistribution?.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">No applications recorded yet.</p>
              ) : (
                <div className="space-y-2.5">
                  {data.departmentDistribution?.map((dept) => (
                    <div key={dept.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <div>
                        <span className="text-xs font-bold text-slate-800">{dept.name}</span>
                        <span className="text-[10px] text-slate-400 block font-mono">{dept.code}</span>
                      </div>
                      <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-purple-100 text-purple-800">
                        {dept.applicationsCount}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Compact Status Breakdown Table */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-purple-600" />
                <span>Complete Status Breakdown</span>
              </h3>
              <div className="max-h-72 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
                {Object.entries(data.statusBreakdown || {}).map(([status, count]) => (
                  <div
                    key={status}
                    className="flex items-center justify-between py-1.5 px-3 rounded-lg hover:bg-slate-50 text-xs border border-transparent hover:border-slate-100"
                  >
                    <span className="font-mono text-slate-700">{status}</span>
                    <span className="font-bold text-slate-900 px-2 py-0.5 rounded-full bg-slate-100">
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recent System Activity Feed */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Activity className="w-4 h-4 text-purple-600" />
                <span>Recent System Activity</span>
              </h3>
              <Link
                to="/admin/audit-logs"
                className="text-xs font-bold text-purple-600 hover:text-purple-700 inline-flex items-center"
              >
                <span>Full Audit Trail</span>
                <ArrowRight className="w-3 h-3 ml-1" />
              </Link>
            </div>

            {data.recentActivity?.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No system activity logged yet.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {data.recentActivity?.map((log) => (
                  <div key={log.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-purple-700">
                          {log.action}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-100 text-slate-700">
                          {log.actorRole}
                        </span>
                        {log.application?.applicationNumber && (
                          <span className="font-mono text-slate-500 text-[11px]">
                            {log.application.applicationNumber}
                          </span>
                        )}
                      </div>
                      {log.remarks && (
                        <p className="text-slate-600 mt-1 text-[11px] italic">
                          "{log.remarks}"
                        </p>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString('en-IN')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
