import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import { CollegeNavbar } from '../components/college/CollegeNavbar';
import {
  Search,
  Filter,
  ArrowUpDown,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  Loader2,
  ArrowRight,
  AlertCircle,
  Inbox,
  RefreshCw,
} from 'lucide-react';

const STATUS_FILTERS = [
  { value: 'ALL', label: 'All Applications' },
  { value: 'AWAITING_ACTION', label: 'Awaiting Action' },
  { value: 'SUBMITTED', label: 'Submitted (New)' },
  { value: 'UNDER_COLLEGE_REVIEW', label: 'Under Review' },
  { value: 'RESUBMITTED_TO_COLLEGE', label: 'Resubmitted' },
  { value: 'COLLEGE_SENT_BACK', label: 'Sent Back' },
  { value: 'FORWARDED', label: 'Forwarded' },
  { value: 'COLLEGE_REJECTED', label: 'Rejected' },
];

export function CollegeApplicationsQueuePage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // State from URL search params or defaults
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [status, setStatus] = useState(searchParams.get('status') || 'ALL');
  const [scholarshipId, setScholarshipId] = useState(searchParams.get('scholarshipId') || '');
  const [academicYear, setAcademicYear] = useState(searchParams.get('academicYear') || '');
  const [sortBy, setSortBy] = useState(searchParams.get('sortBy') || 'submittedAt');
  const [sortOrder, setSortOrder] = useState(searchParams.get('sortOrder') || 'desc');
  const [page, setPage] = useState(parseInt(searchParams.get('page') || '1', 10));

  const [applications, setApplications] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 15, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Scheme master list for filter dropdown
  const [schemes, setSchemes] = useState([]);

  useEffect(() => {
    fetchSchemes();
  }, []);

  useEffect(() => {
    fetchApplications();
    // Synchronize URL query params
    const params = {};
    if (search) params.search = search;
    if (status && status !== 'ALL') params.status = status;
    if (scholarshipId) params.scholarshipId = scholarshipId;
    if (academicYear) params.academicYear = academicYear;
    if (sortBy !== 'submittedAt') params.sortBy = sortBy;
    if (sortOrder !== 'desc') params.sortOrder = sortOrder;
    if (page > 1) params.page = page.toString();
    setSearchParams(params, { replace: true });
  }, [search, status, scholarshipId, academicYear, sortBy, sortOrder, page]);

  const fetchSchemes = async () => {
    try {
      const res = await api.getScholarships();
      if (res?.scholarships) {
        setSchemes(res.scholarships);
      }
    } catch {
      // Non-blocking fallback
    }
  };

  const fetchApplications = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getCollegeApplications({
        page,
        limit: 15,
        search,
        status,
        scholarshipId,
        academicYear,
        sortBy,
        sortOrder,
      });

      setApplications(res.applications || []);
      setPagination(res.pagination || { total: 0, page: 1, limit: 15, totalPages: 1 });
    } catch (err) {
      setError(err.message || 'Failed to load applications queue.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchApplications();
  };

  const handleResetFilters = () => {
    setSearch('');
    setStatus('ALL');
    setScholarshipId('');
    setAcademicYear('');
    setSortBy('submittedAt');
    setSortOrder('desc');
    setPage(1);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <CollegeNavbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Page Title & Stats */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center space-x-2">
              <FileSpreadsheet className="w-6 h-6 text-blue-600" />
              <span>Institute Scrutiny Queue</span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Verify, scrutinize, return for corrections, or forward student applications.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={fetchApplications}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-2xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Filter Controls Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-2xs space-y-4">
          {/* Status Quick Filter Pills */}
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-2 border-b border-slate-100 scrollbar-none">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => {
                  setStatus(f.value);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition ${
                  status === f.value
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Search and Dropdown Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Search Input */}
            <form onSubmit={handleSearchSubmit} className="lg:col-span-2 relative">
              <input
                type="text"
                placeholder="Search by ARN, Student Name, Email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-300 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            </form>

            {/* Scheme Filter */}
            <div>
              <select
                value={scholarshipId}
                onChange={(e) => {
                  setScholarshipId(e.target.value);
                  setPage(1);
                }}
                className="w-full py-2 px-3 text-xs rounded-xl border border-slate-300 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              >
                <option value="">All Schemes</option>
                {schemes.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.code} - {s.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Academic Year Filter */}
            <div>
              <select
                value={academicYear}
                onChange={(e) => {
                  setAcademicYear(e.target.value);
                  setPage(1);
                }}
                className="w-full py-2 px-3 text-xs rounded-xl border border-slate-300 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              >
                <option value="">All Academic Years</option>
                <option value="2024-2025">2024-2025</option>
                <option value="2023-2024">2023-2024</option>
              </select>
            </div>

            {/* Sort Dropdown */}
            <div>
              <select
                value={`${sortBy}:${sortOrder}`}
                onChange={(e) => {
                  const [sb, so] = e.target.value.split(':');
                  setSortBy(sb);
                  setSortOrder(so);
                  setPage(1);
                }}
                className="w-full py-2 px-3 text-xs rounded-xl border border-slate-300 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              >
                <option value="submittedAt:desc">Newest Submission</option>
                <option value="submittedAt:asc">Oldest Submission</option>
                <option value="updatedAt:desc">Recently Updated</option>
                <option value="studentName:asc">Student Name (A-Z)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Applications Table Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          {error && (
            <div className="p-4 bg-rose-50 border-b border-rose-200 text-rose-800 text-xs font-medium flex items-center justify-between">
              <span>{error}</span>
              <button onClick={fetchApplications} className="underline font-bold">
                Try again
              </button>
            </div>
          )}

          {loading ? (
            <div className="py-16 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
              <p className="text-xs font-medium text-slate-500">Querying institute applications...</p>
            </div>
          ) : applications.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Application Number / Cycle</th>
                    <th className="py-3 px-4">Student Name</th>
                    <th className="py-3 px-4">Scholarship Scheme</th>
                    <th className="py-3 px-4">Submission & Aging</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {applications.map((app) => {
                    const badgeClass =
                      app.status === 'UNDER_COLLEGE_REVIEW'
                        ? 'bg-indigo-100 text-indigo-800 border-indigo-200'
                        : app.status === 'COLLEGE_SENT_BACK'
                        ? 'bg-amber-100 text-amber-800 border-amber-200'
                        : app.status === 'COLLEGE_REJECTED'
                        ? 'bg-rose-100 text-rose-800 border-rose-200'
                        : app.status === 'FORWARDED_TO_AUTHORITY'
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                        : app.status === 'RESUBMITTED_TO_COLLEGE'
                        ? 'bg-purple-100 text-purple-800 border-purple-200'
                        : 'bg-blue-100 text-blue-800 border-blue-200';

                    return (
                      <tr key={app.id} className="hover:bg-slate-50/80 transition">
                        {/* ARN & Cycle */}
                        <td className="py-3.5 px-4">
                          <div className="font-mono font-bold text-blue-700">
                            {app.applicationNumber || 'PENDING-ARN'}
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center space-x-1.5 mt-0.5">
                            <span className="font-semibold text-slate-700">Cycle {app.cycleNumber}</span>
                            {app.cycleNumber > 1 && (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-purple-100 text-purple-700">
                                Resubmission
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Student Name */}
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900">{app.student?.fullName}</div>
                          <div className="text-[11px] text-slate-500">
                            {app.student?.category ? `${app.student.category} • ` : ''}
                            {app.student?.courseName
                              ? `${app.student.courseName} (Yr ${app.student.courseYear || 1})`
                              : app.student?.email}
                          </div>
                        </td>

                        {/* Scholarship Scheme */}
                        <td className="py-3.5 px-4 max-w-xs">
                          <div className="font-semibold text-slate-800 truncate">
                            {app.scholarship?.name}
                          </div>
                          <div className="text-[10px] font-mono text-slate-500">
                            {app.scholarship?.code} • AY {app.academicYear}
                          </div>
                        </td>

                        {/* Submission & Aging */}
                        <td className="py-3.5 px-4">
                          <div className="font-medium text-slate-700">
                            {app.submittedAt
                              ? new Date(app.submittedAt).toLocaleDateString('en-IN', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                })
                              : 'Draft'}
                          </div>
                          <div className="mt-0.5">
                            <span
                              className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                                app.daysPending > 7
                                  ? 'bg-rose-100 text-rose-800'
                                  : app.daysPending >= 3
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {app.daysPending}d pending
                            </span>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border ${badgeClass}`}
                          >
                            {app.statusMeta?.label || app.status}
                          </span>
                          {app.openCorrectionsCount > 0 && (
                            <div className="text-[10px] text-amber-700 font-semibold mt-0.5">
                              {app.openCorrectionsCount} open correction(s)
                            </div>
                          )}
                        </td>

                        {/* Action */}
                        <td className="py-3.5 px-4 text-right">
                          <Link
                            to={`/college/applications/${app.id}`}
                            className="inline-flex items-center space-x-1 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-2xs hover:shadow-xs transition"
                          >
                            <span>Scrutinize</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-16 text-center space-y-3">
              <Inbox className="w-10 h-10 text-slate-300 mx-auto" />
              <h4 className="text-sm font-bold text-slate-800">No Applications Found</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No scholarship applications match the active search criteria or filters.
              </p>
              {(search || status !== 'ALL' || scholarshipId || academicYear) && (
                <button
                  onClick={handleResetFilters}
                  className="px-3 py-1.5 text-xs font-bold text-blue-600 hover:text-blue-800"
                >
                  Clear All Filters
                </button>
              )}
            </div>
          )}

          {/* Pagination Footer */}
          {!loading && pagination.totalPages > 1 && (
            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/60 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-0 text-xs text-slate-600">
              <div>
                Showing {(pagination.page - 1) * pagination.limit + 1} –{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                <strong className="text-slate-900">{pagination.total}</strong> applications
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={pagination.page <= 1}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="font-bold text-slate-800">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                  disabled={pagination.page >= pagination.totalPages}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
