import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { AuthorityNavbar } from '../components/authority/AuthorityNavbar';
import { ApproveModal } from '../components/authority/ApproveModal';
import { SendBackModal } from '../components/authority/SendBackModal';
import { RejectModal } from '../components/authority/RejectModal';
import { DocumentPreviewModal } from '../components/authority/DocumentPreviewModal';
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Play,
  Eye,
  Download,
  FileText,
  User,
  GraduationCap,
  HelpCircle,
  History,
  Layers,
  Loader2,
  Building,
  Building2,
  Calendar,
  ShieldCheck,
  FileCheck,
  ClipboardCheck,
  Camera,
  Info,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export function AuthorityApplicationReviewPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'scheme' | 'questionnaire' | 'documents' | 'college' | 'snapshot' | 'history' | 'audit'

  // Modals state
  const [isApproveOpen, setIsApproveOpen] = useState(false);
  const [isSendBackOpen, setIsSendBackOpen] = useState(false);
  const [isRejectOpen, setIsRejectOpen] = useState(false);

  // Document preview state
  const [previewDoc, setPreviewDoc] = useState(null); // { documentVersion, documentType }

  // Raw JSON toggle state in Snapshot tab
  const [showRawJson, setShowRawJson] = useState(false);

  useEffect(() => {
    fetchApplicationDetails();
  }, [id]);

  const fetchApplicationDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getAuthorityApplicationDetails(id);
      setData(res);
    } catch (err) {
      setError(err.message || 'Failed to load application details.');
    } finally {
      setLoading(false);
    }
  };

  // Scrutiny: Start Review
  const handleStartReview = async () => {
    try {
      setActionLoading(true);
      await api.startAuthorityReview(id);
      await fetchApplicationDetails();
    } catch (err) {
      alert(err.message || 'Failed to initiate department scrutiny.');
    } finally {
      setActionLoading(false);
    }
  };

  // Scrutiny: Submit Decision (Approve, Send Back, Reject)
  const handleDecisionSubmit = async (payload) => {
    try {
      setActionLoading(true);
      await api.submitAuthorityReviewDecision(id, payload);
      setIsApproveOpen(false);
      setIsSendBackOpen(false);
      setIsRejectOpen(false);
      await fetchApplicationDetails();
    } catch (err) {
      alert(err.message || 'Failed to record scrutiny decision.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <AuthorityNavbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-3">
            <Loader2 className="w-8 h-8 text-teal-600 animate-spin mx-auto" />
            <p className="text-xs font-medium text-slate-500">Loading department scrutiny desk...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <AuthorityNavbar />
        <div className="flex-1 max-w-lg mx-auto p-8 flex items-center justify-center">
          <div className="bg-white p-6 rounded-2xl border border-rose-200 text-center space-y-3 shadow-sm w-full">
            <AlertTriangle className="w-10 h-10 text-rose-600 mx-auto" />
            <h3 className="text-base font-bold text-slate-900">Application Not Found</h3>
            <p className="text-xs text-slate-600">
              {error || 'The requested application does not exist or does not belong to your department.'}
            </p>
            <div className="pt-2">
              <Link
                to="/authority/applications"
                className="px-4 py-2 bg-teal-700 text-white rounded-lg text-xs font-bold hover:bg-teal-800 transition"
              >
                Return to Applications Queue
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const {
    application,
    currentSnapshot,
    documentSnapshots,
    collegeReview,
    multiCycleHistory,
    correctionRequests,
    auditLogs,
    allowedActions,
  } = data;

  // Derive frozen snapshot sections safely
  const studentSnapshot = currentSnapshot?.student || {};
  const personal = studentSnapshot.personal || {};
  const contact = studentSnapshot.contact || {};
  const academic = studentSnapshot.academic || {};
  const financial = studentSnapshot.financial || {};
  const bank = studentSnapshot.bank || {};
  const questionnaire = currentSnapshot?.questionnaireResponses || {};
  const evaluation = currentSnapshot?.eligibilityEvaluation || {};

  const badgeClass =
    application.status === 'UNDER_AUTHORITY_REVIEW'
      ? 'bg-indigo-100 text-indigo-800 border-indigo-200'
      : application.status === 'AUTHORITY_SENT_BACK'
      ? 'bg-amber-100 text-amber-800 border-amber-200'
      : application.status === 'AUTHORITY_REJECTED'
      ? 'bg-rose-100 text-rose-800 border-rose-200'
      : application.status === 'APPROVED'
      ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
      : 'bg-teal-100 text-teal-800 border-teal-200';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-28">
      <AuthorityNavbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Top Header Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="flex items-center space-x-3">
              <Link
                to="/authority/applications"
                className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition"
                title="Back to queue"
              >
                <ArrowLeft className="w-4 h-4" />
              </Link>
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-xl font-black text-slate-900 font-mono tracking-tight">
                    {application.applicationNumber || 'PENDING-ARN'}
                  </h2>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${badgeClass}`}
                  >
                    {application.statusMeta?.label || application.status}
                  </span>
                  {application.currentCycle > 1 && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
                      Cycle {application.currentCycle} (Resubmission)
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Applicant: <strong className="text-slate-800">{personal.fullName || application.student?.fullName}</strong> • Submitted:{' '}
                  {application.submittedAt
                    ? new Date(application.submittedAt).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })
                    : 'N/A'} • Institution:{' '}
                  <strong className="text-slate-700">{application.student?.college?.name || 'N/A'}</strong>
                </p>
              </div>
            </div>

            <div className="text-left sm:text-right text-xs text-slate-500">
              <div className="flex items-center justify-start sm:justify-end space-x-1.5 mb-1">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-100 text-teal-800 uppercase tracking-wide">
                  {application.scholarship?.department?.code || 'DEPT'}
                </span>
                <span className="font-semibold text-slate-700">
                  {application.scholarship?.department?.name || 'Department Scheme'}
                </span>
              </div>
              <div className="font-bold text-slate-800">{application.scholarship?.name}</div>
              <div className="text-teal-700 font-semibold font-mono mt-0.5">
                Benefit: ₹{Number(application.scholarship?.benefitAmount || 0).toLocaleString('en-IN')}
              </div>
            </div>
          </div>

          {/* 8 Structured Tab Navigation */}
          <div className="flex items-center space-x-1.5 overflow-x-auto border-b border-slate-100 pb-1 scrollbar-none">
            {[
              { id: 'profile', label: 'Applicant Profile', icon: User },
              { id: 'scheme', label: 'Scheme & Eligibility', icon: GraduationCap },
              { id: 'questionnaire', label: 'Questionnaire', icon: HelpCircle },
              { id: 'documents', label: `Documents (${documentSnapshots?.length || 0})`, icon: FileText },
              { id: 'college', label: 'College Verification', icon: Building2 },
              { id: 'snapshot', label: 'Submitted Snapshot', icon: Camera },
              { id: 'history', label: `History (${multiCycleHistory?.length || 1})`, icon: History },
              { id: 'audit', label: `Audit (${auditLogs?.length || 0})`, icon: Layers },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                    activeTab === tab.id
                      ? 'bg-teal-700 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab 1: Applicant Profile */}
        {activeTab === 'profile' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-6">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center space-x-2">
              <User className="w-4 h-4 text-teal-600" />
              <span>Applicant Profile Data (Frozen Cycle {application.currentCycle} Snapshot)</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Personal */}
              <div className="space-y-3 p-4 rounded-xl bg-slate-50/70 border border-slate-200">
                <h4 className="text-xs font-bold uppercase tracking-wider text-teal-800">
                  Personal Information
                </h4>
                <div className="space-y-1.5 text-xs">
                  <div>
                    <span className="text-slate-500">Full Name:</span>{' '}
                    <strong className="text-slate-800">{personal.fullName || 'N/A'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Date of Birth:</span>{' '}
                    <strong className="text-slate-800">
                      {personal.dob ? new Date(personal.dob).toLocaleDateString('en-IN') : 'N/A'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Gender:</span>{' '}
                    <strong className="text-slate-800">{personal.gender || 'N/A'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Category:</span>{' '}
                    <strong className="text-slate-800">{personal.category || 'N/A'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Religion:</span>{' '}
                    <strong className="text-slate-800">{personal.religion || 'N/A'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Divyang / PwD:</span>{' '}
                    <strong className="text-slate-800">
                      {personal.isHandicapped ? `Yes (${personal.disabilityPercentage}%)` : 'No'}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Academic */}
              <div className="space-y-3 p-4 rounded-xl bg-slate-50/70 border border-slate-200">
                <h4 className="text-xs font-bold uppercase tracking-wider text-teal-800">
                  Academic Credentials
                </h4>
                <div className="space-y-1.5 text-xs">
                  <div>
                    <span className="text-slate-500">Course:</span>{' '}
                    <strong className="text-slate-800">{academic.courseName || 'N/A'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Current Course Year:</span>{' '}
                    <strong className="text-slate-800">Year {academic.courseYear || 'N/A'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Admission Year:</span>{' '}
                    <strong className="text-slate-800">{academic.admissionYear || 'N/A'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Previous Qualification:</span>{' '}
                    <strong className="text-slate-800">{academic.previousQualification || 'N/A'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Previous Percentage:</span>{' '}
                    <strong className="text-slate-900 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                      {academic.previousPercentage ? `${academic.previousPercentage}%` : 'N/A'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Institution:</span>{' '}
                    <strong className="text-slate-800">{application.student?.college?.name || 'N/A'}</strong>
                  </div>
                </div>
              </div>

              {/* Income, Banking & Contact */}
              <div className="space-y-3 p-4 rounded-xl bg-slate-50/70 border border-slate-200">
                <h4 className="text-xs font-bold uppercase tracking-wider text-teal-800">
                  Financial & Banking
                </h4>
                <div className="space-y-1.5 text-xs">
                  <div>
                    <span className="text-slate-500">Annual Family Income:</span>{' '}
                    <strong className="text-slate-900 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                      ₹{Number(financial.annualFamilyIncome || 0).toLocaleString('en-IN')}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Mobile:</span>{' '}
                    <strong className="text-slate-800">{contact.mobile || 'N/A'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Bank Name:</span>{' '}
                    <strong className="text-slate-800">{bank.bankName || 'N/A'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Account No:</span>{' '}
                    <strong className="text-slate-800 font-mono">
                      {bank.bankAccountNo ? `XXXX${bank.bankAccountNo.slice(-4)}` : 'N/A'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500">IFSC Code:</span>{' '}
                    <strong className="text-slate-800 font-mono">{bank.bankIfsc || 'N/A'}</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Scheme & Eligibility */}
        {activeTab === 'scheme' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-6">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center space-x-2">
              <GraduationCap className="w-4 h-4 text-teal-600" />
              <span>Scholarship Scheme Criteria & Eligibility Evaluation</span>
            </h3>

            {/* Scheme Metadata */}
            <div className="p-4 rounded-xl bg-teal-50/50 border border-teal-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div>
                <div className="font-bold text-slate-900 text-sm">{application.scholarship?.name}</div>
                <div className="text-slate-500 font-mono mt-0.5">
                  Code: {application.scholarship?.code} • Department: {application.scholarship?.department?.name}
                </div>
              </div>
              <div className="text-right">
                <span className="text-slate-500">Configured Benefit Amount:</span>{' '}
                <strong className="text-teal-900 font-mono text-sm">
                  ₹{Number(application.scholarship?.benefitAmount || 0).toLocaleString('en-IN')}
                </strong>
              </div>
            </div>

            {/* Rules Evaluation List */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Automated Eligibility Engine Rules Evaluation
              </h4>

              {evaluation.evaluatedRules?.length > 0 ? (
                <div className="space-y-2">
                  {evaluation.evaluatedRules.map((r, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                        r.status === 'SATISFIED'
                          ? 'bg-emerald-50/50 border-emerald-200 text-emerald-900'
                          : 'bg-rose-50/50 border-rose-200 text-rose-900'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        {r.status === 'SATISFIED' ? (
                          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : (
                          <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        )}
                        <div>
                          <span className="font-bold">{r.fieldPath}</span>{' '}
                          <span className="text-slate-500">({r.operator})</span>{' '}
                          <span>Required: {JSON.stringify(r.targetValue)}</span>
                          {r.actualValue !== undefined && (
                            <span className="text-slate-600 ml-2">
                              • Student Value: <strong>{String(r.actualValue)}</strong>
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="font-bold text-[10px] uppercase px-2 py-0.5 rounded bg-white border">
                        {r.status}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500">Eligibility evaluation snapshot not available.</p>
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Questionnaire */}
        {activeTab === 'questionnaire' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-6">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center space-x-2">
              <HelpCircle className="w-4 h-4 text-teal-600" />
              <span>Questionnaire Declarations Submitted by Applicant</span>
            </h3>

            {Object.keys(questionnaire).length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {Object.entries(questionnaire).map(([key, val]) => (
                  <div key={key} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                    <div className="text-slate-500 font-medium mb-1">{key}</div>
                    <div className="text-slate-900 font-bold text-sm">
                      {typeof val === 'boolean' ? (val ? 'Yes' : 'No') : String(val)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500">No specific questionnaire answers recorded for this application.</p>
            )}
          </div>
        )}

        {/* Tab 4: Documents Scrutiny Desk */}
        {activeTab === 'documents' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <FileText className="w-4 h-4 text-teal-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Frozen Attached Documents (Cycle {application.currentCycle})
                </h3>
              </div>
              <span className="text-xs text-slate-500 font-medium">
                {documentSnapshots?.length || 0} attached document(s)
              </span>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              These document versions were securely snapshotted for Cycle {application.currentCycle}. Click{' '}
              <strong>"Preview Inline"</strong> to inspect document authenticity, validity, and legibility.
            </p>

            {documentSnapshots?.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {documentSnapshots.map((ds) => {
                  const doc = ds.documentVersion;
                  return (
                    <div
                      key={ds.id}
                      className="p-4 rounded-xl border border-slate-200 hover:border-teal-300 bg-slate-50/50 transition flex flex-col justify-between space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-2.5">
                          <div className="w-9 h-9 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
                            <FileCheck className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-900">{ds.documentType}</div>
                            <div className="text-[11px] text-slate-500 truncate max-w-[220px]">
                              {doc?.originalFilename || 'Uploaded Certificate'}
                            </div>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white border border-slate-200 text-slate-700">
                          v{doc?.versionNumber || 1}
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-500 flex items-center space-x-3">
                        <span>
                          Size:{' '}
                          <strong className="text-slate-700">
                            {doc?.fileSizeBytes ? (doc.fileSizeBytes / 1024).toFixed(1) : 0} KB
                          </strong>
                        </span>
                        <span>
                          MIME: <strong className="text-slate-700">{doc?.mimeType || 'PDF/Image'}</strong>
                        </span>
                        {doc?.isCompressed && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800">
                            Compressed
                          </span>
                        )}
                      </div>

                      <div className="pt-2 border-t border-slate-200/70 flex items-center justify-end space-x-2">
                        {doc?.downloadUrl && (
                          <a
                            href={doc.downloadUrl}
                            download
                            className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Download</span>
                          </a>
                        )}

                        {doc?.previewUrl && (
                          <button
                            type="button"
                            onClick={() =>
                              setPreviewDoc({
                                documentVersion: doc,
                                documentType: ds.documentType,
                              })
                            }
                            className="inline-flex items-center space-x-1 px-3.5 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold shadow-2xs transition"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Preview Inline</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400 text-xs">
                No document snapshots recorded for this cycle.
              </div>
            )}
          </div>
        )}

        {/* Tab 5: College Verification */}
        {activeTab === 'college' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-6">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center space-x-2">
              <Building2 className="w-4 h-4 text-teal-600" />
              <span>Institute-Level Scrutiny & Verification Record</span>
            </h3>

            {/* College Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                <div className="text-xs font-bold uppercase tracking-wider text-teal-800">
                  Affiliated Institution
                </div>
                <div>
                  <span className="text-slate-500">Institution Name:</span>{' '}
                  <strong className="text-slate-900">{application.student?.college?.name || 'N/A'}</strong>
                </div>
                <div>
                  <span className="text-slate-500">Institution Code:</span>{' '}
                  <strong className="text-slate-900 font-mono">
                    {application.student?.college?.code || 'N/A'}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500">Location:</span>{' '}
                  <strong className="text-slate-900">
                    {application.student?.college?.district || ''}, {application.student?.college?.state || ''}
                  </strong>
                </div>
              </div>

              {/* Verification Record */}
              <div className="p-4 rounded-xl bg-teal-50/40 border border-teal-200 space-y-2 text-xs">
                <div className="text-xs font-bold uppercase tracking-wider text-teal-800">
                  College Verification Status
                </div>
                {collegeReview ? (
                  <>
                    <div className="flex items-center space-x-2">
                      <span className="text-slate-500">Decision:</span>{' '}
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        {collegeReview.decision || 'FORWARD'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500">Verified By:</span>{' '}
                      <strong className="text-slate-900">
                        {collegeReview.reviewerUser?.email || 'Institute Officer'}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500">Verification Date:</span>{' '}
                      <strong className="text-slate-900">
                        {new Date(collegeReview.createdAt).toLocaleString('en-IN')}
                      </strong>
                    </div>
                    {collegeReview.remarks && (
                      <div className="pt-2 border-t border-teal-200/60">
                        <span className="text-slate-500 font-medium">Verification Remarks:</span>
                        <p className="text-slate-800 mt-1 font-medium bg-white p-2.5 rounded-lg border border-teal-100">
                          {collegeReview.remarks}
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-slate-500 py-2">
                    Direct or historical forward. No explicit College review record logged.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 6: Submitted Application Snapshot */}
        {activeTab === 'snapshot' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <Camera className="w-4 h-4 text-teal-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Submitted Application Snapshot (Frozen Record)
                </h3>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                Cycle {application.currentCycle} Submission Freeze
              </span>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              This snapshot captures the exact state of applicant credentials and eligibility responses at the moment
              of submission. It guarantees that any post-submission profile updates do not alter this review.
            </p>

            {currentSnapshot ? (
              <div className="space-y-6">
                {/* Structured Snapshot Overview */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  {/* Student & Personal */}
                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                    <h4 className="font-bold text-slate-900 border-b border-slate-200 pb-1.5 flex items-center space-x-1.5">
                      <User className="w-3.5 h-3.5 text-teal-600" />
                      <span>Applicant Profile</span>
                    </h4>
                    <div><span className="text-slate-500">Name:</span> <strong>{personal.fullName || 'N/A'}</strong></div>
                    <div><span className="text-slate-500">Category:</span> <strong>{personal.category || 'N/A'}</strong></div>
                    <div><span className="text-slate-500">Gender:</span> <strong>{personal.gender || 'N/A'}</strong></div>
                    <div><span className="text-slate-500">DOB:</span> <strong>{personal.dob ? new Date(personal.dob).toLocaleDateString('en-IN') : 'N/A'}</strong></div>
                  </div>

                  {/* Academic Snapshot */}
                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                    <h4 className="font-bold text-slate-900 border-b border-slate-200 pb-1.5 flex items-center space-x-1.5">
                      <GraduationCap className="w-3.5 h-3.5 text-teal-600" />
                      <span>Academic Snapshot</span>
                    </h4>
                    <div><span className="text-slate-500">Institution:</span> <strong>{studentSnapshot.college?.name || academic.collegeName || 'N/A'}</strong></div>
                    <div><span className="text-slate-500">Course:</span> <strong>{academic.courseName || 'N/A'} (Year {academic.courseYear || 1})</strong></div>
                    <div><span className="text-slate-500">Previous Score:</span> <strong>{academic.previousPercentage ? `${academic.previousPercentage}%` : 'N/A'}</strong></div>
                    <div><span className="text-slate-500">Annual Income:</span> <strong>₹{Number(financial.annualFamilyIncome || 0).toLocaleString('en-IN')}</strong></div>
                  </div>
                </div>

                {/* Technical Raw JSON Collapsible */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setShowRawJson(!showRawJson)}
                    className="w-full px-4 py-2.5 bg-slate-50 text-left text-xs font-bold text-slate-700 flex items-center justify-between hover:bg-slate-100 transition"
                  >
                    <span className="flex items-center space-x-2">
                      <FileText className="w-3.5 h-3.5 text-slate-500" />
                      <span>Technical Snapshot JSON (Diagnostic View)</span>
                    </span>
                    {showRawJson ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  {showRawJson && (
                    <div className="p-4 bg-slate-900 text-slate-100 text-[11px] font-mono overflow-x-auto max-h-96">
                      <pre>{JSON.stringify(currentSnapshot, null, 2)}</pre>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500">Zero frozen snapshot records found for this application.</p>
            )}
          </div>
        )}

        {/* Tab 7: Multi-Cycle History */}
        {activeTab === 'history' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-6">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center space-x-2">
              <History className="w-4 h-4 text-purple-600" />
              <span>Multi-Cycle Review & Resubmission History</span>
            </h3>

            {/* List of Previous Reviews & Correction Items */}
            {correctionRequests?.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Correction Requests Log
                </h4>
                <div className="space-y-3">
                  {correctionRequests.map((corr) => (
                    <div
                      key={corr.id}
                      className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                            {corr.rejectionCategory}
                          </span>
                          <span className="text-xs font-bold text-slate-800">
                            {corr.affectedSection}: {corr.affectedField || corr.affectedDocumentType}
                          </span>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            corr.status === 'ACCEPTED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : corr.status === 'RESOLVED_BY_STUDENT'
                              ? 'bg-purple-100 text-purple-800'
                              : corr.status === 'RE_FLAGGED'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {corr.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-slate-500 font-medium">Reason Flagged:</span>{' '}
                          <span className="text-slate-800 font-semibold">{corr.reasonText}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 font-medium">Action Required:</span>{' '}
                          <span className="text-slate-800 font-semibold">{corr.actionRequiredText}</span>
                        </div>
                      </div>

                      {corr.studentResponseText && (
                        <div className="p-3 rounded-lg bg-white border border-slate-200 text-xs text-slate-700">
                          <span className="font-bold text-purple-700">Student Resolution Note:</span>{' '}
                          {corr.studentResponseText}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Cycles List */}
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Snapshotted Cycles ({multiCycleHistory?.length || 0})
              </h4>
              {multiCycleHistory.map((cycle) => (
                <div key={cycle.cycleNumber} className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-slate-900 text-xs">Cycle {cycle.cycleNumber}</span>
                    <span className="text-[11px] text-slate-500">
                      Submitted: {new Date(cycle.submittedAt).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="text-xs text-slate-600">
                    Attached Documents: {cycle.documentCount} • Reviews: {cycle.reviews?.length || 0} •
                    Corrections: {cycle.corrections?.length || 0}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 8: Audit Trail */}
        {activeTab === 'audit' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-6">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center space-x-2">
              <Layers className="w-4 h-4 text-teal-600" />
              <span>Persisted Application Scrutiny Audit Trail</span>
            </h3>

            {auditLogs?.length > 0 ? (
              <div className="space-y-3">
                {auditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                  >
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-800">
                          {log.actorRole}
                        </span>
                        <span className="font-bold text-slate-900">{log.action}</span>
                        {log.previousStatus && (
                          <span className="text-slate-500">
                            ({log.previousStatus} &rarr; {log.newStatus})
                          </span>
                        )}
                      </div>
                      {log.remarks && (
                        <p className="text-slate-600 mt-1 text-[11px] leading-relaxed">{log.remarks}</p>
                      )}
                    </div>
                    <div className="text-right text-[11px] text-slate-400 shrink-0">
                      {new Date(log.timestamp).toLocaleString('en-IN')}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500">Zero audit log entries found.</p>
            )}
          </div>
        )}
      </main>

      {/* Sticky Department Scrutiny Action Bar */}
      <footer className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-slate-200 p-4 z-40 shadow-lg">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs text-slate-600">
            Current Status:{' '}
            <strong className="text-slate-900 font-bold">{application.status}</strong>
            {application.status === 'UNDER_AUTHORITY_REVIEW' && (
              <span className="text-teal-700 font-semibold ml-2">
                • Department scrutiny in progress
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            {/* Start Review Button */}
            {allowedActions.includes('START_REVIEW') && (
              <button
                type="button"
                onClick={handleStartReview}
                disabled={actionLoading}
                className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold shadow-xs hover:shadow transition disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5" />
                <span>{actionLoading ? 'Starting...' : 'Start Department Review'}</span>
              </button>
            )}

            {/* In-Scrutiny Actions */}
            {allowedActions.includes('SEND_BACK') && (
              <button
                type="button"
                onClick={() => setIsSendBackOpen(true)}
                disabled={actionLoading}
                className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold transition disabled:opacity-50"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                <span>Send Back for Correction</span>
              </button>
            )}

            {allowedActions.includes('REJECT') && (
              <button
                type="button"
                onClick={() => setIsRejectOpen(true)}
                disabled={actionLoading}
                className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-900 text-xs font-bold transition disabled:opacity-50"
              >
                <XCircle className="w-3.5 h-3.5 text-rose-700" />
                <span>Reject</span>
              </button>
            )}

            {allowedActions.includes('APPROVE') && (
              <button
                type="button"
                onClick={() => setIsApproveOpen(true)}
                disabled={actionLoading}
                className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs hover:shadow transition disabled:opacity-50"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Approve Application</span>
              </button>
            )}
          </div>
        </div>
      </footer>

      {/* Modals */}
      <ApproveModal
        isOpen={isApproveOpen}
        onClose={() => setIsApproveOpen(false)}
        onConfirm={handleDecisionSubmit}
        application={application}
        isSubmitting={actionLoading}
      />

      <SendBackModal
        isOpen={isSendBackOpen}
        onClose={() => setIsSendBackOpen(false)}
        onConfirm={handleDecisionSubmit}
        application={application}
        isSubmitting={actionLoading}
      />

      <RejectModal
        isOpen={isRejectOpen}
        onClose={() => setIsRejectOpen(false)}
        onConfirm={handleDecisionSubmit}
        application={application}
        isSubmitting={actionLoading}
      />

      <DocumentPreviewModal
        isOpen={!!previewDoc}
        onClose={() => setPreviewDoc(null)}
        applicationId={application.id}
        documentVersion={previewDoc?.documentVersion}
        documentType={previewDoc?.documentType}
      />
    </div>
  );
}
