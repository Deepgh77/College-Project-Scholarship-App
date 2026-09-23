import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { DocumentUploadModal } from '../components/DocumentUploadModal';
import { DocumentPreviewModal } from '../components/DocumentPreviewModal';
import {
  FileText,
  Eye,
  Download,
  RefreshCw,
  History,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  ArrowLeft,
  Info,
  Clock,
  Plus,
  User,
  ArrowRight,
} from 'lucide-react';

const STANDARD_SCHEME_TYPES = [
  'INCOME_CERT',
  'CASTE_CERT',
  'DOMICILE_CERT',
  'MARKSHEET_PREV',
  'FEE_RECEIPT',
];

export function MyDocumentsPage() {
  const [documents, setDocuments] = useState([]);
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [isProfileMissing, setIsProfileMissing] = useState(false);

  // Modals state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [preselectedType, setPreselectedType] = useState(null);
  const [isReplacementModal, setIsReplacementModal] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [selectedDocForPreview, setSelectedDocForPreview] = useState(null);
  const [selectedVersionForPreview, setSelectedVersionForPreview] = useState(null);

  // Expanded version history card IDs
  const [expandedHistoryIds, setExpandedHistoryIds] = useState(new Set());

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    setError('');
    setIsProfileMissing(false);
    try {
      const [docsRes, typesRes] = await Promise.all([
        api.getMyDocuments(),
        api.getDocumentTypes(),
      ]);
      setDocuments(docsRes.documents || []);
      setTypes(typesRes.types || []);
    } catch (err) {
      if (
        err.status === 404 &&
        (err.message?.includes('Student profile not found') ||
          err.data?.message?.includes('Student profile not found'))
      ) {
        setIsProfileMissing(true);
        // Attempt to fetch types independently so checklist descriptions render
        try {
          const typesRes = await api.getDocumentTypes();
          setTypes(typesRes.types || []);
        } catch {}
      } else {
        setError(err.message || 'Failed to load documents.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUploadClick = (docType = null, isReplacement = false) => {
    if (isProfileMissing) return;
    setPreselectedType(docType);
    setIsReplacementModal(isReplacement);
    setIsUploadModalOpen(true);
  };

  const handleUploadSuccess = (response) => {
    setActionSuccess(response.message || 'Document saved successfully.');
    fetchInitialData();
    setTimeout(() => setActionSuccess(''), 4000);
  };

  const handlePreview = (doc, version = null) => {
    setSelectedDocForPreview(doc);
    setSelectedVersionForPreview(version);
    setIsPreviewModalOpen(true);
  };

  const toggleHistory = (docId) => {
    setExpandedHistoryIds((prev) => {
      const next = new Set(prev);
      if (next.has(docId)) {
        next.delete(docId);
      } else {
        next.add(docId);
      }
      return next;
    });
  };

  const handleDelete = async (doc) => {
    const confirm = window.confirm(
      `Are you sure you want to delete your ${doc.typeInfo?.label || doc.documentType}? This will delete all versions unless linked to a submitted application.`
    );
    if (!confirm) return;

    try {
      await api.deleteDocument(doc.id);
      setActionSuccess('Document deleted successfully.');
      fetchInitialData();
      setTimeout(() => setActionSuccess(''), 4000);
    } catch (err) {
      alert(err.message || 'Failed to delete document.');
    }
  };

  // Compute standard checklist statistics
  const uploadedTypeSet = new Set(documents.map((d) => d.documentType));
  const standardCompletedCount = STANDARD_SCHEME_TYPES.filter((t) =>
    uploadedTypeSet.has(t)
  ).length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      {/* Top Navigation */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-4 overflow-hidden">
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </Link>
            <span className="text-slate-300 hidden sm:inline">|</span>
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
                DV
              </div>
              <h1 className="text-sm sm:text-base font-bold text-slate-900 truncate">Document Vault</h1>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <Link
              to="/scholarships"
              className="hidden md:inline-block text-xs font-medium text-slate-600 hover:text-indigo-600 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Scholarship Catalog
            </Link>

            {/* Global Top-Right Action: + Add Document */}
            {isProfileMissing ? (
              <Link
                to="/profile"
                className="inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 sm:py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-all"
              >
                <User className="w-4 h-4" />
                <span className="hidden sm:inline">Complete Profile</span>
                <span className="sm:hidden">Profile</span>
              </Link>
            ) : (
              <button
                onClick={() => handleUploadClick(null, false)}
                className="inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 sm:py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Document</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* Document Vault Notice */}
        <div className="mb-6 p-4 bg-indigo-50/60 border border-indigo-100 rounded-2xl flex items-start gap-3 text-indigo-900 text-xs">
          <Info className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
          <p className="leading-relaxed">
            <strong className="font-semibold">Document Vault:</strong> Upload and manage your scholarship documents in a central vault. Documents are securely stored and versioned immutably for your scholarship applications.
          </p>
        </div>

        {/* Profile Prerequisite Warning Banner */}
        {isProfileMissing && (
          <div className="mb-8 p-6 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-amber-900">Student Profile Setup Required</h3>
                <p className="text-xs text-amber-800 mt-1 max-w-2xl leading-relaxed">
                  Before you can upload and manage certificates in your document vault, you must
                  complete your student profile. Your verified profile information is required to
                  associate documents with your student identity.
                </p>
              </div>
            </div>
            <Link
              to="/profile"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors shrink-0"
            >
              <User className="w-4 h-4" />
              Complete Profile Now
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

        {/* Feedback Alerts */}
        {actionSuccess && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-800 text-sm font-medium animate-in fade-in">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
        )}

        {error && !isProfileMissing && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-rose-800 text-sm font-medium">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Header Stats Banner */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Total Documents in Vault
              </p>
              <h2 className="text-3xl font-extrabold text-slate-900 mt-1">
                {documents.length}
              </h2>
              <p className="text-xs text-slate-500 mt-1">Reusable across applications</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <FileText className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Standard Scheme Readiness
              </p>
              <h2 className="text-3xl font-extrabold text-slate-900 mt-1">
                {standardCompletedCount} / {STANDARD_SCHEME_TYPES.length}
              </h2>
              <p className="text-xs text-slate-500 mt-1">Standard post-matric criteria</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Immutability & Security
              </p>
              <div className="flex items-center gap-2 mt-1">
                <ShieldCheck className="w-6 h-6 text-indigo-600" />
                <span className="text-base font-bold text-slate-900">Versioned Vault</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">Protected historical snapshots</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-slate-50 text-slate-600 flex items-center justify-center">
              <Clock className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Standard Scheme Documents Checklist */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 mb-8 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Standard Scholarship Document Checklist
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Core documents commonly required for scholarship applications.
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg">
              {Math.round((standardCompletedCount / STANDARD_SCHEME_TYPES.length) * 100)}% Complete
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
            {STANDARD_SCHEME_TYPES.map((typeKey) => {
              const typeInfo = types.find((t) => t.documentType === typeKey);
              const uploadedDoc = documents.find((d) => d.documentType === typeKey);
              const label = typeInfo?.label || typeKey;

              return (
                <div
                  key={typeKey}
                  className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between ${
                    uploadedDoc
                      ? 'bg-emerald-50/40 border-emerald-200/80'
                      : 'bg-slate-50 border-dashed border-slate-300'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-1.5">
                      <p className="text-xs font-bold text-slate-900 line-clamp-1">{label}</p>
                      {uploadedDoc ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 shrink-0">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          v{uploadedDoc.currentVersionNumber}
                        </span>
                      ) : (
                        <span className="text-[11px] font-medium text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 shrink-0">
                          Missing
                        </span>
                      )}
                    </div>
                    {uploadedDoc && (
                      <p className="text-[11px] text-emerald-800/80 font-medium mt-1 truncate">
                        Uploaded
                      </p>
                    )}
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                    {uploadedDoc ? (
                      <div className="w-full flex items-center justify-between">
                        <button
                          onClick={() => handlePreview(uploadedDoc)}
                          className="text-xs font-medium text-emerald-700 hover:text-emerald-900 inline-flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" /> View
                        </button>
                        <button
                          onClick={() => handleUploadClick(typeKey, true)}
                          className="text-xs font-medium text-slate-500 hover:text-slate-800"
                          title="Upload replacement version"
                        >
                          Replace
                        </button>
                      </div>
                    ) : isProfileMissing ? (
                      <Link
                        to="/profile"
                        className="text-xs font-semibold text-amber-700 hover:text-amber-800 inline-flex items-center gap-1 w-full justify-center"
                      >
                        Profile Required
                      </Link>
                    ) : (
                      <button
                        onClick={() => handleUploadClick(typeKey, false)}
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1 w-full text-left"
                        title={`Upload ${label}`}
                      >
                        <Plus className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">Upload {label}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* My Uploaded Documents Vault Grid */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Uploaded Documents</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage, preview, download, and track version histories of your uploaded certificates.
            </p>
          </div>
          <span className="text-xs font-medium text-slate-500">
            {documents.length} document{documents.length !== 1 ? 's' : ''} stored
          </span>
        </div>

        {loading ? (
          <div className="py-20 text-center">
            <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-slate-500">Loading your document vault...</p>
          </div>
        ) : isProfileMissing ? (
          <div className="bg-white border-2 border-dashed border-amber-200 rounded-3xl p-12 text-center max-w-xl mx-auto">
            <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <User className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Profile Setup Required
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mb-6">
              Complete your student profile with your name, category, and institute to unlock your
              document vault.
            </p>
            <Link
              to="/profile"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-all"
            >
              <User className="w-4 h-4" />
              Complete Profile
            </Link>
          </div>
        ) : documents.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center max-w-xl mx-auto">
            <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">Your vault is empty</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mb-6">
              Upload your scholarship certificates to your personal vault to use them across
              eligible schemes.
            </p>
            <button
              onClick={() => handleUploadClick(null, false)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              + Add Document
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {documents.map((doc) => {
              const current = doc.currentVersion;
              const isHistoryExpanded = expandedHistoryIds.has(doc.id);

              return (
                <div
                  key={doc.id}
                  className="bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between"
                >
                  <div className="p-6">
                    {/* Card Header */}
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shrink-0">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-slate-900">
                              {doc.typeInfo?.label || doc.documentType}
                            </h3>
                            <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[11px] font-bold rounded-md border border-indigo-100">
                              v{doc.currentVersionNumber}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                            {doc.typeInfo?.description}
                          </p>
                        </div>
                      </div>

                      <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 text-[11px] font-bold rounded-full border border-emerald-100 shrink-0">
                        {doc.status}
                      </span>
                    </div>

                    {/* File Details */}
                    {current && (
                      <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                        <div className="overflow-hidden pr-2">
                          <p className="font-semibold text-slate-800 truncate">
                            {current.originalFilename}
                          </p>
                          <p className="text-slate-500 text-[11px] mt-0.5 flex items-center flex-wrap gap-1">
                            <span>{current.fileSizeFormatted}</span>
                            {current.isCompressed && (
                              <span className="px-1.5 py-0.2 bg-emerald-50 text-emerald-700 text-[10px] font-semibold rounded border border-emerald-200">
                                Compressed
                              </span>
                            )}
                            <span>•</span>
                            <span>
                              Uploaded on{' '}
                              {new Date(current.uploadedAt).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </span>
                          </p>
                        </div>
                        <span className="uppercase text-[10px] font-bold tracking-wider text-slate-500 px-2 py-0.5 bg-white rounded border border-slate-200 shrink-0">
                          {current.mimeType.split('/')[1] || 'FILE'}
                        </span>
                      </div>
                    )}

                    {/* Version History Drawer */}
                    {doc.versionCount > 1 && (
                      <div className="mt-4 pt-3 border-t border-slate-100">
                        <button
                          onClick={() => toggleHistory(doc.id)}
                          className="w-full flex items-center justify-between text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
                        >
                          <span className="inline-flex items-center gap-1.5">
                            <History className="w-3.5 h-3.5 text-indigo-600" />
                            Version History ({doc.versionCount} iterations)
                          </span>
                          {isHistoryExpanded ? (
                            <ChevronUp className="w-4 h-4 text-slate-400" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-slate-400" />
                          )}
                        </button>

                        {isHistoryExpanded && (
                          <div className="mt-3 space-y-2 max-h-44 overflow-y-auto pr-1">
                            {doc.history.map((v) => (
                              <div
                                key={v.id}
                                className={`p-2.5 rounded-lg text-xs flex items-center justify-between border ${
                                  v.versionNumber === doc.currentVersionNumber
                                    ? 'bg-indigo-50/40 border-indigo-100'
                                    : 'bg-white border-slate-100'
                                }`}
                              >
                                <div className="overflow-hidden pr-2">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-slate-800">
                                      Version {v.versionNumber}
                                    </span>
                                    {v.versionNumber === doc.currentVersionNumber && (
                                      <span className="text-[10px] font-semibold text-indigo-600 uppercase">
                                        Current
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[11px] text-slate-500 truncate flex items-center gap-1.5 mt-0.5">
                                    <span>{v.originalFilename} • {v.fileSizeFormatted}</span>
                                    {v.isCompressed && (
                                      <span className="px-1 py-0.2 bg-emerald-50 text-emerald-700 text-[9px] font-semibold rounded border border-emerald-100">
                                        Compressed
                                      </span>
                                    )}
                                  </p>
                                </div>

                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    onClick={() => handlePreview(doc, v)}
                                    className="p-1.5 text-slate-500 hover:text-indigo-600 rounded hover:bg-white"
                                    title="Preview this version"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </button>
                                  <a
                                    href={api.getVersionDownloadUrl(doc.id, v.id)}
                                    download={v.originalFilename}
                                    className="p-1.5 text-slate-500 hover:text-indigo-600 rounded hover:bg-white"
                                    title="Download this version"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                  </a>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Card Actions Footer */}
                  <div className="px-6 py-3.5 bg-slate-50/60 border-t border-slate-100 rounded-b-2xl flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handlePreview(doc)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5 text-indigo-600" />
                        Preview
                      </button>
                      <a
                        href={api.getDocumentDownloadUrl(doc.id)}
                        download={current?.originalFilename}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 transition-colors"
                      >
                        <Download className="w-3.5 h-3.5 text-slate-600" />
                        Download
                      </a>
                      <button
                        onClick={() => handleUploadClick(doc.documentType, true)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 transition-colors"
                        title="Upload a new version to replace current"
                      >
                        <RefreshCw className="w-3.5 h-3.5 text-indigo-600" />
                        Replace
                      </button>
                    </div>

                    <button
                      onClick={() => handleDelete(doc)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Delete document"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Upload / Replace Modal */}
      <DocumentUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onSuccess={handleUploadSuccess}
        preselectedType={preselectedType}
        isReplacement={isReplacementModal}
        availableTypes={types}
      />

      {/* Preview Modal */}
      <DocumentPreviewModal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        document={selectedDocForPreview}
        selectedVersion={selectedVersionForPreview}
      />
    </div>
  );
}
