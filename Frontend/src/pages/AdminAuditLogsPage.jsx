import React, { useState, useEffect } from 'react';
import { AdminLayout } from '../components/admin/AdminLayout';
import { api } from '../services/api';
import {
  History,
  Search,
  Filter,
  Loader2,
  X,
  Clock,
  ArrowRight,
  Shield,
  FileText,
} from 'lucide-react';

export function AdminAuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [roleFilter, setRoleFilter] = useState('ALL');

  useEffect(() => {
    loadAuditLogs();
  }, [page, actionFilter, roleFilter]);

  const loadAuditLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getAdminAuditLogs({
        page,
        limit: 20,
        action: actionFilter !== 'ALL' ? actionFilter : undefined,
        actorRole: roleFilter !== 'ALL' ? roleFilter : undefined,
        search: search.trim() || undefined,
      });
      setLogs(res.logs || []);
      setTotal(res.total || 0);
      setTotalPages(res.totalPages || 1);
    } catch (err) {
      setError(err.message || 'Failed to load system audit logs.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    loadAuditLogs();
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
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'SYSTEM':
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <AdminLayout
      title="Immutable System Audit Trail"
      subtitle="Complete chronological timeline of all lifecycle transitions, verification actions, and simulation events"
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

      {/* Filter / Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-2.5">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by ARN, actor email, or remarks..."
              className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPage(1);
            }}
            className="text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-700"
          >
            <option value="ALL">All Actor Roles</option>
            <option value="STUDENT">STUDENT</option>
            <option value="COLLEGE">COLLEGE</option>
            <option value="AUTHORITY">AUTHORITY</option>
            <option value="ADMIN">ADMIN</option>
            <option value="SYSTEM">SYSTEM</option>
          </select>

          <button
            type="submit"
            className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition"
          >
            Filter
          </button>
        </form>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-purple-600" />
            <p className="text-xs">Loading immutable audit logs...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="py-20 text-center text-slate-400">
            <History className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm font-semibold text-slate-700">No audit records found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-bold text-[10px] tracking-wider">
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Application</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Status Transition</th>
                  <th className="py-3 px-4">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono font-bold text-purple-900 block">
                        {log.application?.applicationNumber || 'DRAFT'}
                      </span>
                      <span className="text-[10px] text-slate-400 block">
                        {log.application?.student?.fullName}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{log.actorUser?.email}</div>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border mt-0.5 ${getRoleBadge(
                          log.actorRole
                        )}`}
                      >
                        {log.actorRole}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200/60">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-500">{log.previousStatus || 'INIT'}</span>
                        <ArrowRight className="w-3 h-3 text-slate-400" />
                        <span className="font-bold text-slate-900">{log.newStatus}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 max-w-[280px]">
                      <p className="text-slate-700 text-[11px] leading-relaxed">
                        {log.remarks || <span className="text-slate-300 italic">&mdash;</span>}
                      </p>
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
            Total: <strong>{total}</strong> logged events
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
    </AdminLayout>
  );
}
