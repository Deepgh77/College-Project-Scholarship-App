import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import { DocumentUploadModal } from '../components/DocumentUploadModal';
import { DocumentPreviewModal } from '../components/DocumentPreviewModal';
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  ShieldCheck,
  Building2,
  User,
  ExternalLink,
  Eye,
  AlertCircle,
  Loader2,
  Check,
  Send,
  Download,
  RotateCcw,
  Copy,
  ChevronRight,
  Info,
  XCircle,
  HelpCircle,
} from 'lucide-react';

const STAGES = [
  { number: 1, label: 'Submission', desc: 'Application Form' },
  { number: 2, label: 'College Scrutiny', desc: 'Verification Desk' },
  { number: 3, label: 'Department Scrutiny', desc: 'State Sanction Desk' },
  { number: 4, label: 'Sanction & Disbursement', desc: 'Payment Processing' },
];

export function ApplicationTrackerPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [tracking, setTracking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [copied, setCopied] = useState(false);

  // Correction Resolution States
  const [selectedResolutions, setSelectedResolutions] = useState({}); // { [correctionId]: { versionId, fieldValue, responseText } }
  const [resolvingId, setResolvingId] = useState(null);
  const [vaultDocs, setVaultDocs] = useState([]);
  const [availableTypes, setAvailableTypes] = useState([]);
  const [resubmitting, setResubmitting] = useState(false);
  const [confirmationAccepted, setConfirmationAccepted] = useState(false);

  // Modals
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadDocType, setUploadDocType] = useState(null);
  const [uploadTargetCorrId, setUploadTargetCorrId] = useState(null);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [isGiveUpModalOpen, setIsGiveUpModalOpen] = useState(false);
  const [giveUpReason, setGiveUpReason] = useState('');

  useEffect(() => {
    fetchTrackingData();
  }, [id]);

  const fetchTrackingData = async () => {
    setLoading(true);
    setError('');
    try {
      const [trackRes, docsRes, typesRes] = await Promise.all([
        api.getApplicationTracking(id),
        api.getMyDocuments().catch(() => ({ documents: [] })),
        api.getDocumentTypes().catch(() => ({ types: [] })),
      ]);

      setTracking(trackRes.tracking);
      setVaultDocs(docsRes.documents || []);
      setAvailableTypes(typesRes.types || []);

      // If application is in DRAFT status, redirect to wizard
      if (trackRes.tracking.status === 'DRAFT') {
        navigate(`/applications/${id}/wizard`, { replace: true });
      }
    } catch (err) {
      setError(err.message || 'Failed to load application tracking information.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyArn = () => {
    if (!tracking?.applicationNumber) return;
    navigator.clipboard.writeText(tracking.applicationNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleResolutionFieldChange = (correctionId, key, value) => {
    setSelectedResolutions((prev) => ({
      ...prev,
      [correctionId]: {
        ...prev[correctionId],
        [key]: value,
      },
    }));
  };

  const handleUploadSuccess = async (uploadRes) => {
    setIsUploadModalOpen(false);
    try {
      const docsRes = await api.getMyDocuments().catch(() => ({ documents: [] }));
      const updatedDocs = docsRes.documents || [];
      setVaultDocs(updatedDocs);

      if (uploadTargetCorrId && uploadDocType) {
        const doc = updatedDocs.find((d) => d.documentType === uploadDocType);
        const versions = doc?.history || doc?.versions || [];
        if (versions.length > 0) {
          const latest = versions.reduce(
            (max, v) => (v.versionNumber > (max?.versionNumber || 0) ? v : max),
            doc?.currentVersion || versions[0]
          );
          if (latest?.id) {
            handleResolutionFieldChange(uploadTargetCorrId, 'versionId', latest.id);
          }
        } else if (uploadRes?.document?.currentVersion?.id) {
          handleResolutionFieldChange(
            uploadTargetCorrId,
            'versionId',
            uploadRes.document.currentVersion.id
          );
        }
      }
    } finally {
      setUploadTargetCorrId(null);
    }
  };

  const handleMarkResolved = async (correction) => {
    setResolvingId(correction.id);
    setError('');
    setSuccessMsg('');

    try {
      const resState = selectedResolutions[correction.id] || {};
      const payload = {
        studentResponseText: resState.responseText || 'Correction resolved by applicant.',
        resolvedDocumentVersionId: resState.versionId || null,
        fieldValue: resState.fieldValue !== undefined ? resState.fieldValue : undefined,
      };

      await api.resolveCorrection(tracking.id, correction.id, payload);
      setSuccessMsg('Correction marked as resolved!');
      setTimeout(() => setSuccessMsg(''), 3000);
      await fetchTrackingData();
    } catch (err) {
      setError(err.message || 'Failed to resolve correction item.');
    } finally {
      setResolvingId(null);
    }
  };

  const handleResubmitApplication = async () => {
    if (!confirmationAccepted) {
      setError('You must confirm that you have resolved the listed corrections before resubmitting.');
      return;
    }

    setResubmitting(true);
    setError('');
    setSuccessMsg('');

    try {
      const res = await api.resubmitApplication(tracking.id, {
        confirmationAccepted: true,
      });

      setSuccessMsg(res.message || 'Application resubmitted successfully!');
      setTimeout(() => setSuccessMsg(''), 4000);
      await fetchTrackingData();
    } catch (err) {
      setError(err.message || 'Failed to resubmit application.');
    } finally {
      setResubmitting(false);
    }
  };

  const handleCancelApplication = async () => {
    try {
      await api.cancelApplication(tracking.id, { reason: cancelReason });
      setIsCancelModalOpen(false);
      setSuccessMsg('Application cancelled.');
      await fetchTrackingData();
    } catch (err) {
      setError(err.message || 'Failed to cancel application.');
    }
  };

  const handleGiveUpBenefit = async () => {
    try {
      await api.exerciseRightToGiveUp(tracking.id, { reason: giveUpReason });
      setIsGiveUpModalOpen(false);
      setSuccessMsg('Right to Give Up registered.');
      await fetchTrackingData();
    } catch (err) {
      setError(err.message || 'Failed to register Right to Give Up.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto text-indigo-600" />
          <p className="text-xs font-semibold text-slate-500">Loading application tracking information...</p>
        </div>
      </div>
    );
  }

  if (!tracking) {
    return (
      <div className="min-h-screen bg-slate-50 p-8 flex items-center justify-center">
        <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center max-w-md shadow-xs">
          <AlertCircle className="w-10 h-10 text-rose-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-900 mb-1">Application Not Found</h3>
          <p className="text-xs text-slate-500 mb-6">
            The requested application does not exist or you do not have permission to view it.
          </p>
          <Link
            to="/applications"
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl"
          >
            Back to My Applications
          </Link>
        </div>
      </div>
    );
  }

  const meta = tracking.statusMeta || {};
  const currentStageNumber = meta.stageNumber || 1;
  const isActionRequired = tracking.hasActionRequired;
  const openCorrections = (tracking.correctionRequests || []).filter(
    (c) => c.status === 'OPEN' || c.status === 'RE_FLAGGED'
  );
  const allCorrectionsResolved =
    tracking.correctionRequests &&
    tracking.correctionRequests.length > 0 &&
    openCorrections.length === 0;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      {/* Top Navigation */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-4 overflow-hidden">
            <Link
              to="/applications"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">My Applications</span>
            </Link>
            <span className="text-slate-300 hidden sm:inline">|</span>
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <div className="truncate">
                <h1 className="text-xs sm:text-sm font-bold text-slate-900 leading-tight truncate">
                  Application Tracker
                </h1>
                <p className="text-[10px] sm:text-[11px] text-slate-500 hidden sm:block truncate">Live Stage & Lifecycle Audit</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <a
              href={api.getApplicationPdfUrl(tracking.id)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl border border-indigo-100 transition-colors cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" /> <span className="hidden sm:inline">View PDF</span>
            </a>
            <a
              href={api.getApplicationPdfUrl(tracking.id, true)}
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Download</span>
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {/* Messages */}
        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-rose-800 text-xs font-medium">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-800 text-xs font-medium">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Application Overview Banner */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2.5">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider ${
                    meta.badgeVariant === 'rose'
                      ? 'bg-rose-100 text-rose-800 border border-rose-200'
                      : meta.badgeVariant === 'emerald'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : meta.badgeVariant === 'red'
                      ? 'bg-red-100 text-red-800 border border-red-200'
                      : meta.badgeVariant === 'amber'
                      ? 'bg-amber-100 text-amber-800 border border-amber-200'
                      : 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                  }`}
                >
                  {tracking.status}
                </span>

                {tracking.applicationNumber && (
                  <button
                    onClick={handleCopyArn}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 hover:bg-slate-200 rounded-full font-mono text-xs font-bold text-slate-800 border border-slate-200 transition-colors cursor-pointer"
                    title="Click to copy ARN"
                  >
                    <span>ARN: {tracking.applicationNumber}</span>
                    <Copy className="w-3 h-3 text-slate-500" />
                    {copied && <span className="text-[10px] text-emerald-600">Copied!</span>}
                  </button>
                )}

                <span className="text-xs font-bold text-slate-500">
                  AY {tracking.academicYear}
                </span>
              </div>

              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">
                {tracking.scholarship.name}
              </h2>

              <p className="text-xs text-slate-600 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-slate-400" />
                <span>{tracking.scholarship.department?.name || 'Department of Higher Education'}</span>
                <span>•</span>
                <span>Sanction Amount: <strong>₹{tracking.scholarship.benefitAmount?.toLocaleString('en-IN')}</strong></span>
              </p>
            </div>

            {/* Quick Status Pill */}
            <div className="bg-slate-50 rounded-2xl border border-slate-200/80 p-4 max-w-sm shrink-0 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Current Status
              </span>
              <p className="text-sm font-bold text-slate-900">{meta.label}</p>
              <p className="text-xs text-slate-500 leading-relaxed">{meta.description}</p>
              <div className="pt-2 flex items-center gap-2">
                {tracking.canCancel && (
                  <button
                    onClick={() => setIsCancelModalOpen(true)}
                    className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer"
                  >
                    Withdraw Application
                  </button>
                )}
                {tracking.canGiveUp && (
                  <button
                    onClick={() => setIsGiveUpModalOpen(true)}
                    className="text-[11px] font-semibold text-amber-700 hover:text-amber-800 hover:underline cursor-pointer"
                  >
                    Surrender Benefit (Right to Give Up)
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* 4-Stage Visual Stepper */}
          <div className="mt-8 pt-8 border-t border-slate-100">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              {STAGES.map((s) => {
                const isPassed = currentStageNumber > s.number;
                const isCurrent = currentStageNumber === s.number;

                return (
                  <div
                    key={s.number}
                    className={`p-4 rounded-2xl border transition-all ${
                      isCurrent
                        ? 'bg-indigo-50/70 border-indigo-200 ring-2 ring-indigo-500/20 shadow-xs'
                        : isPassed
                        ? 'bg-emerald-50/50 border-emerald-200 text-slate-800'
                        : 'bg-slate-50/60 border-slate-200/70 opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Stage {s.number}
                      </span>
                      {isPassed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : isCurrent ? (
                        <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
                      ) : (
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                      )}
                    </div>
                    <h4 className="text-xs font-bold text-slate-900">{s.label}</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">{s.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ACTION REQUIRED CENTER (Prominently rendered when sent back) */}
        {isActionRequired && (
          <div className="bg-white rounded-3xl border-2 border-rose-200 p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-200">
                    Action Required
                  </span>
                  <span className="text-xs text-slate-500">
                    {openCorrections.length} correction item(s) pending resolution
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-900">
                  Reviewer Scrutiny Feedback & Required Corrections
                </h3>
                {tracking.activeReview?.overallRemarks && (
                  <p className="text-xs text-rose-950 font-medium bg-rose-50/70 p-3 rounded-xl border border-rose-100 mt-2">
                    <strong>Reviewer Remarks:</strong> {tracking.activeReview.overallRemarks}
                  </p>
                )}
              </div>
            </div>

            {/* List of Correction Cards */}
            <div className="space-y-4 pt-2">
              {tracking.correctionRequests.map((corr, idx) => {
                const isResolved = corr.status === 'RESOLVED_BY_STUDENT';
                const isAccepted = corr.status === 'ACCEPTED';
                const isReFlagged = corr.status === 'RE_FLAGGED';

                // Find candidate vault versions if document correction
                const targetDoc = corr.affectedDocumentType
                  ? vaultDocs.find((d) => d.documentType === corr.affectedDocumentType)
                  : null;
                const candidateVersions =
                  targetDoc?.history ||
                  targetDoc?.versions ||
                  (targetDoc?.currentVersion ? [targetDoc.currentVersion] : []);

                const resState = selectedResolutions[corr.id] || {};

                return (
                  <div
                    key={corr.id}
                    className={`rounded-2xl border p-5 transition-all ${
                      isResolved || isAccepted
                        ? 'bg-emerald-50/30 border-emerald-200'
                        : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 text-xs font-bold flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-100">
                          {corr.affectedSection}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700">
                          {corr.rejectionCategory.replace(/_/g, ' ')}
                        </span>
                      </div>

                      <span
                        className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                          isResolved || isAccepted
                            ? 'bg-emerald-100 text-emerald-800'
                            : isReFlagged
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {isResolved ? 'Resolved by You' : isAccepted ? 'Accepted' : 'Pending Action'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      {/* What is wrong */}
                      <div className="space-y-1 p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <p className="text-[10px] font-bold text-rose-700 uppercase tracking-wider">
                          What is wrong?
                        </p>
                        <p className="text-slate-800 font-medium">{corr.reasonText}</p>
                        {corr.affectedDocumentType && (
                          <p className="text-slate-500 pt-1">
                            <strong>Affected Document:</strong> {corr.affectedDocumentType}
                          </p>
                        )}
                        {corr.affectedField && (
                          <p className="text-slate-500 pt-1">
                            <strong>Affected Field:</strong> {corr.affectedField}
                          </p>
                        )}
                      </div>

                      {/* What do I need to do */}
                      <div className="space-y-1 p-3 bg-indigo-50/50 rounded-xl border border-indigo-100">
                        <p className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider">
                          Action Required
                        </p>
                        <p className="text-slate-800 font-medium">{corr.actionRequiredText}</p>
                      </div>
                    </div>

                    {/* Interactive Resolution Section (If not yet resolved) */}
                    {!isResolved && !isAccepted && (
                      <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
                        {corr.affectedSection === 'DOCUMENT' && (
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-700 block">
                              Attach Corrected Document from Vault:
                            </label>
                            <div className="flex flex-wrap items-center gap-3">
                              <select
                                value={resState.versionId || ''}
                                onChange={(e) =>
                                  handleResolutionFieldChange(corr.id, 'versionId', e.target.value)
                                }
                                className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                              >
                                <option value="">-- Select Replacement Version from Vault --</option>
                                {candidateVersions.map((v) => (
                                  <option key={v.id} value={v.id}>
                                    Version {v.versionNumber}: {v.originalFilename} ({(v.fileSizeBytes / 1024).toFixed(1)} KB)
                                  </option>
                                ))}
                              </select>

                              <button
                                type="button"
                                onClick={() => {
                                  setUploadDocType(corr.affectedDocumentType);
                                  setUploadTargetCorrId(corr.id);
                                  setIsUploadModalOpen(true);
                                }}
                                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer border border-slate-200"
                              >
                                Upload New Version to Vault
                              </button>
                            </div>
                          </div>
                        )}

                        {corr.affectedSection !== 'DOCUMENT' && corr.affectedField && (
                          <div className="space-y-2 max-w-sm">
                            <label className="text-xs font-bold text-slate-700 block">
                              Corrected Value for {corr.affectedField}:
                            </label>
                            <input
                              type="text"
                              placeholder={`Enter corrected ${corr.affectedField}`}
                              value={resState.fieldValue || ''}
                              onChange={(e) =>
                                handleResolutionFieldChange(corr.id, 'fieldValue', e.target.value)
                              }
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>
                        )}

                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-700 block">
                            Resolution Explanation / Student Note:
                          </label>
                          <textarea
                            rows={2}
                            placeholder="Explain the changes made to resolve this issue..."
                            value={resState.responseText || ''}
                            onChange={(e) =>
                              handleResolutionFieldChange(corr.id, 'responseText', e.target.value)
                            }
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>

                        <div className="flex justify-end pt-1">
                          <button
                            onClick={() => handleMarkResolved(corr)}
                            disabled={
                              resolvingId === corr.id ||
                              (corr.affectedSection === 'DOCUMENT' && !resState.versionId)
                            }
                            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                          >
                            {resolvingId === corr.id ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...
                              </>
                            ) : (
                              <>
                                <Check className="w-3.5 h-3.5" /> Mark Item as Resolved
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Display Resolution info if resolved */}
                    {isResolved && (
                      <div className="mt-3 pt-3 border-t border-emerald-200 text-xs text-emerald-900 space-y-1">
                        <p className="font-semibold flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          Resolved: {corr.studentResponseText || 'Correction submitted'}
                        </p>
                        {corr.resolvedDocumentVersion && (
                          <p className="text-[11px] text-emerald-800 pl-5">
                            Attached Replacement Document: Version {corr.resolvedDocumentVersion.versionNumber} ({corr.resolvedDocumentVersion.originalFilename})
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Resubmission Action Panel */}
            <div className="pt-6 border-t border-slate-200 space-y-4">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900">Resubmission Readiness</h4>
                  <span className="text-xs font-bold text-indigo-600">
                    {tracking.correctionRequests.length - openCorrections.length} of{' '}
                    {tracking.correctionRequests.length} Resolved
                  </span>
                </div>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={confirmationAccepted}
                    onChange={(e) => setConfirmationAccepted(e.target.checked)}
                    disabled={!allCorrectionsResolved}
                    className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                  />
                  <span className="text-xs text-slate-700 leading-relaxed font-medium">
                    I confirm that I have resolved the listed corrections and the information provided is accurate.
                  </span>
                </label>
              </div>

              <div className="flex flex-col sm:flex-row justify-end">
                <button
                  onClick={handleResubmitApplication}
                  disabled={!allCorrectionsResolved || !confirmationAccepted || resubmitting}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  {resubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Resubmitting...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" /> Resubmit Application to College
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Administrative Payment Simulation Summary Card */}
        {(tracking.payment ||
          ['APPROVED', 'PAYMENT_PROCESSING', 'PAYMENT_INITIATED', 'DISBURSED', 'UNDISBURSED'].includes(
            tracking.status
          )) && (
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 border border-teal-200 flex items-center justify-center font-bold text-base">
                  ₹
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Administrative Payment Simulation Details
                  </h3>
                  <p className="text-xs text-slate-500">
                    Status of simulated scholarship benefit disbursement
                  </p>
                </div>
              </div>

              <div>
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${
                    tracking.status === 'DISBURSED'
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                      : tracking.status === 'UNDISBURSED'
                      ? 'bg-rose-100 text-rose-800 border-rose-200'
                      : tracking.status === 'PAYMENT_INITIATED'
                      ? 'bg-cyan-100 text-cyan-800 border-cyan-200'
                      : tracking.status === 'PAYMENT_PROCESSING'
                      ? 'bg-amber-100 text-amber-800 border-amber-200'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  }`}
                >
                  {tracking.status === 'DISBURSED'
                    ? 'Disbursed (Simulated)'
                    : tracking.status === 'UNDISBURSED'
                    ? 'Disbursement Exception'
                    : tracking.status === 'PAYMENT_INITIATED'
                    ? 'Payment Initiated'
                    : tracking.status === 'PAYMENT_PROCESSING'
                    ? 'Payment Processing'
                    : 'Sanctioned / Awaiting Batch'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Scholarship Benefit Amount */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Sanctioned Amount
                </span>
                <span className="text-lg font-extrabold text-teal-800">
                  ₹{(tracking.payment?.amount || tracking.scholarship?.benefitAmount || 0).toLocaleString('en-IN')}
                </span>
                <span className="text-[11px] text-slate-500 block mt-0.5">
                  AY {tracking.academicYear}
                </span>
              </div>

              {/* Simulation Reference */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Simulation Reference
                </span>
                <span
                  className="font-mono text-xs font-bold text-slate-800 block truncate"
                  title={tracking.payment?.simulationReference || 'Pending Initiation'}
                >
                  {tracking.payment?.simulationReference || 'Pending Initiation'}
                </span>
                <span className="text-[11px] text-slate-500 block mt-0.5">
                  Academic Reference
                </span>
              </div>

              {/* Batch Number */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Batch Number
                </span>
                <span
                  className="font-mono text-xs font-bold text-slate-800 block truncate"
                  title={tracking.payment?.batchNumber || 'Pending Batching'}
                >
                  {tracking.payment?.batchNumber || 'Pending Batching'}
                </span>
                <span className="text-[11px] text-slate-500 block mt-0.5">
                  Disbursement Batch
                </span>
              </div>

              {/* Disbursed Date / Status Timestamp */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Disbursement Date
                </span>
                <span className="text-xs font-bold text-slate-800 block">
                  {tracking.payment?.disbursedAt
                    ? new Date(tracking.payment.disbursedAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })
                    : tracking.status === 'DISBURSED'
                    ? 'Disbursed (Simulated)'
                    : 'Awaiting Simulation'}
                </span>
                <span className="text-[11px] text-slate-500 block mt-0.5">
                  {tracking.payment?.disbursedAt ? 'Recorded' : 'Status confirmation'}
                </span>
              </div>
            </div>

            {/* Exception Note if UNDISBURSED */}
            {tracking.status === 'UNDISBURSED' && (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-900 space-y-1">
                <div className="flex items-center gap-2 font-bold text-rose-800">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  <span>Simulated Disbursement Exception</span>
                </div>
                <p className="text-[11px] text-rose-700 pl-6">
                  {tracking.payment?.failureReason || 'Simulated disbursement exception'}
                </p>
              </div>
            )}

            {/* Payment Simulation Notice */}
            <p className="text-[11px] text-slate-400 italic">
              * Administrative Payment Simulation: Simulation reference and status. No real financial transaction, bank transfer, or government treasury debit occurs.
            </p>
          </div>
        )}

        {/* Audit Log Timeline Feed (Strictly backed 100% by ApplicationAuditLog) */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Application Activity & Audit Trail</h3>
              <p className="text-xs text-slate-500">Immutable chronological history of all lifecycle events</p>
            </div>
            <span className="text-xs font-semibold text-slate-400">
              {tracking.timeline.length} recorded events
            </span>
          </div>

          <div className="relative pl-6 space-y-8 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
            {tracking.timeline.map((event) => (
              <div key={event.id} className="relative group">
                <div className="absolute -left-6 top-1.5 w-3 h-3 rounded-full bg-indigo-600 ring-4 ring-white" />
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-xs font-bold text-slate-900">{event.actionTitle}</h4>
                    <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                      {event.actorRoleLabel}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {new Date(event.timestamp).toLocaleString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  {event.remarks && (
                    <p className="text-xs text-slate-600 leading-relaxed max-w-2xl bg-slate-50/80 p-2.5 rounded-xl border border-slate-100">
                      {event.remarks}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Cancellation Modal */}
      {isCancelModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <XCircle className="w-5 h-5 text-rose-600" />
              Withdraw / Cancel Application
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Are you sure you want to cancel this application? Once cancelled, this application cannot be resubmitted.
            </p>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Reason for Withdrawal:</label>
              <textarea
                rows={2}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Optional explanation..."
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setIsCancelModalOpen(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                Keep Application
              </button>
              <button
                onClick={handleCancelApplication}
                className="px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 cursor-pointer"
              >
                Confirm Withdrawal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Right to Give Up Modal */}
      {isGiveUpModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-amber-600" />
              Surrender Scholarship Benefit (Right to Give Up)
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Under statutory scholarship rules, an applicant may formally surrender or decline the scholarship benefit if opting for another scheme or self-funding.
            </p>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Reason for Surrendering:</label>
              <textarea
                rows={2}
                value={giveUpReason}
                onChange={(e) => setGiveUpReason(e.target.value)}
                placeholder="e.g. Availed Central Sector Scheme..."
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setIsGiveUpModalOpen(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleGiveUpBenefit}
                className="px-4 py-2 bg-amber-600 text-white rounded-xl text-xs font-bold hover:bg-amber-700 cursor-pointer"
              >
                Surrender Benefit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Upload Modal */}
      <DocumentUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => {
          setIsUploadModalOpen(false);
          setUploadTargetCorrId(null);
        }}
        onSuccess={handleUploadSuccess}
        preselectedType={uploadDocType}
        isReplacement={vaultDocs.some((d) => d.documentType === uploadDocType)}
        availableTypes={availableTypes}
      />

      {/* Document Preview Modal */}
      <DocumentPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        doc={previewDoc}
      />
    </div>
  );
}
