import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { EligibilityBadge } from '../components/EligibilityBadge';
import {
  GraduationCap,
  Search,
  Building2,
  Calendar,
  IndianRupee,
  ArrowLeft,
  ArrowRight,
  Filter,
  Loader2,
  AlertCircle,
  FileCheck,
  ShieldAlert,
} from 'lucide-react';

export function ScholarshipCatalogPage() {
  const { user } = useAuth();
  const [scholarships, setScholarships] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [filterEligibleOnly, setFilterEligibleOnly] = useState(false);
  const [filterOpenOnly, setFilterOpenOnly] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError('');

        const [scholRes, deptRes] = await Promise.all([
          api.getScholarships({ academicYear: '2024-2025' }),
          api.getDepartments(),
        ]);

        if (scholRes.success) {
          setScholarships(scholRes.scholarships || []);
        }
        if (deptRes.success) {
          setDepartments(deptRes.departments || []);
        }
      } catch (err) {
        setError(err.message || 'Failed to load scholarship schemes.');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  // Filter scholarships locally
  const filteredScholarships = scholarships.filter((s) => {
    if (selectedDept && s.department?.id !== selectedDept) return false;
    if (filterOpenOnly && !s.isWindowOpen) return false;
    if (filterEligibleOnly && s.eligibility?.status !== 'ELIGIBLE') return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = s.name.toLowerCase().includes(q);
      const matchCode = s.code.toLowerCase().includes(q);
      const matchDesc = s.description.toLowerCase().includes(q);
      const matchDept = s.department?.name.toLowerCase().includes(q);
      if (!matchName && !matchCode && !matchDesc && !matchDept) return false;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-16">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link
              to="/dashboard"
              className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-600 hover:text-indigo-600 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Dashboard</span>
            </Link>
            <span className="text-slate-300">|</span>
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                <GraduationCap className="w-4 h-4" />
              </div>
              <span className="text-sm font-bold text-slate-900 hidden sm:inline">
                Maha Scholarship Portal
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {user?.role === 'STUDENT' && (
              <Link
                to="/profile"
                className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-2xs transition"
              >
                <span>My Profile</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Portal Notice */}
        <div className="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-200 text-indigo-900 text-xs flex items-start space-x-2.5">
          <ShieldAlert className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
          <span>
            <strong>Maha Scholarship Portal:</strong> Discover active welfare schemes and evaluate your personalized eligibility criteria before submitting your application.
          </span>
        </div>

        {/* Page Title */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Explore Scholarship Schemes
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Discover active post-matric welfare schemes for Academic Year 2024–2025 and check your personalized eligibility.
          </p>
        </div>

        {/* Search & Filter Bar */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3 sm:space-y-0 sm:flex sm:items-center sm:space-x-4">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by scholarship name, code, or keyword..."
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
            />
          </div>

          {/* Department Filter */}
          <div className="sm:w-64">
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.code})
                </option>
              ))}
            </select>
          </div>

          {/* Quick Filter Checkboxes */}
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 pt-2 sm:pt-0 text-xs text-slate-600">
            {user?.role === 'STUDENT' && (
              <label className="flex items-center space-x-1.5 cursor-pointer font-medium">
                <input
                  type="checkbox"
                  checked={filterEligibleOnly}
                  onChange={(e) => setFilterEligibleOnly(e.target.checked)}
                  className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                />
                <span>Eligible Only</span>
              </label>
            )}

            <label className="flex items-center space-x-1.5 cursor-pointer font-medium">
              <input
                type="checkbox"
                checked={filterOpenOnly}
                onChange={(e) => setFilterOpenOnly(e.target.checked)}
                className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
              />
              <span>Open Window Only</span>
            </label>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Loading Spinner */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
            <p className="text-xs text-slate-500 font-medium">Loading scholarship schemes...</p>
          </div>
        ) : (
          <>
            {/* Results Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredScholarships.map((s) => (
                <div
                  key={s.id}
                  className="bg-white rounded-xl border border-slate-200 shadow-2xs hover:shadow-sm hover:border-slate-300 transition flex flex-col justify-between overflow-hidden"
                >
                  <div className="p-5 space-y-3">
                    {/* Header: Dept & Window Status */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 uppercase tracking-wider">
                        {s.department?.code || 'GOVT'}
                      </span>

                      {s.isWindowOpen ? (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                          Window Open
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                          Window Closed
                        </span>
                      )}
                    </div>

                    {/* Scheme Name & Code */}
                    <div>
                      <div className="text-[11px] font-mono text-indigo-600 font-bold">{s.code}</div>
                      <h3 className="text-sm font-bold text-slate-900 leading-snug mt-0.5 line-clamp-2">
                        {s.name}
                      </h3>
                      <p className="text-xs text-slate-500 line-clamp-2 mt-1.5 leading-relaxed">
                        {s.description}
                      </p>
                    </div>

                    {/* Benefit Info */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium">Benefit Amount:</span>
                      <span className="font-bold text-slate-900">
                        ₹{s.benefitAmount?.toLocaleString('en-IN')} / year
                      </span>
                    </div>

                    {/* Eligibility Badge (if student) */}
                    {user?.role === 'STUDENT' && s.eligibility && (
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                        <span className="text-slate-500 font-medium">My Status:</span>
                        <EligibilityBadge status={s.eligibility.status} />
                      </div>
                    )}
                  </div>

                  {/* Card Bottom CTA */}
                  <div className="p-4 bg-slate-50/70 border-t border-slate-100">
                    <Link
                      to={`/scholarships/${s.id}`}
                      className="w-full inline-flex items-center justify-center space-x-1.5 py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-2xs transition"
                    >
                      <span>View Details & Eligibility</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            {/* Empty State */}
            {filteredScholarships.length === 0 && (
              <div className="py-16 text-center bg-white rounded-xl border border-slate-200 p-8 shadow-2xs">
                <FileCheck className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <h4 className="text-sm font-bold text-slate-800">No scholarships found</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  No scholarship matched your current search filters. Try adjusting your search query or department selection.
                </p>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
