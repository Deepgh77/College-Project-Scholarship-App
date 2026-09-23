import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import {
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Loader2,
  RefreshCw,
  Layers,
  FileCheck2,
  Building2,
  AlertCircle,
  Clock,
  ShieldCheck,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';

const NEUTRAL_SIMULATION_REASONS = [
  'Simulated disbursement exception',
  'Simulation processing could not be completed',
  'Simulated verification exception',
  'Administrative simulation exception',
];

export function AdminPaymentSimulationPage() {
  const [activeTab, setActiveTab] = useState('applications'); // 'applications' | 'batches'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Applications awaiting batching
  const [approvedApps, setApprovedApps] = useState([]);
  const [selectedAppIds, setSelectedAppIds] = useState([]);
  const [batchingDeptId, setBatchingDeptId] = useState('');
  const [academicYear, setAcademicYear] = useState('2024-2025');

  // Batches
  const [batches, setBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [batchModalOpen, setBatchModalOpen] = useState(false);

  // Exception Modal
  const [exceptionModalOpen, setExceptionModalOpen] = useState(false);
  const [exceptionRecordId, setExceptionRecordId] = useState(null);
  const [exceptionReason, setExceptionReason] = useState(NEUTRAL_SIMULATION_REASONS[0]);
  const [processingAction, setProcessingAction] = useState(false);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      if (activeTab === 'applications') {
        const res = await api.getAdminApprovedApplications({ academicYear });
        setApprovedApps(res.applications || []);
        setSelectedAppIds([]);
      } else {
        const res = await api.getAdminPaymentBatches({ academicYear });
        setBatches(res.batches || []);
      }
    } catch (err) {
      setError(err.message || 'Failed to load administrative payment data.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectApp = (id) => {
    setSelectedAppIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedAppIds.length === approvedApps.length) {
      setSelectedAppIds([]);
    } else {
      setSelectedAppIds(approvedApps.map((a) => a.id));
    }
  };

  const handleCreateBatch = async () => {
    if (selectedAppIds.length === 0) {
      setError('Please select at least one approved application to create a batch.');
      return;
    }

    try {
      setProcessingAction(true);
      setError(null);
      setSuccessMsg(null);

      // Find the departmentId of the selected applications
      const firstApp = approvedApps.find((a) => a.id === selectedAppIds[0]);
      const targetDeptId = firstApp?.scholarship?.department?.id;

      if (!targetDeptId) {
        throw new Error('Unable to resolve department for selected applications.');
      }

      // Ensure all selected applications belong to the same department
      const mismatch = approvedApps.find(
        (a) => selectedAppIds.includes(a.id) && a.scholarship?.department?.id !== targetDeptId
      );
      if (mismatch) {
        throw new Error('All applications in a single batch must belong to the same department.');
      }

      const res = await api.createAdminPaymentBatch({
        departmentId: targetDeptId,
        academicYear,
        applicationIds: selectedAppIds,
      });

      setSuccessMsg(res.message || 'Payment batch created successfully.');
      setActiveTab('batches');
    } catch (err) {
      setError(err.message || 'Failed to create payment batch.');
    } finally {
      setProcessingAction(false);
    }
  };

  const handleOpenBatchDetails = async (batchId) => {
    try {
      setLoading(true);
      const res = await api.getAdminPaymentBatchById(batchId);
      setSelectedBatch(res.batch);
      setBatchModalOpen(true);
    } catch (err) {
      setError(err.message || 'Failed to load batch details.');
    } finally {
      setLoading(false);
    }
  };

  const handleInitiateBatch = async (batchId) => {
    try {
      setProcessingAction(true);
      setError(null);
      const res = await api.initiateAdminPaymentBatch(batchId);
      setSuccessMsg(res.message);
      if (batchModalOpen) {
        setSelectedBatch(res.batch);
      }
      loadData();
    } catch (err) {
      setError(err.message || 'Failed to initiate payment simulation.');
    } finally {
      setProcessingAction(false);
    }
  };

  const handleDisburseBatch = async (batchId) => {
    try {
      setProcessingAction(true);
      setError(null);
      const res = await api.disburseAdminPaymentBatch(batchId);
      setSuccessMsg(res.message);
      if (batchModalOpen) {
        setSelectedBatch(res.batch);
      }
      loadData();
    } catch (err) {
      setError(err.message || 'Failed to complete disbursement simulation.');
    } finally {
      setProcessingAction(false);
    }
  };

  const handleOpenExceptionModal = (recordId) => {
    setExceptionRecordId(recordId);
    setExceptionReason(NEUTRAL_SIMULATION_REASONS[0]);
    setExceptionModalOpen(true);
  };

  const handleTriggerException = async () => {
    if (!exceptionRecordId) return;

    try {
      setProcessingAction(true);
      setError(null);
      const res = await api.failAdminPaymentRecord(exceptionRecordId, {
        failureReason: exceptionReason,
      });
      setSuccessMsg(res.message);
      setExceptionModalOpen(false);

      if (selectedBatch) {
        const refreshed = await api.getAdminPaymentBatchById(selectedBatch.id);
        setSelectedBatch(refreshed.batch);
      }
      loadData();
    } catch (err) {
      setError(err.message || 'Failed to record simulated exception.');
    } finally {
      setProcessingAction(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-700 to-emerald-800 text-white flex items-center justify-center shadow-xs">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-base font-bold text-slate-900 leading-tight">
                  Administrative Payment Simulation Desk
                </h1>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200 uppercase tracking-wide">
                  ADMIN DESK
                </span>
              </div>
              <p className="text-xs text-slate-500 flex items-center space-x-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 inline" />
                <span>Scholarship Benefit Disbursement Simulation</span>
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={loadData}
              disabled={loading}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer shadow-2xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-teal-600' : ''}`} />
              <span>Refresh</span>
            </button>
            <Link
              to="/authority/dashboard"
              className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
            >
              <span>Authority Desk</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Messages */}
        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between text-rose-800 text-xs font-medium">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError(null)} className="font-bold underline">
              Dismiss
            </button>
          </div>
        )}

        {successMsg && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-emerald-800 text-xs font-medium">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg(null)} className="font-bold underline">
              Dismiss
            </button>
          </div>
        )}

        {/* Tab Switcher & Batch Action Bar */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setActiveTab('applications')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                activeTab === 'applications'
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Sanctioned Applications ({approvedApps.length})
            </button>
            <button
              onClick={() => setActiveTab('batches')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                activeTab === 'batches'
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Disbursement Batches ({batches.length})
            </button>
          </div>

          {activeTab === 'applications' && (
            <div className="flex items-center space-x-2">
              <button
                onClick={handleCreateBatch}
                disabled={selectedAppIds.length === 0 || processingAction}
                className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold shadow-xs transition cursor-pointer"
              >
                {processingAction ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Layers className="w-4 h-4" />
                )}
                <span>Prepare Simulation Batch ({selectedAppIds.length})</span>
              </button>
            </div>
          )}
        </div>

        {/* Tab 1: Sanctioned Applications Table */}
        {activeTab === 'applications' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            {loading ? (
              <div className="py-16 text-center space-y-3">
                <Loader2 className="w-8 h-8 text-teal-600 animate-spin mx-auto" />
                <p className="text-xs font-medium text-slate-500">Querying approved applications...</p>
              </div>
            ) : approvedApps.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4 w-10">
                        <input
                          type="checkbox"
                          checked={
                            selectedAppIds.length === approvedApps.length && approvedApps.length > 0
                          }
                          onChange={handleSelectAll}
                          className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                        />
                      </th>
                      <th className="py-3 px-4">Application ARN / AY</th>
                      <th className="py-3 px-4">Student Name</th>
                      <th className="py-3 px-4">Department & Scheme</th>
                      <th className="py-3 px-4">Institution</th>
                      <th className="py-3 px-4">Sanction Amount</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {approvedApps.map((app) => {
                      const isSelected = selectedAppIds.includes(app.id);

                      return (
                        <tr
                          key={app.id}
                          className={`hover:bg-slate-50/80 transition ${
                            isSelected ? 'bg-teal-50/30' : ''
                          }`}
                        >
                          <td className="py-3.5 px-4">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleSelectApp(app.id)}
                              className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                            />
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-mono font-bold text-teal-800">
                              {app.applicationNumber}
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              AY {app.academicYear}
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900">{app.student?.fullName}</div>
                            <div className="text-[11px] text-slate-500">
                              {app.student?.user?.email}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 max-w-xs">
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                              {app.scholarship?.department?.code}
                            </span>
                            <div className="font-semibold text-slate-800 truncate mt-0.5" title={app.scholarship?.name}>
                              {app.scholarship?.name}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 max-w-xs">
                            <div className="font-semibold text-slate-800 truncate" title={app.student?.college?.name}>
                              {app.student?.college?.name}
                            </div>
                            <div className="text-[10px] font-mono text-slate-400">
                              {app.student?.college?.code}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 font-bold text-teal-800">
                            ₹{Number(app.scholarship?.benefitAmount || 0).toLocaleString('en-IN')}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              Approved
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-16 text-center space-y-3">
                <FileCheck2 className="w-10 h-10 text-slate-300 mx-auto" />
                <h4 className="text-sm font-bold text-slate-800">No Approved Applications Awaiting Batching</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  All sanctioned applications have already been included in simulation batches or none have been approved yet.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Disbursement Batches Table */}
        {activeTab === 'batches' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            {loading ? (
              <div className="py-16 text-center space-y-3">
                <Loader2 className="w-8 h-8 text-teal-600 animate-spin mx-auto" />
                <p className="text-xs font-medium text-slate-500">Loading disbursement batches...</p>
              </div>
            ) : batches.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Batch Number / AY</th>
                      <th className="py-3 px-4">Department</th>
                      <th className="py-3 px-4">Applications</th>
                      <th className="py-3 px-4">Total Amount</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Created Date</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {batches.map((batch) => {
                      const badgeClass =
                        batch.status === 'DISBURSED'
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                          : batch.status === 'FAILED'
                          ? 'bg-rose-100 text-rose-800 border-rose-200'
                          : 'bg-amber-100 text-amber-800 border-amber-200';

                      return (
                        <tr key={batch.id} className="hover:bg-slate-50/80 transition">
                          <td className="py-3.5 px-4">
                            <div className="font-mono font-bold text-teal-800">
                              {batch.batchNumber}
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              AY {batch.academicYear}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-slate-800">
                            {batch.department?.name} ({batch.department?.code})
                          </td>
                          <td className="py-3.5 px-4 font-bold text-slate-700">
                            {batch.totalApplications}
                          </td>
                          <td className="py-3.5 px-4 font-bold text-teal-800">
                            ₹{Number(batch.totalAmount || 0).toLocaleString('en-IN')}
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border ${badgeClass}`}
                            >
                              {batch.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-600">
                            {new Date(batch.createdAt).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </td>
                          <td className="py-3.5 px-4 text-right space-x-2">
                            <button
                              onClick={() => handleOpenBatchDetails(batch.id)}
                              className="inline-flex items-center space-x-1 px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition cursor-pointer"
                            >
                              <span>Inspect Batch</span>
                            </button>
                            {batch.status === 'PROCESSING' && !batch.initiatedAt && (
                              <button
                                onClick={() => handleInitiateBatch(batch.id)}
                                disabled={processingAction}
                                className="inline-flex items-center space-x-1 px-3 py-1 rounded-lg bg-teal-700 hover:bg-teal-800 text-white font-semibold text-xs transition cursor-pointer shadow-2xs"
                              >
                                <span>Initiate Simulation</span>
                              </button>
                            )}
                            {batch.status === 'PROCESSING' && batch.initiatedAt && (
                              <button
                                onClick={() => handleDisburseBatch(batch.id)}
                                disabled={processingAction}
                                className="inline-flex items-center space-x-1 px-3 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs transition cursor-pointer shadow-2xs"
                              >
                                <span>Simulate Disbursement</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-16 text-center space-y-3">
                <Layers className="w-10 h-10 text-slate-300 mx-auto" />
                <h4 className="text-sm font-bold text-slate-800">No Payment Batches Found</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Switch to the Sanctioned Applications tab to prepare your first administrative payment simulation batch.
                </p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Batch Details Modal */}
      {batchModalOpen && selectedBatch && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-4xl w-full shadow-xl space-y-6 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Batch: {selectedBatch.batchNumber}
                </h3>
                <p className="text-xs text-slate-500">
                  Department: {selectedBatch.department?.name} ({selectedBatch.department?.code}) • AY {selectedBatch.academicYear}
                </p>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold border ${
                  selectedBatch.status === 'DISBURSED'
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                    : selectedBatch.status === 'FAILED'
                    ? 'bg-rose-100 text-rose-800 border-rose-200'
                    : 'bg-amber-100 text-amber-800 border-amber-200'
                }`}
              >
                {selectedBatch.status}
              </span>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div className="text-xs text-slate-600">
                Total: <strong>{selectedBatch.records?.length || 0}</strong> applications • Benefit Sum: <strong>₹{Number(selectedBatch.totalAmount || 0).toLocaleString('en-IN')}</strong>
              </div>
              <div className="flex items-center space-x-2">
                {selectedBatch.status === 'PROCESSING' && !selectedBatch.initiatedAt && (
                  <button
                    onClick={() => handleInitiateBatch(selectedBatch.id)}
                    disabled={processingAction}
                    className="px-3.5 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer"
                  >
                    Initiate Simulation
                  </button>
                )}
                {selectedBatch.status === 'PROCESSING' && selectedBatch.initiatedAt && (
                  <button
                    onClick={() => handleDisburseBatch(selectedBatch.id)}
                    disabled={processingAction}
                    className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer"
                  >
                    Simulate Disbursement
                  </button>
                )}
              </div>
            </div>

            {/* Records Table */}
            <div className="flex-1 overflow-y-auto border border-slate-100 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[10px] sticky top-0">
                  <tr>
                    <th className="py-2.5 px-3">Student Name</th>
                    <th className="py-2.5 px-3">Application ARN</th>
                    <th className="py-2.5 px-3">Amount</th>
                    <th className="py-2.5 px-3">Simulation Reference</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Exception Simulation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedBatch.records?.map((rec) => (
                    <tr key={rec.id} className="hover:bg-slate-50/60">
                      <td className="py-2.5 px-3 font-semibold text-slate-900">
                        {rec.student?.fullName}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-teal-800">
                        {rec.application?.applicationNumber}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-800">
                        ₹{Number(rec.amount || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-700">
                        {rec.simulationReference || 'Pending'}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            rec.status === 'DISBURSED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : rec.status === 'UNDISBURSED'
                              ? 'bg-rose-100 text-rose-800'
                              : rec.status === 'INITIATED'
                              ? 'bg-cyan-100 text-cyan-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {rec.status}
                        </span>
                        {rec.failureReason && (
                          <div className="text-[10px] text-rose-700 mt-0.5">
                            {rec.failureReason}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {['PROCESSING', 'INITIATED'].includes(rec.status) && (
                          <button
                            onClick={() => handleOpenExceptionModal(rec.id)}
                            className="text-[11px] font-bold text-rose-600 hover:text-rose-800 hover:underline cursor-pointer"
                          >
                            Simulate Exception
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setBatchModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Exception Trigger Modal */}
      {exceptionModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
              Simulate Disbursement Exception
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Select a neutral academic simulation reason to mark this student payment record as UNDISBURSED.
            </p>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Simulation Exception Reason:
              </label>
              <select
                value={exceptionReason}
                onChange={(e) => setExceptionReason(e.target.value)}
                className="w-full py-2 px-3 text-xs rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-rose-500 font-medium"
              >
                {NEUTRAL_SIMULATION_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                onClick={() => setExceptionModalOpen(false)}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleTriggerException}
                disabled={processingAction}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
              >
                {processingAction ? 'Recording...' : 'Record Exception'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
