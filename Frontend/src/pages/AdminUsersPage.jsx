import React, { useState, useEffect } from 'react';
import { AdminLayout } from '../components/admin/AdminLayout';
import { api } from '../services/api';
import {
  Users,
  Search,
  Filter,
  UserPlus,
  Shield,
  Building2,
  Building,
  GraduationCap,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  X,
  Eye,
} from 'lucide-react';

export function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('ALL');
  const [isActiveFilter, setIsActiveFilter] = useState('ALL');

  // Modals
  const [provisionModalOpen, setProvisionModalOpen] = useState(false);
  const [detailModalUser, setDetailModalUser] = useState(null);
  const [colleges, setColleges] = useState([]);
  const [departments, setDepartments] = useState([]);

  // Form State
  const [provisionData, setProvisionData] = useState({
    email: '',
    password: '',
    role: 'COLLEGE',
    collegeId: '',
    departmentId: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadUsers();
  }, [page, role, isActiveFilter]);

  useEffect(() => {
    loadMetadata();
  }, []);

  const loadMetadata = async () => {
    try {
      const [collegesRes, deptsRes] = await Promise.all([
        api.getAdminColleges({ limit: 100 }),
        api.getAdminDepartments({}),
      ]);
      setColleges(collegesRes.colleges || []);
      setDepartments(deptsRes.departments || []);
    } catch (err) {
      console.error('Failed to load colleges/departments metadata', err);
    }
  };

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getAdminUsers({
        page,
        limit: 15,
        role: role !== 'ALL' ? role : undefined,
        isActive: isActiveFilter !== 'ALL' ? isActiveFilter : undefined,
        search: search.trim() || undefined,
      });
      setUsers(res.users || []);
      setTotal(res.total || 0);
      setTotalPages(res.totalPages || 1);
    } catch (err) {
      setError(err.message || 'Failed to load users.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    loadUsers();
  };

  const handleToggleStatus = async (user) => {
    const actionText = user.isActive ? 'deactivate' : 'activate';
    if (!window.confirm(`Are you sure you want to ${actionText} user ${user.email}?`)) {
      return;
    }

    try {
      setError(null);
      setSuccessMsg(null);
      const res = await api.updateAdminUserStatus(user.id, !user.isActive);
      setSuccessMsg(res.message);
      loadUsers();
    } catch (err) {
      setError(err.message || 'Failed to update user status.');
    }
  };

  const handleProvisionSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError(null);
      setSuccessMsg(null);
      const res = await api.provisionAdminStaffUser(provisionData);
      setSuccessMsg(res.message);
      setProvisionModalOpen(false);
      setProvisionData({
        email: '',
        password: '',
        role: 'COLLEGE',
        collegeId: '',
        departmentId: '',
      });
      loadUsers();
    } catch (err) {
      setError(err.message || 'Failed to provision staff user.');
    } finally {
      setSubmitting(false);
    }
  };

  const getRoleBadge = (r) => {
    switch (r) {
      case 'ADMIN':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'AUTHORITY':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'COLLEGE':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'STUDENT':
      default:
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    }
  };

  return (
    <AdminLayout
      title="User Accounts & Staff Management"
      subtitle="View all accounts, manage active state, and provision official institutional staff"
      action={
        <button
          onClick={() => setProvisionModalOpen(true)}
          className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-xs transition"
        >
          <UserPlus className="w-4 h-4" />
          <span>Provision Staff Account</span>
        </button>
      }
    >
      {/* Notifications */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-rose-500 hover:text-rose-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-500 hover:text-emerald-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter / Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by email or student full name..."
              className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={role}
              onChange={(e) => {
                setRole(e.target.value);
                setPage(1);
              }}
              className="text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="ALL">All Roles</option>
              <option value="STUDENT">Student</option>
              <option value="COLLEGE">College Officer</option>
              <option value="AUTHORITY">Authority Officer</option>
              <option value="ADMIN">Administrator</option>
            </select>

            <select
              value={isActiveFilter}
              onChange={(e) => {
                setIsActiveFilter(e.target.value);
                setPage(1);
              }}
              className="text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="true">Active Only</option>
              <option value="false">Inactive Only</option>
            </select>

            <button
              type="submit"
              className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition"
            >
              Search
            </button>
          </div>
        </form>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-purple-600" />
            <p className="text-xs">Loading user accounts...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="py-20 text-center text-slate-400">
            <Users className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm font-semibold text-slate-700">No users found</p>
            <p className="text-xs text-slate-500 mt-1">Try adjusting your filters or search terms.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-bold text-[10px] tracking-wider">
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Linkage / Profile</th>
                  <th className="py-3 px-4">Account Status</th>
                  <th className="py-3 px-4">Registered</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{u.email}</div>
                      {u.studentProfile?.fullName && (
                        <span className="text-[11px] text-slate-500 block">
                          {u.studentProfile.fullName}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${getRoleBadge(
                          u.role
                        )}`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {u.role === 'COLLEGE' && u.college && (
                        <div className="flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                          <span className="truncate max-w-[200px]" title={u.college.name}>
                            {u.college.name}
                          </span>
                        </div>
                      )}
                      {u.role === 'AUTHORITY' && (
                        <div className="flex items-center gap-1.5">
                          <Building className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          <span>{u.department?.code || 'All Departments (Centralized)'}</span>
                        </div>
                      )}
                      {u.role === 'STUDENT' && u.studentProfile && (
                        <div>
                          <span className="text-slate-800 font-medium">
                            {u.studentProfile.college?.name || 'College unlinked'}
                          </span>
                          <span className="text-[10px] text-slate-400 block font-mono">
                            {u.studentProfile.category || 'NO CATEGORY'} &bull; {u.studentProfile._count?.applications || 0} apps
                          </span>
                        </div>
                      )}
                      {u.role === 'ADMIN' && (
                        <div className="flex items-center gap-1 text-purple-700 font-semibold">
                          <Shield className="w-3.5 h-3.5 text-purple-600" />
                          <span>Super Administrator</span>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          u.isActive
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {u.isActive ? 'Active' : 'Deactivated'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                      {new Date(u.createdAt).toLocaleDateString('en-IN')}
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <button
                        onClick={() => setDetailModalUser(u)}
                        className="p-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition"
                        title="View details"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleToggleStatus(u)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition ${
                          u.isActive
                            ? 'border-rose-200 text-rose-700 bg-rose-50/70 hover:bg-rose-100'
                            : 'border-emerald-200 text-emerald-700 bg-emerald-50/70 hover:bg-emerald-100'
                        }`}
                      >
                        {u.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        <div className="flex items-center justify-between p-3 border-t border-slate-100 text-xs text-slate-500 bg-slate-50">
          <span>
            Total: <strong>{total}</strong> users
          </span>
          <div className="flex items-center space-x-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white disabled:opacity-40"
            >
              Previous
            </button>
            <span className="font-bold text-slate-800">
              Page {page} of {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Provision Staff Modal */}
      {provisionModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                  <UserPlus className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Provision Official Staff Account</h3>
              </div>
              <button
                onClick={() => setProvisionModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleProvisionSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Official Email Address *</label>
                <input
                  type="email"
                  required
                  value={provisionData.email}
                  onChange={(e) => setProvisionData({ ...provisionData, email: e.target.value })}
                  placeholder="e.g. officer@coep.ac.in"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Initial Password *</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={provisionData.password}
                  onChange={(e) => setProvisionData({ ...provisionData, password: e.target.value })}
                  placeholder="Minimum 8 characters"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Role Assignment *</label>
                <select
                  value={provisionData.role}
                  onChange={(e) => setProvisionData({ ...provisionData, role: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none bg-white font-medium"
                >
                  <option value="COLLEGE">College Officer (COLLEGE)</option>
                  <option value="AUTHORITY">Department Authority Officer (AUTHORITY)</option>
                  <option value="ADMIN">System Administrator (ADMIN)</option>
                </select>
              </div>

              {provisionData.role === 'COLLEGE' && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Associated College *</label>
                  <select
                    required
                    value={provisionData.collegeId}
                    onChange={(e) => setProvisionData({ ...provisionData, collegeId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none bg-white"
                  >
                    <option value="">Select an enrolled College...</option>
                    {colleges.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.code}) - {c.district}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {provisionData.role === 'AUTHORITY' && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Home Department (Optional)</label>
                  <select
                    value={provisionData.departmentId}
                    onChange={(e) => setProvisionData({ ...provisionData, departmentId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none bg-white"
                  >
                    <option value="">None (Centralized Across All Departments)</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.code})
                      </option>
                    ))}
                  </select>
                  <span className="text-[11px] text-slate-400 block mt-1">
                    Note: Centralized Authority model allows processing applications across all departments.
                  </span>
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setProvisionModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold inline-flex items-center space-x-1.5 disabled:opacity-50"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Provision User</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* User Details Modal */}
      {detailModalUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">User Account Details</h3>
                <p className="text-xs text-slate-400">{detailModalUser.id}</p>
              </div>
              <button
                onClick={() => setDetailModalUser(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Email:</span>
                <span className="font-bold text-slate-900">{detailModalUser.email}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Role:</span>
                <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] border ${getRoleBadge(detailModalUser.role)}`}>
                  {detailModalUser.role}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Status:</span>
                <span className={`font-bold ${detailModalUser.isActive ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {detailModalUser.isActive ? 'Active' : 'Deactivated'}
                </span>
              </div>
              {detailModalUser.studentProfile?.fullName && (
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Full Name:</span>
                  <span className="font-bold text-slate-800">{detailModalUser.studentProfile.fullName}</span>
                </div>
              )}
              {detailModalUser.college && (
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">College:</span>
                  <span className="font-bold text-slate-800">{detailModalUser.college.name}</span>
                </div>
              )}
              {detailModalUser.department && (
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Department:</span>
                  <span className="font-bold text-slate-800">{detailModalUser.department.name}</span>
                </div>
              )}
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Created At:</span>
                <span className="text-slate-700 font-mono">
                  {new Date(detailModalUser.createdAt).toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setDetailModalUser(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
