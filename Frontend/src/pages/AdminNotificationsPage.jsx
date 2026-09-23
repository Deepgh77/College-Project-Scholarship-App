import React, { useState, useEffect } from 'react';
import { AdminLayout } from '../components/admin/AdminLayout';
import { api } from '../services/api';
import {
  Bell,
  Search,
  Filter,
  Loader2,
  X,
  Clock,
  CheckCircle2,
  User,
  ExternalLink,
} from 'lucide-react';

export function AdminNotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [isReadFilter, setIsReadFilter] = useState('ALL');

  useEffect(() => {
    loadNotifications();
  }, [page, categoryFilter, isReadFilter]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getAdminNotifications({
        page,
        limit: 15,
        category: categoryFilter !== 'ALL' ? categoryFilter : undefined,
        isRead: isReadFilter !== 'ALL' ? isReadFilter : undefined,
        search: search.trim() || undefined,
      });
      setNotifications(res.notifications || []);
      setTotal(res.total || 0);
      setTotalPages(res.totalPages || 1);
    } catch (err) {
      setError(err.message || 'Failed to load notifications.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    loadNotifications();
  };

  const getCategoryBadge = (cat) => {
    switch (cat) {
      case 'ACTION_REQUIRED':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'PAYMENT':
        return 'bg-teal-100 text-teal-800 border-teal-200';
      case 'GRIEVANCE':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'SYSTEM':
        return 'bg-slate-100 text-slate-800 border-slate-200';
      case 'STATUS_UPDATE':
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  return (
    <AdminLayout
      title="In-App Notification Dispatch Monitoring"
      subtitle="Track automated in-app alerts, status notifications, and student action required dispatches"
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
              placeholder="Search by title, message, or recipient email..."
              className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setPage(1);
            }}
            className="text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-700"
          >
            <option value="ALL">All Categories</option>
            <option value="ACTION_REQUIRED">ACTION_REQUIRED</option>
            <option value="STATUS_UPDATE">STATUS_UPDATE</option>
            <option value="PAYMENT">PAYMENT</option>
            <option value="GRIEVANCE">GRIEVANCE</option>
            <option value="SYSTEM">SYSTEM</option>
          </select>

          <select
            value={isReadFilter}
            onChange={(e) => {
              setIsReadFilter(e.target.value);
              setPage(1);
            }}
            className="text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-700"
          >
            <option value="ALL">All Read States</option>
            <option value="true">Read</option>
            <option value="false">Unread</option>
          </select>

          <button
            type="submit"
            className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition"
          >
            Filter
          </button>
        </form>
      </div>

      {/* Notifications Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-purple-600" />
            <p className="text-xs">Loading notification logs...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-20 text-center text-slate-400">
            <Bell className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm font-semibold text-slate-700">No notifications found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-bold text-[10px] tracking-wider">
                  <th className="py-3 px-4">Recipient</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Title & Content</th>
                  <th className="py-3 px-4">Read State</th>
                  <th className="py-3 px-4 text-right">Dispatched</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {notifications.map((n) => (
                  <tr key={n.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{n.user?.email}</div>
                      <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-slate-100 text-slate-700">
                        {n.user?.role}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${getCategoryBadge(
                          n.category
                        )}`}
                      >
                        {n.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 max-w-[340px]">
                      <div className="font-bold text-slate-900">{n.title}</div>
                      <p className="text-slate-600 text-[11px] mt-0.5 leading-normal">{n.message}</p>
                      {n.actionUrl && (
                        <span className="text-[10px] text-purple-600 font-mono block mt-1">
                          Action: {n.actionUrl}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          n.isRead
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      >
                        {n.isRead ? 'Read' : 'Unread'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {new Date(n.createdAt).toLocaleString('en-IN')}
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
            Total: <strong>{total}</strong> dispatched notifications
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
