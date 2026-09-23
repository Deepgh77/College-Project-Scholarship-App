import React, { useState, useEffect } from 'react';
import { AdminLayout } from '../components/admin/AdminLayout';
import { api } from '../services/api';
import {
  FileSpreadsheet,
  Search,
  Filter,
  Eye,
  Loader2,
  X,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Building2,
  GraduationCap,
  FileText,
  CreditCard,
  ShieldCheck,
  History,
  FileCheck2,
} from 'lucide-react';

export function AdminApplicationsPage() {
  const [applications, setApplications] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [deptFilter, setDeptFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [departments, setDepartments] = useState([]);

  // Detail Drawer / Modal
  const [selectedApp, setSelectedApp] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [activeInspectorTab, setActiveInspectorTab] = useState('snapshot'); // 'snapshot' | 'reviews' | 'documents' | 'audit' | 'payment'

  useEffect(() => {
    loadApplications();
  }, [page, statusFilter, deptFilter, yearFilter]);

  useEffect(() => {
    loadDepartments();
  }, []);

  const loadDepartments = async () => {
    try {
      const res = await api.getAdminDepartments({});
      setDepartments(res.departments || []);
    } catch (err) {
      console.error('Failed to load departments', err);
    }
  };

  const loadApplications = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getAdminApplications({
        page,
        limit: 15,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        departmentId: deptFilter || undefined,
        academicYear: yearFilter || undefined,
        search: search.trim() || undefined,
      });
      setApplications(res.applications || []);
      setTotal(res.total || 0);
      setTotalPages(res.totalPages || 1);
    } catch (err) {
      setError(err.message || 'Failed to load applications.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    loadApplications();
  };

  const openApplicationDetails = async (appId) => {
    try {
      setDetailLoading(true);
      const res = await api.getAdminApplicationDetails(appId);
      setSelectedApp(res.application);
      setActiveInspectorTab('snapshot');
    } catch (err) {
      setError(err.message || 'Failed to load application details.');
    } finally {
      setDetailLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'APPROVED':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'DISBURSED':
        return 'bg-teal-100 text-teal-800 border-teal-200';
      case 'COLLEGE_REJECTED':
      case 'AUTHORITY_REJECTED':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'COLLEGE_SENT_BACK':
      case 'AUTHORITY_SENT_BACK':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'UNDISBURSED':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'PAYMENT_PROCESSING':
      case 'PAYMENT_INITIATED':
        return 'bg-cyan-100 text-cyan-800 border-cyan-200';
      case 'FORWARDED_TO_AUTHORITY':
      case 'UNDER_AUTHORITY_REVIEW':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      default:
        return 'bg-blue-50 text-blue-800 border-blue-200';
    }
  };

  return (
    <AdminLayout
      title="System-Wide Application Monitoring"
      subtitle="Read-only supervisory inspection of scholarship applications across all colleges, departments, and stages"
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
              placeholder="Search by ARN, student name, or email..."
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
            <option value="SUBMITTED">SUBMITTED</option>
            <option value="UNDER_COLLEGE_REVIEW">UNDER_COLLEGE_REVIEW</option>
            <option value="COLLEGE_SENT_BACK">COLLEGE_SENT_BACK</option>
            <option value="COLLEGE_REJECTED">COLLEGE_REJECTED</option>
            <option value="FORWARDED_TO_AUTHORITY">FORWARDED_TO_AUTHORITY</option>
            <option value="UNDER_AUTHORITY_REVIEW">UNDER_AUTHORITY_REVIEW</option>
            <option value="AUTHORITY_SENT_BACK">AUTHORITY_SENT_BACK</option>
            <option value="AUTHORITY_REJECTED">AUTHORITY_REJECTED</option>
            <option value="RESUBMITTED_TO_COLLEGE">RESUBMITTED_TO_COLLEGE</option>
            <option value="APPROVED">APPROVED</option>
            <option value="PAYMENT_PROCESSING">PAYMENT_PROCESSING</option>
            <option value="PAYMENT_INITIATED">PAYMENT_INITIATED</option>
            <option value="DISBURSED">DISBURSED</option>
            <option value="UNDISBURSED">UNDISBURSED</option>
            <option value="CANCELLED">CANCELLED</option>
            <option value="RIGHT_TO_GIVE_UP">RIGHT_TO_GIVE_UP</option>
          </select>

          <select
            value={deptFilter}
            onChange={(e) => {
              setDeptFilter(e.target.value);
              setPage(1);
            }}
            className="text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-700"
          >
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.code}
              </option>
            ))}
          </select>

          <button
            type="submit"
            className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition"
          >
            Filter
          </button>
        </form>
      </div>

      {/* Applications Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-purple-600" />
            <p className="text-xs">Loading application records...</p>
          </div>
        ) : applications.length === 0 ? (
          <div className="py-20 text-center text-slate-400">
            <FileSpreadsheet className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm font-semibold text-slate-700">No applications match your criteria</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-bold text-[10px] tracking-wider">
                  <th className="py-3 px-4">ARN</th>
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">College</th>
                  <th className="py-3 px-4">Scheme & Dept</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Payment Ref</th>
                  <th className="py-3 px-4 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {applications.map((app) => (
                  <tr key={app.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4">
                      <span className="font-mono font-bold text-purple-900">
                        {app.applicationNumber || 'DRAFT'}
                      </span>
                      <span className="text-[10px] text-slate-400 block font-mono">
                        AY {app.academicYear}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">
                        {app.student?.fullName || 'N/A'}
                      </div>
                      <span className="text-[10px] text-slate-500 block">
                        {app.student?.user?.email}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-700 max-w-[180px] truncate" title={app.student?.college?.name}>
                      {app.student?.college?.name || 'Unlinked'}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-800 max-w-[200px] truncate" title={app.scholarship?.name}>
                        {app.scholarship?.name}
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono block">
                        {app.scholarship?.department?.code}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadge(
                          app.status
                        )}`}
                      >
                        {app.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-600">
                      {app.paymentRecord?.simulationReference ? (
                        <span className="text-teal-800 font-bold">
                          {app.paymentRecord.simulationReference}
                        </span>
                      ) : app.paymentRecord ? (
                        <span className="text-slate-400">{app.paymentRecord.status}</span>
                      ) : (
                        <span className="text-slate-300">&mdash;</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => openApplicationDetails(app.id)}
                        className="p-1.5 rounded-lg border border-slate-200 text-purple-700 bg-purple-50/50 hover:bg-purple-100 transition shadow-2xs"
                        title="Inspect full lifecycle"
                      >
                        <Eye className="w-3.5 h-3.5" />
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
            Total: <strong>{total}</strong> applications
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

      {/* Read-Only Application Inspector Drawer / Modal (Correction #3) */}
      {selectedApp && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-3xl w-full p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-base font-black text-purple-900">
                    {selectedApp.applicationNumber || 'DRAFT'}
                  </span>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${getStatusBadge(
                      selectedApp.status
                    )}`}
                  >
                    {selectedApp.status}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {selectedApp.scholarship?.name} &bull; AY {selectedApp.academicYear}
                </p>
              </div>
              <button
                onClick={() => setSelectedApp(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Read-Only Supervisory Notice (Correction #3) */}
            <div className="p-2.5 rounded-xl bg-purple-50/60 border border-purple-200 text-xs text-purple-800 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-purple-600 shrink-0" />
              <span>
                <strong>Supervisory Read-Only View:</strong> Administrators monitor and inspect application data, audit trails, and payment simulation state. Review and verification workflows remain exclusively with College and Authority officers.
              </span>
            </div>

            {/* Quick Profile Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Student</span>
                <span className="font-bold text-slate-900">{selectedApp.student?.fullName}</span>
                <span className="text-[11px] text-slate-500 block">{selectedApp.student?.user?.email}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Category / Income</span>
                <span className="font-bold text-slate-800">{selectedApp.student?.category || 'N/A'}</span>
                <span className="text-[11px] text-slate-500 block">
                  ₹{Number(selectedApp.student?.annualFamilyIncome || 0).toLocaleString('en-IN')}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Enrolled College</span>
                <span className="font-bold text-slate-800">{selectedApp.student?.college?.name}</span>
                <span className="text-[11px] text-slate-500 block">{selectedApp.student?.courseName}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Submitted</span>
                <span className="font-mono text-slate-800">
                  {selectedApp.submittedAt
                    ? new Date(selectedApp.submittedAt).toLocaleDateString('en-IN')
                    : 'Draft'}
                </span>
              </div>
            </div>

            {/* Inspector Tabs */}
            <div className="border-b border-slate-200">
              <div className="flex space-x-2">
                <button
                  onClick={() => setActiveInspectorTab('snapshot')}
                  className={`pb-2 px-3 text-xs font-bold border-b-2 transition ${
                    activeInspectorTab === 'snapshot'
                      ? 'border-purple-600 text-purple-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Frozen Snapshot
                </button>
                <button
                  onClick={() => setActiveInspectorTab('documents')}
                  className={`pb-2 px-3 text-xs font-bold border-b-2 transition ${
                    activeInspectorTab === 'documents'
                      ? 'border-purple-600 text-purple-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Attached Documents ({selectedApp.documentSnapshots?.length || 0})
                </button>
                <button
                  onClick={() => setActiveInspectorTab('reviews')}
                  className={`pb-2 px-3 text-xs font-bold border-b-2 transition ${
                    activeInspectorTab === 'reviews'
                      ? 'border-purple-600 text-purple-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Reviews & Corrections ({selectedApp.reviews?.length || 0})
                </button>
                <button
                  onClick={() => setActiveInspectorTab('payment')}
                  className={`pb-2 px-3 text-xs font-bold border-b-2 transition ${
                    activeInspectorTab === 'payment'
                      ? 'border-purple-600 text-purple-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Payment State
                </button>
                <button
                  onClick={() => setActiveInspectorTab('audit')}
                  className={`pb-2 px-3 text-xs font-bold border-b-2 transition ${
                    activeInspectorTab === 'audit'
                      ? 'border-purple-600 text-purple-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Audit Trail ({selectedApp.auditLogs?.length || 0})
                </button>
              </div>
            </div>

            {/* Tab 1: Frozen Snapshot */}
            {activeInspectorTab === 'snapshot' && (
              <div className="space-y-3 text-xs">
                {selectedApp.snapshots?.length === 0 ? (
                  <p className="text-slate-400 py-6 text-center italic">No snapshot recorded (application is in DRAFT state).</p>
                ) : (
                  <div className="space-y-3">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">
                      Cycle {selectedApp.snapshots[0].cycleNumber} Frozen Data
                    </span>
                    <pre className="p-4 rounded-xl bg-slate-900 text-slate-100 font-mono text-[11px] overflow-x-auto max-h-72 scrollbar-thin">
                      {JSON.stringify(selectedApp.snapshots[0].snapshotDataJson, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Attached Documents */}
            {activeInspectorTab === 'documents' && (
              <div className="space-y-2 text-xs">
                {selectedApp.documentSnapshots?.length === 0 ? (
                  <p className="text-slate-400 py-6 text-center italic">No document snapshots attached.</p>
                ) : (
                  selectedApp.documentSnapshots.map((ds) => (
                    <div key={ds.id} className="p-3 rounded-xl border border-slate-200 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-slate-900 block">{ds.documentType}</span>
                        <span className="text-[11px] text-slate-500">
                          {ds.documentVersion?.originalFilename} &bull; v{ds.documentVersion?.versionNumber} &bull;{' '}
                          {(Number(ds.documentVersion?.fileSizeBytes || 0) / 1024).toFixed(1)} KB
                        </span>
                      </div>
                      <a
                        href={`/api/authority/applications/${selectedApp.id}/documents/${ds.documentVersionId}/preview`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 bg-slate-50 hover:bg-slate-100 font-bold"
                      >
                        Preview
                      </a>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Tab 3: Reviews & Corrections */}
            {activeInspectorTab === 'reviews' && (
              <div className="space-y-4 text-xs">
                {selectedApp.reviews?.length === 0 ? (
                  <p className="text-slate-400 py-6 text-center italic">No official reviews conducted yet.</p>
                ) : (
                  selectedApp.reviews.map((rev) => (
                    <div key={rev.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{rev.reviewerRole} Scrutiny</span>
                          <span className="font-mono text-purple-700 font-bold">Cycle {rev.cycleNumber}</span>
                        </div>
                        <span className="font-mono text-[10px] text-slate-400">
                          {new Date(rev.reviewedAt).toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500 font-medium">Decision:</span>
                        <span className="font-bold text-slate-900">{rev.decision}</span>
                      </div>
                      <p className="text-slate-700 italic">"{rev.overallRemarks}"</p>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Tab 4: Payment State */}
            {activeInspectorTab === 'payment' && (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-3">
                {selectedApp.paymentRecord ? (
                  <>
                    <div className="flex justify-between py-1 border-b border-slate-200">
                      <span className="text-slate-500">Simulation Status:</span>
                      <span className="font-bold text-slate-900">{selectedApp.paymentRecord.status}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200">
                      <span className="text-slate-500">Simulation Reference:</span>
                      <span className="font-mono font-bold text-teal-800">
                        {selectedApp.paymentRecord.simulationReference || 'Pending Initiation'}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200">
                      <span className="text-slate-500">Disbursement Batch:</span>
                      <span className="font-mono text-slate-800">
                        {selectedApp.paymentRecord.batch?.batchNumber || 'Pending Batching'}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200">
                      <span className="text-slate-500">Disbursed Timestamp:</span>
                      <span className="font-mono text-slate-800">
                        {selectedApp.paymentRecord.disbursedAt
                          ? new Date(selectedApp.paymentRecord.disbursedAt).toLocaleString('en-IN')
                          : 'Awaiting Simulation'}
                      </span>
                    </div>
                    {selectedApp.paymentRecord.failureReason && (
                      <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800">
                        <strong>Simulation Exception:</strong> {selectedApp.paymentRecord.failureReason}
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-slate-400 py-6 text-center italic">
                    No simulated payment record exists for this application yet.
                  </p>
                )}
              </div>
            )}

            {/* Tab 5: Audit Trail */}
            {activeInspectorTab === 'audit' && (
              <div className="space-y-2 text-xs">
                {selectedApp.auditLogs?.map((log) => (
                  <div key={log.id} className="p-3 rounded-xl border border-slate-100 bg-slate-50 flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold font-mono text-purple-800">{log.action}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-slate-200 text-slate-700">
                          {log.actorRole}
                        </span>
                      </div>
                      <p className="text-slate-600 mt-1">{log.remarks}</p>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 shrink-0">
                      {new Date(log.timestamp).toLocaleString('en-IN')}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedApp(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
