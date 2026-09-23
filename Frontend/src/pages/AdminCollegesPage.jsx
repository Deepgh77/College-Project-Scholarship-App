import React, { useState, useEffect } from 'react';
import { AdminLayout } from '../components/admin/AdminLayout';
import { api } from '../services/api';
import {
  Building2,
  Search,
  Plus,
  Loader2,
  Edit2,
  X,
  MapPin,
  GraduationCap,
  Users,
} from 'lucide-react';

export function AdminCollegesPage() {
  const [colleges, setColleges] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [isActiveFilter, setIsActiveFilter] = useState('ALL');

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalCollege, setEditModalCollege] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    university: '',
    district: '',
    taluka: '',
    isActive: true,
  });

  useEffect(() => {
    loadColleges();
  }, [page, isActiveFilter]);

  const loadColleges = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getAdminColleges({
        page,
        limit: 15,
        isActive: isActiveFilter !== 'ALL' ? isActiveFilter : undefined,
        search: search.trim() || undefined,
      });
      setColleges(res.colleges || []);
      setTotal(res.total || 0);
      setTotalPages(res.totalPages || 1);
    } catch (err) {
      setError(err.message || 'Failed to load colleges.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    loadColleges();
  };

  const handleToggleStatus = async (college) => {
    const actionText = college.isActive ? 'deactivate' : 'activate';
    if (!window.confirm(`Are you sure you want to ${actionText} college ${college.name}?`)) {
      return;
    }

    try {
      setError(null);
      setSuccessMsg(null);
      const res = await api.updateAdminCollegeStatus(college.id, !college.isActive);
      setSuccessMsg(res.message);
      loadColleges();
    } catch (err) {
      setError(err.message || 'Failed to update college status.');
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError(null);
      setSuccessMsg(null);
      const res = await api.createAdminCollege(formData);
      setSuccessMsg(res.message);
      setCreateModalOpen(false);
      setFormData({
        code: '',
        name: '',
        university: '',
        district: '',
        taluka: '',
        isActive: true,
      });
      loadColleges();
    } catch (err) {
      setError(err.message || 'Failed to create college.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError(null);
      setSuccessMsg(null);
      const res = await api.updateAdminCollege(editModalCollege.id, {
        name: editModalCollege.name,
        university: editModalCollege.university,
        district: editModalCollege.district,
        taluka: editModalCollege.taluka,
      });
      setSuccessMsg(res.message);
      setEditModalCollege(null);
      loadColleges();
    } catch (err) {
      setError(err.message || 'Failed to update college.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AdminLayout
      title="College Master Management"
      subtitle="Manage institutional master directory, accreditation data, and active portal status"
      action={
        <button
          onClick={() => setCreateModalOpen(true)}
          className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-xs transition"
        >
          <Plus className="w-4 h-4" />
          <span>Add College Master</span>
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
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by college name, code, university, district..."
              className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div className="flex items-center gap-2">
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

      {/* Colleges Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-purple-600" />
            <p className="text-xs">Loading colleges...</p>
          </div>
        ) : colleges.length === 0 ? (
          <div className="py-20 text-center text-slate-400">
            <Building2 className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm font-semibold text-slate-700">No colleges found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-bold text-[10px] tracking-wider">
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">College Name</th>
                  <th className="py-3 px-4">University</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">Enrolled / Staff</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {colleges.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{c.code}</td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{c.name}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{c.university}</td>
                    <td className="py-3 px-4 text-slate-600">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        <span>
                          {c.taluka}, {c.district}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-mono">
                      <span>{c._count?.students || 0} students</span> &bull;{' '}
                      <span>{c._count?.users || 0} staff</span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          c.isActive
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {c.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <button
                        onClick={() => setEditModalCollege({ ...c })}
                        className="p-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition"
                        title="Edit college master"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleToggleStatus(c)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition ${
                          c.isActive
                            ? 'border-rose-200 text-rose-700 bg-rose-50/70 hover:bg-rose-100'
                            : 'border-emerald-200 text-emerald-700 bg-emerald-50/70 hover:bg-emerald-100'
                        }`}
                      >
                        {c.isActive ? 'Deactivate' : 'Activate'}
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
            Total: <strong>{total}</strong> colleges
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

      {/* Add College Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                  <Building2 className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Add New College Master</h3>
              </div>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Institutional Code *</label>
                <input
                  type="text"
                  required
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="e.g. ENG-PUN-042"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none uppercase font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">College Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Full official institution name"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Affiliated University *</label>
                <input
                  type="text"
                  required
                  value={formData.university}
                  onChange={(e) => setFormData({ ...formData, university: e.target.value })}
                  placeholder="e.g. Savitribai Phule Pune University"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">District *</label>
                  <input
                    type="text"
                    required
                    value={formData.district}
                    onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                    placeholder="e.g. Pune"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Taluka *</label>
                  <input
                    type="text"
                    required
                    value={formData.taluka}
                    onChange={(e) => setFormData({ ...formData, taluka: e.target.value })}
                    placeholder="e.g. Haveli"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
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
                  <span>Save College</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit College Modal */}
      {editModalCollege && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Edit College Master</h3>
                <p className="text-xs text-slate-400 font-mono">{editModalCollege.code}</p>
              </div>
              <button
                onClick={() => setEditModalCollege(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">College Name *</label>
                <input
                  type="text"
                  required
                  value={editModalCollege.name}
                  onChange={(e) => setEditModalCollege({ ...editModalCollege, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Affiliated University *</label>
                <input
                  type="text"
                  required
                  value={editModalCollege.university}
                  onChange={(e) =>
                    setEditModalCollege({ ...editModalCollege, university: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">District *</label>
                  <input
                    type="text"
                    required
                    value={editModalCollege.district}
                    onChange={(e) =>
                      setEditModalCollege({ ...editModalCollege, district: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Taluka *</label>
                  <input
                    type="text"
                    required
                    value={editModalCollege.taluka}
                    onChange={(e) =>
                      setEditModalCollege({ ...editModalCollege, taluka: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setEditModalCollege(null)}
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
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
