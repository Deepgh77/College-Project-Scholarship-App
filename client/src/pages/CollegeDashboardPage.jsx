import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { CollegeNavbar } from '../components/college/CollegeNavbar';
import {
  Inbox,
  Clock,
  Send,
  CheckCircle2,
  XCircle,
  FileText,
  AlertCircle,
  TrendingUp,
  ArrowRight,
  ShieldAlert,
  Loader2,
  Calendar,
  Layers,
} from 'lucide-react';

export function CollegeDashboardPage() {
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
      const res = await api.getCollegeDashboard();
      setData(res);
    } catch (err) {
      setError(err.message || 'Failed to load college dashboard metrics.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <CollegeNavbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-3">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
            <p className="text-xs font-medium text-slate-500">Loading institutional dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <CollegeNavbar />
        <div className="flex-1 max-w-2xl mx-auto p-8 flex items-center justify-center">
          <div className="bg-white p-6 rounded-2xl border border-rose-200 text-center space-y-3 shadow-sm">
            <AlertCircle className="w-10 h-10 text-rose-600 mx-auto" />
            <h3 className="text-base font-bold text-slate-900">Dashboard Error</h3>
            <p className="text-xs text-slate-600">{error}</p>
            <button
              onClick={fetchDashboard}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { college, metrics, workload } = data;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <CollegeNavbar collegeName={college?.name} collegeCode={college?.code} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Institute Info Header */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 mb-1">
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-800 uppercase tracking-wide">
                Affiliated Institute
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs text-slate-500 font-medium">{college?.university || 'State University'}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {college?.name}
            </h2>
            <p className="text-xs text-slate-500 mt-1 flex items-center space-x-3">
              <span>District: <strong className="text-slate-700">{college?.district}</strong></span>
              {college?.taluka && (
                <span>Taluka: <strong className="text-slate-700">{college?.taluka}</strong></span>
              )}
              <span>College Code: <strong className="text-slate-700">{college?.code}</strong></span>
            </p>
          </div>

          <div className="shrink-0 flex items-center space-x-2">
            <Link
              to="/college/applications?status=AWAITING_ACTION"
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs hover:shadow transition"
            >
              <Inbox className="w-4 h-4" />
              <span>Review Pending Queue ({metrics?.awaitingAction || 0})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Operational Status Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {/* Card 1: Total Applications */}
          <Link
            to="/college/applications"
            className="bg-white rounded-xl border border-slate-200 p-4 hover:border-blue-300 hover:shadow-xs transition group"
          >
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider">Total</span>
              <FileText className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition" />
            </div>
            <div className="text-2xl font-black text-slate-900">{metrics?.totalApplications || 0}</div>
            <div className="text-[11px] text-slate-500 mt-1">Total applications received</div>
          </Link>

          {/* Card 2: Awaiting Action */}
          <Link
            to="/college/applications?status=AWAITING_ACTION"
            className="bg-white rounded-xl border border-blue-200 bg-blue-50/20 p-4 hover:border-blue-400 hover:shadow-xs transition group"
          >
            <div className="flex items-center justify-between text-blue-700 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider">Awaiting Action</span>
              <Inbox className="w-4 h-4 text-blue-600 group-hover:scale-110 transition" />
            </div>
            <div className="text-2xl font-black text-blue-950">{metrics?.awaitingAction || 0}</div>
            <div className="text-[11px] text-blue-700 mt-1">
              New: {metrics?.submittedCount || 0} | Resub: {metrics?.resubmittedCount || 0}
            </div>
          </Link>

          {/* Card 3: Under Scrutiny */}
          <Link
            to="/college/applications?status=UNDER_COLLEGE_REVIEW"
            className="bg-white rounded-xl border border-indigo-200 bg-indigo-50/20 p-4 hover:border-indigo-400 hover:shadow-xs transition group"
          >
            <div className="flex items-center justify-between text-indigo-700 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider">In Scrutiny</span>
              <Clock className="w-4 h-4 text-indigo-600 group-hover:scale-110 transition" />
            </div>
            <div className="text-2xl font-black text-indigo-950">{metrics?.underReviewCount || 0}</div>
            <div className="text-[11px] text-indigo-700 mt-1">Desk review in progress</div>
          </Link>

          {/* Card 4: Sent Back */}
          <Link
            to="/college/applications?status=COLLEGE_SENT_BACK"
            className="bg-white rounded-xl border border-amber-200 bg-amber-50/20 p-4 hover:border-amber-400 hover:shadow-xs transition group"
          >
            <div className="flex items-center justify-between text-amber-700 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider">Sent Back</span>
              <Send className="w-4 h-4 text-amber-600 group-hover:scale-110 transition" />
            </div>
            <div className="text-2xl font-black text-amber-950">{metrics?.sentBackCount || 0}</div>
            <div className="text-[11px] text-amber-700 mt-1">With student for correction</div>
          </Link>

          {/* Card 5: Forwarded */}
          <Link
            to="/college/applications?status=FORWARDED"
            className="bg-white rounded-xl border border-emerald-200 bg-emerald-50/20 p-4 hover:border-emerald-400 hover:shadow-xs transition group"
          >
            <div className="flex items-center justify-between text-emerald-700 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider">Forwarded</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition" />
            </div>
            <div className="text-2xl font-black text-emerald-950">{metrics?.forwardedCount || 0}</div>
            <div className="text-[11px] text-emerald-700 mt-1">To Department Authority</div>
          </Link>

          {/* Card 6: Rejected */}
          <Link
            to="/college/applications?status=COLLEGE_REJECTED"
            className="bg-white rounded-xl border border-rose-200 bg-rose-50/20 p-4 hover:border-rose-400 hover:shadow-xs transition group"
          >
            <div className="flex items-center justify-between text-rose-700 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider">Rejected</span>
              <XCircle className="w-4 h-4 text-rose-600 group-hover:scale-110 transition" />
            </div>
            <div className="text-2xl font-black text-rose-950">{metrics?.rejectedCount || 0}</div>
            <div className="text-[11px] text-rose-700 mt-1">Institutional rejections</div>
          </Link>
        </div>

        {/* Workload Intelligence & Aging Analysis */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Workload Aging Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-blue-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Scrutiny Aging Intelligence
                </h3>
              </div>
              <span className="text-[11px] font-medium text-slate-500">Active Queue</span>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Distribution of pending applications by duration awaiting college scrutiny.
            </p>

            <div className="space-y-3">
              {/* Fresh < 3 Days */}
              <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-100 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-emerald-900">Fresh Submissions</div>
                  <div className="text-[11px] text-emerald-700">Pending &lt; 3 days</div>
                </div>
                <span className="text-lg font-black text-emerald-800">
                  {workload?.aging?.freshUnder3Days || 0}
                </span>
              </div>

              {/* Moderate 3-7 Days */}
              <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-100 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-amber-900">Moderate Duration</div>
                  <div className="text-[11px] text-amber-700">Pending 3 – 7 days</div>
                </div>
                <span className="text-lg font-black text-amber-800">
                  {workload?.aging?.moderate3To7Days || 0}
                </span>
              </div>

              {/* Overdue > 7 Days */}
              <div className="p-3 rounded-xl bg-rose-50/60 border border-rose-100 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <ShieldAlert className="w-4 h-4 text-rose-600" />
                  <div>
                    <div className="text-xs font-bold text-rose-900">Immediate Action Required</div>
                    <div className="text-[11px] text-rose-700">Pending &gt; 7 days</div>
                  </div>
                </div>
                <span className="text-lg font-black text-rose-800">
                  {workload?.aging?.overdueOver7Days || 0}
                </span>
              </div>
            </div>
          </div>

          {/* Scheme-wise Distribution Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4 lg:col-span-2">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <Layers className="w-4 h-4 text-indigo-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Scholarship Scheme Distribution
                </h3>
              </div>
              <span className="text-[11px] font-medium text-slate-500">Active Schemes</span>
            </div>

            {workload?.schemeDistribution?.length > 0 ? (
              <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                {workload.schemeDistribution.map((scheme) => (
                  <div
                    key={scheme.id}
                    className="p-3 rounded-xl border border-slate-200 hover:border-blue-200 bg-slate-50/50 flex items-center justify-between"
                  >
                    <div className="truncate pr-3">
                      <div className="flex items-center space-x-2">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-700">
                          {scheme.code}
                        </span>
                        <span className="text-xs font-bold text-slate-900 truncate">
                          {scheme.name}
                        </span>
                      </div>
                    </div>
                    <div className="shrink-0 flex items-center space-x-3">
                      <span className="text-xs font-bold text-slate-800 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs">
                        {scheme.count} applications
                      </span>
                      <Link
                        to={`/college/applications?scholarshipId=${scheme.id}`}
                        className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
                      >
                        View &rarr;
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400 text-xs">
                No scholarship scheme applications recorded yet.
              </div>
            )}
          </div>
        </div>

        {/* Immediate Action Queue Table */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2">
              <Inbox className="w-4 h-4 text-blue-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Pending Applications Requiring Immediate Scrutiny
              </h3>
            </div>
            <Link
              to="/college/applications?status=AWAITING_ACTION"
              className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center space-x-1"
            >
              <span>View Full Queue</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {workload?.immediateActionRequired?.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Application Number</th>
                    <th className="py-2.5 px-3">Student Name</th>
                    <th className="py-2.5 px-3">Scholarship Scheme</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Cycle</th>
                    <th className="py-2.5 px-3">Aging</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {workload.immediateActionRequired.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-3 font-mono font-bold text-blue-700">
                        {item.applicationNumber || 'DRAFT-PENDING'}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900">{item.studentName}</div>
                        <div className="text-[11px] text-slate-500">
                          {item.studentCategory ? `${item.studentCategory} • ` : ''}
                          {item.courseName || 'Student'}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-slate-700 max-w-xs truncate">
                        {item.scholarshipName}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            item.status === 'RESUBMITTED_TO_COLLEGE'
                              ? 'bg-purple-100 text-purple-800 border border-purple-200'
                              : 'bg-blue-100 text-blue-800 border border-blue-200'
                          }`}
                        >
                          {item.status === 'RESUBMITTED_TO_COLLEGE' ? 'Resubmitted' : 'Submitted'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-600 font-semibold">
                        Cycle {item.cycleNumber}
                      </td>
                      <td className="py-3 px-3 font-medium">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            item.daysPending > 7
                              ? 'bg-rose-100 text-rose-800'
                              : item.daysPending >= 3
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {item.daysPending} day{item.daysPending !== 1 ? 's' : ''} ago
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <Link
                          to={`/college/applications/${item.id}`}
                          className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold text-[11px] transition"
                        >
                          <span>Review</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-slate-400 text-xs">
              All submitted applications have been scrutinized! Zero pending items in queue.
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
