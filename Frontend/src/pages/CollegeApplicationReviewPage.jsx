import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { CollegeNavbar } from '../components/college/CollegeNavbar';
import { SendBackModal } from '../components/college/SendBackModal';
import { RejectModal } from '../components/college/RejectModal';
import { ForwardModal } from '../components/college/ForwardModal';
import { DocumentPreviewModal } from '../components/college/DocumentPreviewModal';
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Play,
  Send,
  Eye,
  Download,
  FileText,
  User,
  GraduationCap,
  HelpCircle,
  History,
  ShieldAlert,
  Loader2,
  Calendar,
  Layers,
  FileCheck,
  Building,
  Check,
} from 'lucide-react';

export function CollegeApplicationReviewPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'scheme' | 'questionnaire' | 'documents' | 'history' | 'audit'

  // Modals state
  const [isSendBackOpen, setIsSendBackOpen] = useState(false);
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [isForwardOpen, setIsForwardOpen] = useState(false);

  // Document preview state
  const [previewDoc, setPreviewDoc] = useState(null); // { previewUrl, downloadUrl, title, filename, mimeType }

  useEffect(() => {
    fetchApplicationDetails();
  }, [id]);

  const fetchApplicationDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getCollegeApplicationDetails(id);
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
      await api.startCollegeReview(id);
      await fetchApplicationDetails();
    } catch (err) {
      alert(err.message || 'Failed to initiate scrutiny.');
    } finally {
      setActionLoading(false);
    }
  };

  // Scrutiny: Submit Decision (Forward, Send Back, Reject)
  const handleDecisionSubmit = async (payload) => {
    try {
      setActionLoading(true);
      await api.submitCollegeReviewDecision(id, payload);
      setIsSendBackOpen(false);
      setIsRejectOpen(false);
      setIsForwardOpen(false);
      await fetchApplicationDetails();
    } catch (err) {
      alert(err.message || 'Failed to record scrutiny decision.');
    } finally {
      setActionLoading(false);
    }
  };

  // Scrutiny: Review Individual Correction Item
  const handleReviewCorrection = async (correctionId, decision, remarks = '') => {
    try {
      setActionLoading(true);
      await api.reviewCollegeCorrection(id, correctionId, { decision, remarks });
      await fetchApplicationDetails();
    } catch (err) {
      alert(err.message || 'Failed to review correction item.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <CollegeNavbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-3">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
            <p className="text-xs font-medium text-slate-500">Loading application scrutiny payload...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <CollegeNavbar />
        <div className="flex-1 max-w-lg mx-auto p-8 flex items-center justify-center">
          <div className="bg-white p-6 rounded-2xl border border-rose-200 text-center space-y-3 shadow-sm w-full">
            <AlertTriangle className="w-10 h-10 text-rose-600 mx-auto" />
            <h3 className="text-base font-bold text-slate-900">Application Not Found</h3>
            <p className="text-xs text-slate-600">
              {error || 'The requested application does not exist or does not belong to your college.'}
            </p>
            <div className="pt-2">
              <Link
                to="/college/applications"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition"
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
    multiCycleHistory,
    correctionRequests,
    auditLogs,
    allowedActions,
  } = data;

  const studentSnapshot = currentSnapshot?.student || {};
  const personal = studentSnapshot.personal || {};
  const contact = studentSnapshot.contact || {};
  const academic = studentSnapshot.academic || {};
  const financial = studentSnapshot.financial || {};
  const bank = studentSnapshot.bank || {};
  const questionnaire = currentSnapshot?.questionnaireResponses || {};
  const evaluation = currentSnapshot?.eligibilityEvaluation || {};

  const badgeClass =
    application.status === 'UNDER_COLLEGE_REVIEW'
      ? 'bg-indigo-100 text-indigo-800 border-indigo-200'
      : application.status === 'COLLEGE_SENT_BACK'
      ? 'bg-amber-100 text-amber-800 border-amber-200'
      : application.status === 'COLLEGE_REJECTED'
      ? 'bg-rose-100 text-rose-800 border-rose-200'
      : application.status === 'FORWARDED_TO_AUTHORITY'
      ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
      : application.status === 'RESUBMITTED_TO_COLLEGE'
      ? 'bg-purple-100 text-purple-800 border-purple-200'
      : 'bg-blue-100 text-blue-800 border-blue-200';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-24">
      <CollegeNavbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Top Header Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="flex items-center space-x-3">
              <Link
                to="/college/applications"
                className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition"
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
                      Cycle {application.currentCycle} (Resubmitted)
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
                    : 'N/A'}
                </p>
              </div>
            </div>

            <div className="text-left sm:text-right text-xs text-slate-500">
              <div>Scholarship Scheme:</div>
              <div className="font-bold text-slate-800">{application.scholarship?.name}</div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center space-x-2 overflow-x-auto border-b border-slate-100 pb-1 scrollbar-none">
            {[
              { id: 'profile', label: 'Student Profile', icon: User },
              { id: 'scheme', label: 'Scheme & Eligibility', icon: GraduationCap },
              { id: 'questionnaire', label: 'Questionnaire', icon: HelpCircle },
              { id: 'documents', label: `Documents (${documentSnapshots?.length || 0})`, icon: FileText },
              { id: 'history', label: `Multi-Cycle History (${multiCycleHistory?.length || 1})`, icon: History },
              { id: 'audit', label: `Audit Trail (${auditLogs?.length || 0})`, icon: Layers },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                    activeTab === tab.id
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab 1: Student Profile */}
        {activeTab === 'profile' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-6">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center space-x-2">
              <User className="w-4 h-4 text-blue-600" />
              <span>Applicant Profile Data (Frozen Cycle {application.currentCycle} Snapshot)</span>
            </h3>

            {/* Grid Sections */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Personal */}
              <div className="space-y-3 p-4 rounded-xl bg-slate-50/70 border border-slate-200">
                <h4 className="text-xs font-bold uppercase tracking-wider text-blue-700">
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
                    <span className="text-slate-500">Caste Category:</span>{' '}
                    <strong className="text-slate-800">{personal.category || 'N/A'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Religion:</span>{' '}
                    <strong className="text-slate-800">{personal.religion || 'N/A'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Handicapped / PwD:</span>{' '}
                    <strong className="text-slate-800">
                      {personal.isHandicapped ? `Yes (${personal.disabilityPercentage}%)` : 'No'}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Academic */}
              <div className="space-y-3 p-4 rounded-xl bg-slate-50/70 border border-slate-200">
                <h4 className="text-xs font-bold uppercase tracking-wider text-blue-700">
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
                </div>
              </div>

              {/* Financial & Contact */}
              <div className="space-y-3 p-4 rounded-xl bg-slate-50/70 border border-slate-200">
                <h4 className="text-xs font-bold uppercase tracking-wider text-blue-700">
                  Income & Banking
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
              <GraduationCap className="w-4 h-4 text-blue-600" />
              <span>Scholarship Scheme Criteria & Eligibility Evaluation</span>
            </h3>

            {/* Scheme Metadata */}
            <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div>
                <div className="font-bold text-slate-900 text-sm">{application.scholarship?.name}</div>
                <div className="text-slate-500 font-mono mt-0.5">
                  Code: {application.scholarship?.code} • Department: {application.scholarship?.department?.name}
                </div>
              </div>
              <div className="text-right">
                <span className="text-slate-500">Estimated Benefit:</span>{' '}
                <strong className="text-blue-900 font-mono text-sm">
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
              <HelpCircle className="w-4 h-4 text-blue-600" />
              <span>Questionnaire Declarations Submitted by Applicant</span>
            </h3>

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
          </div>
        )}

        {/* Tab 4: Documents Scrutiny Desk */}
        {activeTab === 'documents' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <FileText className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Frozen Uploaded Documents (Cycle {application.currentCycle})
                </h3>
              </div>
              <span className="text-xs text-slate-500 font-medium">
                {documentSnapshots?.length || 0} attached document(s)
              </span>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              These documents were permanently frozen into the application snapshot at the time of submission.
              Click <strong>"Preview Inline"</strong> to visually verify authenticity and legibility.
            </p>

            {documentSnapshots?.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {documentSnapshots.map((ds) => {
                  const doc = ds.documentVersion;
                  return (
                    <div
                      key={ds.id}
                      className="p-4 rounded-xl border border-slate-200 hover:border-blue-300 bg-slate-50/50 transition flex flex-col justify-between space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-2.5">
                          <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
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
                            JPG Compressed
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
                                previewUrl: doc.previewUrl,
                                downloadUrl: doc.downloadUrl,
                                title: ds.documentType,
                                filename: doc.originalFilename,
                                mimeType: doc.mimeType,
                              })
                            }
                            className="inline-flex items-center space-x-1 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-2xs transition"
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

        {/* Tab 5: Multi-Cycle History */}
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

                      {/* Student's Resolution Details */}
                      {corr.studentResponseText && (
                        <div className="p-3 rounded-lg bg-white border border-slate-200 text-xs text-slate-700">
                          <span className="font-bold text-purple-700">Student Resolution Note:</span>{' '}
                          {corr.studentResponseText}
                        </div>
                      )}

                      {/* Quick Review actions for this item if under college review */}
                      {application.status === 'UNDER_COLLEGE_REVIEW' &&
                        corr.status === 'RESOLVED_BY_STUDENT' && (
                          <div className="pt-2 border-t border-slate-200 flex items-center justify-end space-x-2">
                            <button
                              type="button"
                              onClick={() => handleReviewCorrection(corr.id, 'RE_FLAG', 'Still unsatisfactory')}
                              disabled={actionLoading}
                              className="px-3 py-1 rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-bold transition"
                            >
                              Re-Flag Discrepancy
                            </button>
                            <button
                              type="button"
                              onClick={() => handleReviewCorrection(corr.id, 'ACCEPT')}
                              disabled={actionLoading}
                              className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition"
                            >
                              Accept Resolution
                            </button>
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

        {/* Tab 6: Audit Trail */}
        {activeTab === 'audit' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-6">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center space-x-2">
              <Layers className="w-4 h-4 text-blue-600" />
              <span>Persisted Application Audit Trail</span>
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

      {/* Sticky Institutional Scrutiny Action Bar */}
      <footer className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-slate-200 p-4 z-40 shadow-lg">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs text-slate-600">
            Current Status:{' '}
            <strong className="text-slate-900 font-bold">{application.status}</strong>
            {application.status === 'UNDER_COLLEGE_REVIEW' && (
              <span className="text-blue-600 font-semibold ml-2">
                • Scrutiny in progress by your college
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
                className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs hover:shadow transition disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5" />
                <span>{actionLoading ? 'Starting...' : 'Start Scrutiny'}</span>
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

            {allowedActions.includes('VERIFY_FORWARD') && (
              <button
                type="button"
                onClick={() => setIsForwardOpen(true)}
                disabled={actionLoading}
                className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs hover:shadow transition disabled:opacity-50"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Verify & Forward to Authority</span>
              </button>
            )}
          </div>
        </div>
      </footer>

      {/* Modals */}
      <SendBackModal
        isOpen={isSendBackOpen}
        onClose={() => setIsSendBackOpen(false)}
        onSubmit={handleDecisionSubmit}
        isSubmitting={actionLoading}
      />

      <RejectModal
        isOpen={isRejectOpen}
        onClose={() => setIsRejectOpen(false)}
        onSubmit={handleDecisionSubmit}
        isSubmitting={actionLoading}
      />

      <ForwardModal
        isOpen={isForwardOpen}
        onClose={() => setIsForwardOpen(false)}
        onSubmit={handleDecisionSubmit}
        isSubmitting={actionLoading}
      />

      <DocumentPreviewModal
        isOpen={!!previewDoc}
        onClose={() => setPreviewDoc(null)}
        previewUrl={previewDoc?.previewUrl}
        downloadUrl={previewDoc?.downloadUrl}
        title={previewDoc?.title}
        filename={previewDoc?.filename}
        mimeType={previewDoc?.mimeType}
      />
    </div>
  );
}
