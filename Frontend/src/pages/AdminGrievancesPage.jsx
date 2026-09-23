import React, { useState, useEffect } from 'react';
import { AdminLayout } from '../components/admin/AdminLayout';
import { api } from '../services/api';
import {
  MessageSquare,
  Search,
  Filter,
  Eye,
  Loader2,
  X,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Shield,
  Building2,
  Building,
} from 'lucide-react';

export function AdminGrievancesPage() {
  const [grievances, setGrievances] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [roleFilter, setRoleFilter] = useState('ALL');

  // Action / Detail Modals
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [actionModalTicket, setActionModalTicket] = useState(null);
  const [actionType, setActionType] = useState('status'); // 'status' | 'assign'
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [statusForm, setStatusForm] = useState({
    status: 'UNDER_REVIEW',
    resolutionNotes: '',
  });
  const [assignForm, setAssignForm] = useState({
    assignedRole: 'ADMIN',
  });

  useEffect(() => {
    loadGrievances();
  }, [page, statusFilter, categoryFilter, roleFilter]);

  const loadGrievances = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getAdminGrievances({
        page,
        limit: 15,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        category: categoryFilter !== 'ALL' ? categoryFilter : undefined,
        assignedRole: roleFilter !== 'ALL' ? roleFilter : undefined,
        search: search.trim() || undefined,
      });
      setGrievances(res.grievances || []);
      setTotal(res.total || 0);
      setTotalPages(res.totalPages || 1);
    } catch (err) {
      setError(err.message || 'Failed to load grievances.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    loadGrievances();
  };

  const handleStatusSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError(null);
      setSuccessMsg(null);
      const res = await api.updateAdminGrievanceStatus(actionModalTicket.id, statusForm);
      setSuccessMsg(res.message);
      setActionModalTicket(null);
      loadGrievances();
    } catch (err) {
      setError(err.message || 'Failed to update grievance status.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError(null);
      setSuccessMsg(null);
      const res = await api.reassignAdminGrievance(actionModalTicket.id, assignForm);
      setSuccessMsg(res.message);
      setActionModalTicket(null);
      loadGrievances();
    } catch (err) {
      setError(err.message || 'Failed to reassign grievance.');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'RESOLVED':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'CLOSED':
        return 'bg-slate-200 text-slate-700 border-slate-300';
      case 'UNDER_REVIEW':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'OPEN':
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const getRoleBadge = (r) => {
    switch (r) {
      case 'ADMIN':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'AUTHORITY':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'COLLEGE':
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  return (
    <AdminLayout
      title="Grievances & Dispute Management"
      subtitle="Supervisory overview of student disputes, administrative resolution, and department reassignment"
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
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-2.5">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by ticket #, student, subject..."
              className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-700"
          >
            <option value="ALL">All Statuses</option>
            <option value="OPEN">OPEN</option>
            <option value="UNDER_REVIEW">UNDER_REVIEW</option>
            <option value="RESOLVED">RESOLVED</option>
            <option value="CLOSED">CLOSED</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setPage(1);
            }}
            className="text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-700"
          >
            <option value="ALL">All Categories</option>
            <option value="APPLICATION">APPLICATION</option>
            <option value="DOCUMENT">DOCUMENT</option>
            <option value="VERIFICATION">VERIFICATION</option>
            <option value="PAYMENT">PAYMENT</option>
            <option value="TECHNICAL">TECHNICAL</option>
            <option value="OTHER">OTHER</option>
          </select>

          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPage(1);
            }}
            className="text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-700"
          >
            <option value="ALL">All Assigned Roles</option>
            <option value="COLLEGE">COLLEGE</option>
            <option value="AUTHORITY">AUTHORITY</option>
            <option value="ADMIN">ADMIN</option>
          </select>

          <button
            type="submit"
            className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition"
          >
            Filter
          </button>
        </form>
      </div>

      {/* Grievances Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-purple-600" />
            <p className="text-xs">Loading grievance records...</p>
          </div>
        ) : grievances.length === 0 ? (
          <div className="py-20 text-center text-slate-400">
            <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm font-semibold text-slate-700">No grievances found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-bold text-[10px] tracking-wider">
                  <th className="py-3 px-4">Ticket</th>
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Subject</th>
                  <th className="py-3 px-4">Assigned Role</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {grievances.map((g) => (
                  <tr key={g.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      {g.ticketNumber}
                      <span className="text-[10px] text-slate-400 block font-mono">
                        {new Date(g.createdAt).toLocaleDateString('en-IN')}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">
                        {g.student?.fullName || 'N/A'}
                      </div>
                      <span className="text-[10px] text-slate-500 block">
                        {g.student?.college?.name}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] font-bold text-slate-700">
                      {g.category}
                    </td>
                    <td className="py-3 px-4 max-w-[240px] truncate" title={g.subject}>
                      <span className="font-medium text-slate-800">{g.subject}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${getRoleBadge(
                          g.assignedRole
                        )}`}
                      >
                        {g.assignedRole}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadge(
                          g.status
                        )}`}
                      >
                        {g.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right space-x-1.5">
                      <button
                        onClick={() => setSelectedTicket(g)}
                        className="p-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100"
                        title="View Details"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      {!['RESOLVED', 'CLOSED'].includes(g.status) && (
                        <button
                          onClick={() => {
                            setActionModalTicket(g);
                            setActionType('status');
                            setStatusForm({ status: 'UNDER_REVIEW', resolutionNotes: '' });
                          }}
                          className="px-2 py-1 rounded-lg text-[10px] font-bold border border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100"
                        >
                          Resolve
                        </button>
                      )}
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
            Total: <strong>{total}</strong> grievances
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

      {/* Ticket Details Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Grievance #{selectedTicket.ticketNumber}
                </h3>
                <span className="text-xs text-slate-400 font-mono">
                  {new Date(selectedTicket.createdAt).toLocaleString('en-IN')}
                </span>
              </div>
              <button
                onClick={() => setSelectedTicket(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Applicant:</span>
                <span className="font-bold text-slate-900">{selectedTicket.student?.fullName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Category:</span>
                <span className="font-mono font-bold text-purple-700">{selectedTicket.category}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Assigned Role:</span>
                <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] border ${getRoleBadge(selectedTicket.assignedRole)}`}>
                  {selectedTicket.assignedRole}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Status:</span>
                <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] border ${getStatusBadge(selectedTicket.status)}`}>
                  {selectedTicket.status}
                </span>
              </div>

              <div>
                <span className="text-slate-500 font-bold block mb-1">Subject:</span>
                <p className="font-semibold text-slate-800 bg-slate-50 p-2 rounded-xl border border-slate-100">
                  {selectedTicket.subject}
                </p>
              </div>

              <div>
                <span className="text-slate-500 font-bold block mb-1">Description:</span>
                <p className="text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100 leading-relaxed whitespace-pre-wrap">
                  {selectedTicket.description}
                </p>
              </div>

              {selectedTicket.resolutionNotes && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900">
                  <span className="font-bold block mb-1">Resolution Notes:</span>
                  <p className="text-xs">{selectedTicket.resolutionNotes}</p>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedTicket(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Administrative Action Modal (Status Update or Role Reassignment) */}
      {actionModalTicket && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Administrative Action: #{actionModalTicket.ticketNumber}
                </h3>
              </div>
              <button
                onClick={() => setActionModalTicket(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sub-Tabs: Update Status vs Reassign Role */}
            <div className="flex space-x-1 border-b border-slate-200">
              <button
                onClick={() => setActionType('status')}
                className={`pb-2 px-3 text-xs font-bold border-b-2 transition ${
                  actionType === 'status'
                    ? 'border-purple-600 text-purple-600'
                    : 'border-transparent text-slate-500'
                }`}
              >
                Resolve / Update Status
              </button>
              <button
                onClick={() => setActionType('assign')}
                className={`pb-2 px-3 text-xs font-bold border-b-2 transition ${
                  actionType === 'assign'
                    ? 'border-purple-600 text-purple-600'
                    : 'border-transparent text-slate-500'
                }`}
              >
                Reassign Role (Validated)
              </button>
            </div>

            {actionType === 'status' ? (
              <form onSubmit={handleStatusSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Target Status *</label>
                  <select
                    value={statusForm.status}
                    onChange={(e) => setStatusForm({ ...statusForm, status: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none bg-white font-medium"
                  >
                    <option value="UNDER_REVIEW">UNDER_REVIEW</option>
                    <option value="RESOLVED">RESOLVED</option>
                    <option value="CLOSED">CLOSED</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Resolution Notes {['RESOLVED', 'CLOSED'].includes(statusForm.status) ? '*' : '(Optional)'}
                  </label>
                  <textarea
                    rows={3}
                    required={['RESOLVED', 'CLOSED'].includes(statusForm.status)}
                    value={statusForm.resolutionNotes}
                    onChange={(e) => setStatusForm({ ...statusForm, resolutionNotes: e.target.value })}
                    placeholder="Provide official administrative resolution or update notes for applicant..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>

                <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setActionModalTicket(null)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold inline-flex items-center space-x-1.5"
                  >
                    {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Update Status</span>
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleAssignSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Reassign Assigned Role *</label>
                  <select
                    value={assignForm.assignedRole}
                    onChange={(e) => setAssignForm({ assignedRole: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none bg-white font-medium"
                  >
                    <option value="COLLEGE">COLLEGE (Institutional / Document issues)</option>
                    <option value="AUTHORITY">AUTHORITY (Department Scrutiny / Approval issues)</option>
                    <option value="ADMIN">ADMIN (System / Technical / Payment issues)</option>
                  </select>
                </div>

                <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setActionModalTicket(null)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold inline-flex items-center space-x-1.5"
                  >
                    {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Reassign</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
