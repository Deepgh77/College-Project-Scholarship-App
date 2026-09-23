import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import { AuthorityNavbar } from '../components/authority/AuthorityNavbar';
import {
  Search,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  Loader2,
  ArrowRight,
  Inbox,
  RefreshCw,
} from 'lucide-react';

const STATUS_FILTERS = [
  { value: 'ALL', label: 'All Applications' },
  { value: 'AWAITING_ACTION', label: 'Awaiting Action' },
  { value: 'UNDER_AUTHORITY_REVIEW', label: 'Under Review' },
  { value: 'AUTHORITY_SENT_BACK', label: 'Sent Back' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'AUTHORITY_REJECTED', label: 'Rejected' },
];

export function AuthorityApplicationsQueuePage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // State from URL search params or defaults
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [status, setStatus] = useState(searchParams.get('status') || 'ALL');
  const [departmentId, setDepartmentId] = useState(searchParams.get('departmentId') || '');
  const [scholarshipId, setScholarshipId] = useState(searchParams.get('scholarshipId') || '');
  const [collegeId, setCollegeId] = useState(searchParams.get('collegeId') || '');
  const [academicYear, setAcademicYear] = useState(searchParams.get('academicYear') || '');
  const [sortBy, setSortBy] = useState(searchParams.get('sortBy') || 'submittedAt');
  const [sortOrder, setSortOrder] = useState(searchParams.get('sortOrder') || 'desc');
  const [page, setPage] = useState(parseInt(searchParams.get('page') || '1', 10));

  const [applications, setApplications] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 15, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter master options (across all departments)
  const [departments, setDepartments] = useState([]);
  const [schemes, setSchemes] = useState([]);
  const [colleges, setColleges] = useState([]);

  useEffect(() => {
    fetchFilterOptions();
  }, []);

  useEffect(() => {
    fetchApplications();
    // Synchronize URL query params
    const params = {};
    if (search) params.search = search;
    if (status && status !== 'ALL') params.status = status;
    if (departmentId) params.departmentId = departmentId;
    if (scholarshipId) params.scholarshipId = scholarshipId;
    if (collegeId) params.collegeId = collegeId;
    if (academicYear) params.academicYear = academicYear;
    if (sortBy !== 'submittedAt') params.sortBy = sortBy;
    if (sortOrder !== 'desc') params.sortOrder = sortOrder;
    if (page > 1) params.page = page.toString();
    setSearchParams(params, { replace: true });
  }, [search, status, departmentId, scholarshipId, collegeId, academicYear, sortBy, sortOrder, page]);

  const fetchFilterOptions = async () => {
    try {
      const res = await api.getAuthorityFilterOptions();
      if (res?.departments) setDepartments(res.departments);
      if (res?.scholarships) setSchemes(res.scholarships);
      if (res?.colleges) setColleges(res.colleges);
    } catch {
      // Non-blocking fallback
    }
  };

  const fetchApplications = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getAuthorityApplications({
        page,
        limit: 15,
        search,
        status,
        departmentId,
        scholarshipId,
        collegeId,
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
    setDepartmentId('');
    setScholarshipId('');
    setCollegeId('');
    setAcademicYear('');
    setSortBy('submittedAt');
    setSortOrder('desc');
    setPage(1);
  };

  // Filter schemes if a specific department is chosen
  const filteredSchemes = departmentId
    ? schemes.filter((s) => s.departmentId === departmentId)
    : schemes;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <AuthorityNavbar />

      <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Page Title & Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center space-x-2">
              <FileSpreadsheet className="w-6 h-6 text-teal-700" />
              <span>State Scrutiny Queue</span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Search, filter, and review scholarship applications across all departments and academic institutions.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={fetchApplications}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-2xs cursor-pointer"
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
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                  status === f.value
                    ? 'bg-teal-700 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Search and Dropdown Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
            {/* Search Input */}
            <form onSubmit={handleSearchSubmit} className="lg:col-span-2 relative">
              <input
                type="text"
                placeholder="Search ARN, Name, Email, Mobile..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-300 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-teal-500 focus:outline-hidden"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            </form>

            {/* Department Filter */}
            <div>
              <select
                value={departmentId}
                onChange={(e) => {
                  setDepartmentId(e.target.value);
                  setScholarshipId('');
                  setPage(1);
                }}
                className="w-full py-2 px-3 text-xs rounded-xl border border-slate-300 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-teal-500 focus:outline-hidden font-medium"
              >
                <option value="">All Departments</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.code} - {d.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Scheme Filter */}
            <div>
              <select
                value={scholarshipId}
                onChange={(e) => {
                  setScholarshipId(e.target.value);
                  setPage(1);
                }}
                className="w-full py-2 px-3 text-xs rounded-xl border border-slate-300 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-teal-500 focus:outline-hidden"
              >
                <option value="">All Schemes</option>
                {filteredSchemes.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.code} - {s.name}
                  </option>
                ))}
              </select>
            </div>

            {/* College Filter */}
            <div>
              <select
                value={collegeId}
                onChange={(e) => {
                  setCollegeId(e.target.value);
                  setPage(1);
                }}
                className="w-full py-2 px-3 text-xs rounded-xl border border-slate-300 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-teal-500 focus:outline-hidden"
              >
                <option value="">All Institutions</option>
                {colleges.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
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
                className="w-full py-2 px-3 text-xs rounded-xl border border-slate-300 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-teal-500 focus:outline-hidden"
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
                className="w-full py-2 px-3 text-xs rounded-xl border border-slate-300 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-teal-500 focus:outline-hidden"
              >
                <option value="submittedAt:desc">Newest Submission</option>
                <option value="submittedAt:asc">Oldest Submission</option>
                <option value="updatedAt:desc">Recently Updated</option>
                <option value="applicationNumber:asc">ARN (A-Z)</option>
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
              <Loader2 className="w-8 h-8 text-teal-600 animate-spin mx-auto" />
              <p className="text-xs font-medium text-slate-500">Querying applications across departments...</p>
            </div>
          ) : applications.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs table-auto xl:table-fixed">
                <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-3.5 w-[14%] min-w-[130px]">Application Number / AY</th>
                    <th className="py-3 px-3.5 w-[16%] min-w-[140px]">Student Name</th>
                    <th className="py-3 px-3.5 w-[24%] min-w-[200px]">Department & Scheme</th>
                    <th className="py-3 px-3.5 w-[18%] min-w-[160px]">Institution</th>
                    <th className="py-3 px-3.5 w-[11%] min-w-[100px]">Pending Aging</th>
                    <th className="py-3 px-3.5 w-[10%] min-w-[110px]">Status</th>
                    <th className="py-3 px-3.5 w-[7%] min-w-[80px] text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {applications.map((app) => {
                    const badgeClass =
                      app.status === 'UNDER_AUTHORITY_REVIEW'
                        ? 'bg-indigo-100 text-indigo-800 border-indigo-200'
                        : app.status === 'AUTHORITY_SENT_BACK'
                        ? 'bg-amber-100 text-amber-800 border-amber-200'
                        : app.status === 'AUTHORITY_REJECTED'
                        ? 'bg-rose-100 text-rose-800 border-rose-200'
                        : app.status === 'APPROVED'
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                        : 'bg-teal-100 text-teal-800 border-teal-200';

                    return (
                      <tr key={app.id} className="hover:bg-slate-50/80 transition">
                        {/* ARN & AY */}
                        <td className="py-3 px-3.5">
                          <div className="font-mono font-bold text-teal-800 whitespace-nowrap">
                            {app.applicationNumber || 'PENDING-ARN'}
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center space-x-1.5 mt-0.5 whitespace-nowrap">
                            <span className="font-semibold text-slate-700">AY {app.academicYear}</span>
                          </div>
                        </td>

                        {/* Student Name */}
                        <td className="py-3 px-3.5">
                          <div className="font-bold text-slate-900 truncate" title={app.studentName}>
                            {app.studentName}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate" title={app.studentEmail}>
                            {app.studentEmail}
                          </div>
                        </td>

                        {/* Department & Scheme */}
                        <td className="py-3 px-3.5">
                          <div className="flex items-center space-x-1.5 mb-0.5">
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
                              {app.departmentCode || 'DEPT'}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono truncate">
                              ({app.scholarshipCode})
                            </span>
                          </div>
                          <div className="font-semibold text-slate-800 line-clamp-2 leading-snug" title={app.scholarshipName}>
                            {app.scholarshipName}
                          </div>
                          <div className="text-[11px] font-medium text-teal-700 mt-0.5">
                            ₹{Number(app.benefitAmount || 0).toLocaleString('en-IN')}
                          </div>
                        </td>

                        {/* Institution */}
                        <td className="py-3 px-3.5">
                          <div className="font-semibold text-slate-800 line-clamp-2 leading-snug" title={app.collegeName}>
                            {app.collegeName}
                          </div>
                          {app.collegeCode && (
                            <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                              {app.collegeCode}
                            </div>
                          )}
                        </td>

                        {/* Submission & Aging */}
                        <td className="py-3 px-3.5 whitespace-nowrap">
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
                              className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-bold ${
                                app.daysPending > 7
                                  ? 'bg-rose-100 text-rose-800'
                                  : app.daysPending >= 3
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {app.daysPending}d in queue
                            </span>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-3 px-3.5">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border whitespace-nowrap ${badgeClass}`}
                          >
                            {app.statusMeta?.label || app.status}
                          </span>
                          {app.openCorrectionsCount > 0 && (
                            <div className="text-[10px] text-amber-700 font-semibold mt-0.5 whitespace-nowrap">
                              {app.openCorrectionsCount} open correction(s)
                            </div>
                          )}
                        </td>

                        {/* Action */}
                        <td className="py-3 px-3.5 text-right whitespace-nowrap">
                          <Link
                            to={`/authority/applications/${app.id}`}
                            className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold shadow-2xs hover:shadow-xs transition cursor-pointer"
                          >
                            <span>Review</span>
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
                No scholarship applications match your selected filter criteria.
              </p>
              <button
                onClick={handleResetFilters}
                className="inline-flex items-center space-x-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition cursor-pointer"
              >
                <span>Clear All Filters</span>
              </button>
            </div>
          )}

          {/* Pagination Bar */}
          {pagination.totalPages > 1 && (
            <div className="px-4 py-3 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-0">
              <div className="text-xs text-slate-600">
                Showing <span className="font-bold">{(pagination.page - 1) * pagination.limit + 1}</span> to{' '}
                <span className="font-bold">
                  {Math.min(pagination.page * pagination.limit, pagination.total)}
                </span>{' '}
                of <span className="font-bold">{pagination.total}</span> applications
              </div>
              <div className="flex items-center space-x-2">
                <button
                  disabled={pagination.page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 transition cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-bold text-slate-700">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <button
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 transition cursor-pointer"
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
