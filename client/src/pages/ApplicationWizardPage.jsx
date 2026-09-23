import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import { DocumentUploadModal } from '../components/DocumentUploadModal';
import { DocumentPreviewModal } from '../components/DocumentPreviewModal';
import {
  FileText,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  Building2,
  User,
  Clock,
  ExternalLink,
  Upload,
  Eye,
  AlertCircle,
  Loader2,
  Check,
  Send,
  HelpCircle,
  RotateCcw,
  Download,
} from 'lucide-react';

const STEPS = [
  { id: 1, label: 'Profile' },
  { id: 2, label: 'Questionnaire' },
  { id: 3, label: 'Documents' },
  { id: 4, label: 'Readiness' },
  { id: 5, label: 'Review & Submit' },
];

export function ApplicationWizardPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] = useState(1);
  const [application, setApplication] = useState(null);
  const [readiness, setReadiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');

  // Form State
  const [questionnaire, setQuestionnaire] = useState({});
  const [selectedDocuments, setSelectedDocuments] = useState({});
  const [declarationAccepted, setDeclarationAccepted] = useState(false);

  // Upload & Preview Modals
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadDocType, setUploadDocType] = useState(null);
  const [availableTypes, setAvailableTypes] = useState([]);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  useEffect(() => {
    fetchApplicationData();
  }, [id]);

  const fetchApplicationData = async () => {
    setLoading(true);
    setError('');
    try {
      const [appRes, typesRes] = await Promise.all([
        api.getApplicationById(id),
        api.getDocumentTypes().catch(() => ({ types: [] })),
      ]);

      const app = appRes.application;
      setApplication(app);
      setAvailableTypes(typesRes.types || []);

      // Initialize form state from draft
      setQuestionnaire(app.questionnaireResponses || {});
      setDeclarationAccepted(Boolean(app.declarationAccepted));

      // Build initial document selections
      const docSelections = {};
      for (const doc of app.documentsChecklist || []) {
        if (doc.attachedVersionId) {
          docSelections[doc.documentType] = doc.attachedVersionId;
        }
      }
      setSelectedDocuments(docSelections);

      // If already submitted, navigate directly to tracking view
      if (app.status !== 'DRAFT') {
        navigate(`/applications/${id}`, { replace: true });
        return;
      }

      // Fetch live readiness check
      const readyRes = await api.getApplicationReadiness(id).catch(() => null);
      if (readyRes) setReadiness(readyRes);
    } catch (err) {
      setError(err.message || 'Failed to load application.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDraft = async (newQuestionnaire = questionnaire, newSelectedDocs = selectedDocuments, newDecl = declarationAccepted) => {
    if (!application || application.status !== 'DRAFT') return;
    setSaving(true);
    setError('');
    setSaveSuccess('');

    try {
      const res = await api.saveApplicationDraft(id, {
        questionnaire: newQuestionnaire,
        selectedDocuments: newSelectedDocs,
        declarationAccepted: newDecl,
      });
      setApplication(res.application);
      setSaveSuccess('Draft saved');
      setTimeout(() => setSaveSuccess(''), 3000);

      // Refresh readiness
      const readyRes = await api.getApplicationReadiness(id).catch(() => null);
      if (readyRes) setReadiness(readyRes);
    } catch (err) {
      setError(err.message || 'Failed to save draft.');
    } finally {
      setSaving(false);
    }
  };

  const handleQuestionnaireChange = (fieldKey, val) => {
    const updated = { ...questionnaire, [fieldKey]: val };
    setQuestionnaire(updated);
  };

  const handleToggleOptionalDoc = (docType, versionId) => {
    const next = { ...selectedDocuments };
    if (next[docType]) {
      delete next[docType];
    } else if (versionId) {
      next[docType] = versionId;
    }
    setSelectedDocuments(next);
    handleSaveDraft(questionnaire, next, declarationAccepted);
  };

  const handleUploadSuccess = () => {
    setIsUploadModalOpen(false);
    fetchApplicationData();
  };

  const handleOpenUploadModal = (docType) => {
    setUploadDocType(docType);
    setIsUploadModalOpen(true);
  };

  const handleFinalSubmit = async () => {
    if (!declarationAccepted) {
      setError('You must accept the declaration undertaking before submitting.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      // First ensure draft is completely saved
      await api.saveApplicationDraft(id, {
        questionnaire,
        selectedDocuments,
        declarationAccepted: true,
      });

      const res = await api.submitApplication(id, { declarationAccepted: true });
      navigate(`/applications/${id}`);
    } catch (err) {
      setError(err.message || 'Submission failed.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-medium text-slate-600">Loading application workspace...</p>
        </div>
      </div>
    );
  }

  if (!application) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Application Unavailable</h2>
          <p className="text-xs text-slate-500">{error || 'Could not locate the requested application.'}</p>
          <Link
            to="/applications"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold"
          >
            Back to My Applications
          </Link>
        </div>
      </div>
    );
  }

  const isDraft = application.status === 'DRAFT';
  const scholarship = application.scholarship;
  const student = application.studentSummary;
  const mandatoryDocs = (application.documentsChecklist || []).filter((d) => d.isMandatory);
  const optionalDocs = (application.documentsChecklist || []).filter((d) => !d.isMandatory);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      {/* Top Sticky Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            <Link
              to="/applications"
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors shrink-0"
              title="Back to Applications"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="overflow-hidden">
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold text-slate-900 truncate">
                  {scholarship.name}
                </h1>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                    isDraft
                      ? 'bg-amber-100 text-amber-800 border border-amber-200'
                      : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  }`}
                >
                  {application.status}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 truncate">
                {scholarship.code} • Academic Year {scholarship.academicYear}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {saveSuccess && (
              <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1 animate-in fade-in">
                <Check className="w-3.5 h-3.5" /> <span className="hidden sm:inline">{saveSuccess}</span>
              </span>
            )}
            {isDraft && (
              <button
                onClick={() => handleSaveDraft()}
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                title="Save Draft"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">Save Draft</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {/* Stepper Navigation Bar */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-6 shadow-xs overflow-x-auto">
          <div className="flex items-center justify-between min-w-[500px]">
            {STEPS.map((step, idx) => {
              const isActive = currentStep === step.id;
              const isPast = currentStep > step.id;

              return (
                <div key={step.id} className="flex items-center flex-1 last:flex-initial">
                  <button
                    onClick={() => {
                      if (isDraft) {
                        handleSaveDraft();
                        setCurrentStep(step.id);
                      } else {
                        setCurrentStep(step.id);
                      }
                    }}
                    className={`flex items-center gap-2.5 group text-left cursor-pointer transition-colors ${
                      isActive ? 'text-indigo-600 font-bold' : isPast ? 'text-emerald-700 font-medium' : 'text-slate-400'
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                        isActive
                          ? 'bg-indigo-600 text-white shadow-xs ring-4 ring-indigo-50'
                          : isPast
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {isPast ? <Check className="w-4 h-4" /> : step.id}
                    </div>
                    <span className="text-xs">{step.label}</span>
                  </button>
                  {idx < STEPS.length - 1 && (
                    <div
                      className={`flex-1 h-0.5 mx-4 transition-colors ${
                        isPast ? 'bg-emerald-300' : 'bg-slate-200'
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Global Error Banner */}
        {error && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3 text-rose-800 text-xs">
            <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
            <p className="leading-relaxed font-medium">{error}</p>
          </div>
        )}

        {/* STEP 1: Student Profile Confirmation */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <User className="w-5 h-5 text-indigo-600" />
                    Verified Student Profile Information
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Your institutional, demographic, and banking details are sourced directly from your verified profile.
                  </p>
                </div>
                <Link
                  to="/profile"
                  target="_blank"
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1"
                >
                  Edit Profile <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Full Name</span>
                  <p className="text-sm font-semibold text-slate-900">{student.fullName || 'Not Provided'}</p>
                </div>
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Caste Category</span>
                  <p className="text-sm font-semibold text-slate-900">{student.category || 'Not Provided'}</p>
                </div>
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Annual Family Income</span>
                  <p className="text-sm font-semibold text-slate-900">
                    {student.annualFamilyIncome ? `₹${student.annualFamilyIncome.toLocaleString('en-IN')}` : 'Not Provided'}
                  </p>
                </div>
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Enrolled College</span>
                  <p className="text-sm font-semibold text-slate-900 line-clamp-1">{student.collegeName}</p>
                </div>
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Current Course</span>
                  <p className="text-sm font-semibold text-slate-900">{student.courseName || 'Not Provided'}</p>
                </div>
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Disbursement Bank Account</span>
                  <p className="text-sm font-semibold text-slate-900 font-mono">
                    {student.bankAccountNo ? `${student.bankAccountNo} (${student.bankIfsc})` : 'Not Provided'}
                  </p>
                </div>
              </div>

              <div className="p-3.5 bg-indigo-50/60 border border-indigo-100 rounded-xl text-xs text-indigo-900 flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
                <p>
                  <strong>Profile Immutability Rule:</strong> When you submit this application, an immutable snapshot of these facts will be permanently frozen. Any future profile updates will not alter submitted records.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-end pt-2">
              <button
                onClick={() => {
                  handleSaveDraft();
                  setCurrentStep(2);
                }}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                Continue to Questionnaire <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Scheme Questionnaire */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-600" />
                  Scheme-Specific Questionnaire
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Please provide specific academic and accommodation details required for this scheme.
                </p>
              </div>

              {application.questionnaireSchema && application.questionnaireSchema.length > 0 ? (
                <div className="space-y-4 pt-2">
                  {application.questionnaireSchema.map((field) => {
                    const value = questionnaire[field.fieldKey] !== undefined ? questionnaire[field.fieldKey] : '';

                    return (
                      <div key={field.fieldKey} className="space-y-1.5">
                        <label className="block text-xs font-bold text-slate-800">
                          {field.label} {field.required && <span className="text-rose-500">*</span>}
                        </label>
                        {field.helpText && (
                          <p className="text-[11px] text-slate-500">{field.helpText}</p>
                        )}

                        {field.type === 'TEXT' && (
                          <input
                            type="text"
                            value={value}
                            disabled={!isDraft}
                            onChange={(e) => handleQuestionnaireChange(field.fieldKey, e.target.value)}
                            placeholder={field.placeholder || ''}
                            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white disabled:bg-slate-100"
                          />
                        )}

                        {field.type === 'DATE' && (
                          <input
                            type="date"
                            value={value}
                            disabled={!isDraft}
                            onChange={(e) => handleQuestionnaireChange(field.fieldKey, e.target.value)}
                            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white disabled:bg-slate-100"
                          />
                        )}

                        {field.type === 'BOOLEAN' && (
                          <div className="flex items-center gap-4 pt-1">
                            <label className="inline-flex items-center gap-2 text-xs font-medium cursor-pointer">
                              <input
                                type="radio"
                                name={field.fieldKey}
                                checked={value === true}
                                disabled={!isDraft}
                                onChange={() => handleQuestionnaireChange(field.fieldKey, true)}
                                className="text-indigo-600 focus:ring-indigo-500"
                              />
                              Yes
                            </label>
                            <label className="inline-flex items-center gap-2 text-xs font-medium cursor-pointer">
                              <input
                                type="radio"
                                name={field.fieldKey}
                                checked={value === false}
                                disabled={!isDraft}
                                onChange={() => handleQuestionnaireChange(field.fieldKey, false)}
                                className="text-indigo-600 focus:ring-indigo-500"
                              />
                              No
                            </label>
                          </div>
                        )}

                        {(field.type === 'RADIO' || field.type === 'SELECT') && (
                          <div className="space-y-2 pt-1">
                            {(field.options || []).map((opt) => {
                              const optVal = typeof opt === 'string' ? opt : opt.value;
                              const optLabel = typeof opt === 'string' ? opt : opt.label;
                              return (
                                <label key={optVal} className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
                                  <input
                                    type="radio"
                                    name={field.fieldKey}
                                    value={optVal}
                                    checked={value === optVal}
                                    disabled={!isDraft}
                                    onChange={(e) => handleQuestionnaireChange(field.fieldKey, e.target.value)}
                                    className="text-indigo-600 focus:ring-indigo-500"
                                  />
                                  <span>{optLabel}</span>
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-4 bg-slate-50 rounded-xl text-xs text-slate-500">
                  No additional questionnaire answers required for this scheme.
                </div>
              )}
            </div>

            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
              <button
                onClick={() => {
                  handleSaveDraft();
                  setCurrentStep(1);
                }}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-slate-600 hover:bg-slate-200/60 rounded-xl text-xs font-semibold cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Profile
              </button>

              <button
                onClick={() => {
                  handleSaveDraft();
                  setCurrentStep(3);
                }}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                Continue to Documents <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Required Document Attachments */}
        {currentStep === 3 && (
          <div className="space-y-6">
            {/* Mandatory Documents Section */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-indigo-600" />
                  Mandatory Required Certificates
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  The latest version of each mandatory certificate in your Document Vault is automatically attached.
                </p>
              </div>

              <div className="space-y-3 pt-1">
                {mandatoryDocs.length > 0 ? (
                  mandatoryDocs.map((doc) => {
                    const isAttached = doc.status === 'ATTACHED' && doc.attachedVersion;

                    return (
                      <div
                        key={doc.id}
                        className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          isAttached
                            ? 'bg-emerald-50/40 border-emerald-200/80'
                            : 'bg-amber-50/50 border-amber-200'
                        }`}
                      >
                        <div className="overflow-hidden">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900">{doc.helpTitle}</span>
                            <span className="text-[10px] font-bold text-rose-600 uppercase bg-rose-50 px-1.5 py-0.2 rounded border border-rose-100">
                              Mandatory
                            </span>
                          </div>
                          {doc.helpTextSimple && (
                            <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{doc.helpTextSimple}</p>
                          )}

                          {isAttached ? (
                            <div className="mt-2 flex items-center gap-2 text-xs text-emerald-800">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span className="font-semibold truncate max-w-xs">{doc.attachedVersion.originalFilename}</span>
                              <span className="text-[11px] text-emerald-700 bg-white px-1.5 py-0.2 rounded border border-emerald-200">
                                v{doc.attachedVersion.versionNumber}
                              </span>
                              {doc.attachedVersion.isCompressed && (
                                <span className="text-[10px] text-emerald-700 bg-emerald-100/70 px-1.5 py-0.2 rounded font-semibold">
                                  Compressed
                                </span>
                              )}
                            </div>
                          ) : (
                            <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-800 font-medium">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                              <span>Not found in your Document Vault. Upload required before submission.</span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {isAttached && (
                            <button
                              type="button"
                              onClick={() => {
                                setPreviewDoc({
                                  id: doc.documentId || doc.attachedVersion?.documentId,
                                  typeInfo: { label: doc.helpTitle },
                                  currentVersion: doc.attachedVersion,
                                });
                                setIsPreviewOpen(true);
                              }}
                              className="px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-white hover:bg-emerald-50 rounded-lg border border-emerald-200 transition-colors inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" /> Preview
                            </button>
                          )}

                          {isDraft && (
                            <button
                              type="button"
                              onClick={() => handleOpenUploadModal(doc.documentType)}
                              className="px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-white hover:bg-indigo-50 rounded-lg border border-indigo-200 transition-colors inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Upload className="w-3.5 h-3.5" />
                              {isAttached ? 'Upload New Version' : 'Upload to Vault'}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-slate-500 italic">No mandatory documents required for this scheme.</p>
                )}
              </div>
            </div>

            {/* Optional Documents Section */}
            {optionalDocs.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-slate-400" />
                    Optional Supporting Documents (Does Not Block Submission)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    These certificates are optional. You may attach them from your vault if applicable to your application.
                  </p>
                </div>

                <div className="space-y-3 pt-1">
                  {optionalDocs.map((doc) => {
                    const isAttached = Boolean(selectedDocuments[doc.documentType]);
                    const currentVaultVer = doc.vaultCurrentVersion;

                    return (
                      <div
                        key={doc.id}
                        className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
                          isAttached
                            ? 'bg-emerald-50/40 border-emerald-200/80'
                            : 'bg-slate-50/70 border-slate-200'
                        }`}
                      >
                        <div className="overflow-hidden">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">{doc.helpTitle}</span>
                            <span className="text-[10px] font-semibold text-slate-500 bg-white px-1.5 py-0.2 rounded border border-slate-200">
                              Optional
                            </span>
                            {isAttached && (
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/70 px-1.5 py-0.2 rounded border border-emerald-200">
                                Attached
                              </span>
                            )}
                          </div>
                          {doc.helpTextSimple && (
                            <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{doc.helpTextSimple}</p>
                          )}

                          {doc.hasInVault && currentVaultVer ? (
                            <div className="mt-2 flex items-center gap-2 text-xs text-slate-600">
                              <span className="font-semibold truncate max-w-xs">{currentVaultVer.originalFilename}</span>
                              <span className="text-[11px] text-slate-600 bg-white px-1.5 py-0.2 rounded border border-slate-200">
                                v{currentVaultVer.versionNumber}
                              </span>
                              {currentVaultVer.fileSizeFormatted && (
                                <span className="text-[11px] text-slate-400">
                                  {currentVaultVer.fileSizeFormatted}
                                </span>
                              )}
                            </div>
                          ) : (
                            <p className="mt-2 text-[11px] text-slate-400 italic">
                              Not found in your Document Vault (Optional - does not block submission).
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {doc.hasInVault && currentVaultVer && (
                            <button
                              type="button"
                              onClick={() => {
                                setPreviewDoc({
                                  id: doc.documentId || currentVaultVer.documentId,
                                  typeInfo: { label: doc.helpTitle },
                                  currentVersion: currentVaultVer,
                                });
                                setIsPreviewOpen(true);
                              }}
                              className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 rounded-lg border border-slate-200 transition-colors inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" /> Preview
                            </button>
                          )}

                          {isDraft && doc.hasInVault && (
                            <button
                              type="button"
                              onClick={() =>
                                handleToggleOptionalDoc(doc.documentType, currentVaultVer?.id)
                              }
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                                isAttached
                                  ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                                  : 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700'
                              }`}
                            >
                              {isAttached ? 'Detach' : 'Attach from Vault'}
                            </button>
                          )}

                          {isDraft && (
                            <button
                              type="button"
                              onClick={() => handleOpenUploadModal(doc.documentType)}
                              className="px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-white hover:bg-indigo-50 rounded-lg border border-indigo-200 transition-colors inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Upload className="w-3.5 h-3.5" />
                              {doc.hasInVault ? 'Upload New Version' : 'Upload to Vault'}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
              <button
                onClick={() => {
                  handleSaveDraft();
                  setCurrentStep(2);
                }}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-slate-600 hover:bg-slate-200/60 rounded-xl text-xs font-semibold cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Questionnaire
              </button>

              <button
                onClick={() => {
                  handleSaveDraft();
                  setCurrentStep(4);
                }}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                Check Readiness <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Application Readiness Check */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-indigo-600" />
                    Application Readiness Evaluation
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Automated system verification of all institutional, document, and eligibility criteria.
                  </p>
                </div>

                <div className="text-right">
                  <span
                    className={`inline-flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full ${
                      readiness?.isReady
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {readiness?.isReady ? <Check className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                    {readiness?.isReady ? 'Ready to Submit' : 'Action Required'}
                  </span>
                </div>
              </div>

              {/* Live Readiness Health Card */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-800">Readiness Score</p>
                  <p className="text-[11px] text-slate-500">
                    {readiness?.isReady
                      ? 'All criteria satisfied. You may proceed to final preview and submission.'
                      : `${readiness?.blockerCount || 0} blocker(s) must be resolved prior to submission.`}
                  </p>
                </div>
                <span className="text-2xl font-extrabold text-indigo-600">
                  {readiness?.readinessScore || 0}%
                </span>
              </div>

              {/* Blockers list */}
              {readiness?.blockers && readiness.blockers.length > 0 ? (
                <div className="space-y-2.5 pt-1">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-rose-800">
                    Items Requiring Your Attention
                  </h4>
                  {readiness.blockers.map((b, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start justify-between gap-3 text-xs"
                    >
                      <div className="flex items-start gap-2.5">
                        <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
                        <div>
                          <p className="font-semibold text-rose-900">{b.message}</p>
                          <span className="text-[10px] font-bold text-rose-700 uppercase">{b.category}</span>
                        </div>
                      </div>

                      {b.actionUrl && (
                        <Link
                          to={b.actionUrl}
                          className="px-2.5 py-1 bg-white hover:bg-rose-100 text-rose-800 font-semibold rounded border border-rose-200 shrink-0"
                        >
                          Resolve
                        </Link>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 text-emerald-800 text-xs">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <p className="font-bold">Zero Blockers Detected</p>
                    <p className="text-emerald-700 mt-0.5">
                      Your profile, questionnaire, documents, and eligibility are in complete order.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
              <button
                onClick={() => {
                  handleSaveDraft();
                  setCurrentStep(3);
                }}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-slate-600 hover:bg-slate-200/60 rounded-xl text-xs font-semibold cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Documents
              </button>

              <button
                onClick={() => {
                  handleSaveDraft();
                  setCurrentStep(5);
                }}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                Proceed to Final Review <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 5: Final Review & Submission / Success View */}
        {currentStep === 5 && (
          <div className="space-y-6">
            {!isDraft ? (
              /* SUBMITTED SUCCESS VIEW */
              <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-12 text-center max-w-2xl mx-auto shadow-xs space-y-6">
                <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                    Application Formally Submitted
                  </span>
                  <h2 className="text-2xl font-extrabold text-slate-900 mt-3">
                    Application Reference Number (ARN)
                  </h2>
                  <p className="text-2xl font-mono font-black text-indigo-600 tracking-wider mt-1">
                    {application.applicationNumber}
                  </p>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 text-left text-xs space-y-2 max-w-md mx-auto">
                  <div className="flex justify-between py-1 border-b border-slate-200">
                    <span className="text-slate-500">Scheme:</span>
                    <span className="font-semibold text-slate-800">{scholarship.name}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200">
                    <span className="text-slate-500">Submitted At:</span>
                    <span className="font-medium text-slate-800">
                      {new Date(application.submittedAt || application.updatedAt).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">Status:</span>
                    <span className="font-bold text-emerald-700">SUBMITTED (Pending College Review)</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <a
                    href={api.getApplicationPdfUrl(application.id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                  >
                    <Eye className="w-4 h-4" /> View Application PDF
                  </a>
                  <a
                    href={api.getApplicationPdfUrl(application.id, true)}
                    download={`${application.applicationNumber}.pdf`}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer border border-slate-200"
                  >
                    <Download className="w-4 h-4" /> Download Application PDF
                  </a>
                  <Link
                    to="/applications"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
                  >
                    View My Applications
                  </Link>
                  <Link
                    to="/dashboard"
                    className="inline-flex items-center gap-2 px-4 py-2.5 text-slate-500 hover:text-slate-700 rounded-xl text-xs font-semibold transition-all"
                  >
                    Dashboard
                  </Link>
                </div>
              </div>
            ) : (
              /* DRAFT FINAL REVIEW & SUBMIT FORM */
              <div className="space-y-6">
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <FileText className="w-5 h-5 text-indigo-600" />
                      Final Application Review
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Carefully review your information before formal submission. Once submitted, this application is locked.
                    </p>
                  </div>

                  {/* Review Summary Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
                      <h4 className="font-bold text-slate-900 uppercase text-[10px] tracking-wider text-indigo-700">
                        Applicant Information
                      </h4>
                      <p><strong className="text-slate-700">Name:</strong> {student.fullName}</p>
                      <p><strong className="text-slate-700">Category:</strong> {student.category}</p>
                      <p><strong className="text-slate-700">Annual Income:</strong> ₹{student.annualFamilyIncome?.toLocaleString('en-IN')}</p>
                      <p><strong className="text-slate-700">College:</strong> {student.collegeName}</p>
                      <p><strong className="text-slate-700">Bank Account:</strong> {student.bankAccountNo}</p>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
                      <h4 className="font-bold text-slate-900 uppercase text-[10px] tracking-wider text-indigo-700">
                        Scheme & Questionnaire Details
                      </h4>
                      <p><strong className="text-slate-700">Scheme Code:</strong> {scholarship.code}</p>
                      <p><strong className="text-slate-700">Benefit Amount:</strong> ₹{scholarship.benefitAmount?.toLocaleString('en-IN')}</p>
                      {Object.keys(questionnaire).map((k) => (
                        <p key={k}><strong className="text-slate-700">{k}:</strong> {String(questionnaire[k])}</p>
                      ))}
                    </div>
                  </div>

                  {/* Mandatory Legal Undertaking */}
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-3">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={declarationAccepted}
                        onChange={(e) => {
                          setDeclarationAccepted(e.target.checked);
                          handleSaveDraft(questionnaire, selectedDocuments, e.target.checked);
                        }}
                        className="mt-0.5 rounded border-amber-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                      />
                      <span className="text-xs text-amber-900 leading-relaxed font-medium">
                        I hereby solemnly declare that all statements made in this application are true, complete, and correct. I am not availing any duplicate scholarship for this course. I understand that any false declaration will lead to immediate cancellation and recovery.
                      </span>
                    </label>
                  </div>
                </div>

                <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
                  <button
                    onClick={() => setCurrentStep(4)}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-slate-600 hover:bg-slate-200/60 rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" /> Back to Readiness
                  </button>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <a
                      href={api.getApplicationPdfPreviewUrl(application.id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer border border-slate-200"
                    >
                      <Eye className="w-4 h-4" /> Preview Application PDF
                    </a>

                    <button
                      onClick={handleFinalSubmit}
                      disabled={submitting || !declarationAccepted || (readiness && !readiness.isReady)}
                      className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" /> Submitting Application...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" /> Submit Application
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Reusable Upload Modal */}
      <DocumentUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onSuccess={handleUploadSuccess}
        preselectedType={uploadDocType}
        availableTypes={availableTypes}
      />

      {/* Reusable Preview Modal */}
      <DocumentPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        document={previewDoc}
        selectedVersion={previewDoc?.currentVersion}
      />
    </div>
  );
}
