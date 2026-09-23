import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { compressDocumentImage, formatBytes } from '../utils/imageCompressor';
import {
  X,
  UploadCloud,
  FileText,
  AlertCircle,
  Loader2,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

export function DocumentUploadModal({
  isOpen,
  onClose,
  onSuccess,
  onUploadSuccess,
  preselectedType = null,
  preselectedDocType = null,
  isReplacement = false,
  availableTypes = [],
}) {
  const effectiveType = preselectedType || preselectedDocType;
  const effectiveSuccess = onSuccess || onUploadSuccess;

  const [documentType, setDocumentType] = useState('');
  const [rawFile, setRawFile] = useState(null);
  const [compressedResult, setCompressedResult] = useState(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setDocumentType(effectiveType || (availableTypes[0]?.documentType || ''));
      setRawFile(null);
      setCompressedResult(null);
      setIsCompressing(false);
      setIsSubmitting(false);
      setError('');
    }
  }, [isOpen, effectiveType, availableTypes]);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const selected = e.target.files && e.target.files[0];
    validateAndSetFile(selected);
  };

  const validateAndSetFile = (selected) => {
    setError('');
    setCompressedResult(null);
    if (!selected) return;

    const allowed = ['application/pdf', 'image/jpeg', 'image/png'];

    if (!allowed.includes(selected.type)) {
      setError('Invalid file type. Only PDF, JPG, and PNG documents are allowed.');
      setRawFile(null);
      return;
    }

    if (selected.size < 1024) {
      setError('File is too small or corrupt (minimum size is 1 KB).');
      setRawFile(null);
      return;
    }

    // PDF > 5 MB: No compression supported (protect seals, digital signatures, and text layers)
    if (selected.type === 'application/pdf' && selected.size > MAX_BYTES) {
      setError(
        'PDF exceeds the 5 MB limit. PDF compression is not supported to avoid damaging digital signatures or text layers. Please re-scan or optimize the PDF before uploading.'
      );
      setRawFile(null);
      return;
    }

    setRawFile(selected);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleResetFile = (e) => {
    if (e) e.stopPropagation();
    setRawFile(null);
    setCompressedResult(null);
    setError('');
    const input = document.getElementById('file-upload-input');
    if (input) input.value = '';
  };

  const handleCompress = async () => {
    if (!rawFile) return;
    setIsCompressing(true);
    setError('');

    try {
      const result = await compressDocumentImage(rawFile);
      setCompressedResult(result);
    } catch (err) {
      setError(err.message || 'Image compression failed. Please choose another file.');
    } finally {
      setIsCompressing(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!documentType) {
      setError('Please select a document type.');
      return;
    }

    let fileToUpload = null;
    let isCompressed = 'false';

    if (compressedResult && !compressedResult.isOverLimit) {
      fileToUpload = compressedResult.file;
      isCompressed = 'true';
    } else if (rawFile && rawFile.size <= MAX_BYTES) {
      fileToUpload = rawFile;
      isCompressed = 'false';
    } else {
      setError('Please select a valid file (up to 5 MB) or compress your image first.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('documentType', documentType);
      formData.append('file', fileToUpload);
      formData.append('isCompressed', isCompressed);

      const res = await api.uploadDocument(formData);
      if (typeof effectiveSuccess === 'function') {
        effectiveSuccess(res);
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to upload document.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedTypeInfo = availableTypes.find((t) => t.documentType === documentType);

  const isOversizedImage =
    rawFile && rawFile.size > MAX_BYTES && ['image/jpeg', 'image/png'].includes(rawFile.type);

  const isReadyToUpload =
    (compressedResult && !compressedResult.isOverLimit) ||
    (rawFile && rawFile.size <= MAX_BYTES);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full p-5 sm:p-8 border border-slate-100 animate-in fade-in zoom-in-95 duration-200 max-h-[calc(100vh-2rem)] overflow-y-auto my-auto">
        <button
          onClick={onClose}
          disabled={isSubmitting || isCompressing}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-6">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-4">
            <UploadCloud className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            {isReplacement
              ? `Replace ${selectedTypeInfo?.label || 'Document'}`
              : effectiveType
              ? `Upload ${selectedTypeInfo?.label || 'Document'}`
              : 'Add Document to Vault'}
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            {isReplacement
              ? 'Uploading a replacement creates a new version (v2, v3...) while preserving historical records.'
              : `Attach your ${
                  selectedTypeInfo?.label || 'document'
                } to your personal vault for scholarship applications.`}
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-rose-800 text-sm">
            <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
              Document Type <span className="text-rose-500">*</span>
            </label>
            {effectiveType ? (
              <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-indigo-950 block">
                    {selectedTypeInfo?.label || effectiveType}
                  </span>
                  {selectedTypeInfo?.description && (
                    <span className="text-[11px] text-indigo-700 block mt-0.5">
                      {selectedTypeInfo.description}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-bold text-indigo-600 bg-white px-2 py-0.5 rounded border border-indigo-100 uppercase tracking-wider shrink-0">
                  Preselected
                </span>
              </div>
            ) : (
              <>
                <select
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value)}
                  disabled={isSubmitting || isCompressing}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                >
                  {availableTypes.map((t) => (
                    <option key={t.documentType} value={t.documentType}>
                      {t.label}
                    </option>
                  ))}
                </select>
                {selectedTypeInfo && (
                  <p className="text-xs text-slate-500 mt-1.5">{selectedTypeInfo.description}</p>
                )}
              </>
            )}
          </div>

          {/* File Attachment & Compression Area */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
              File Attachment <span className="text-rose-500">*</span>
            </label>

            {/* Hidden file picker input */}
            <input
              id="file-upload-input"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleFileChange}
              disabled={isSubmitting || isCompressing}
              className="hidden"
            />

            {/* STATE 1: No file selected */}
            {!rawFile && (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => document.getElementById('file-upload-input').click()}
                className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer ${
                  isDragging
                    ? 'border-indigo-500 bg-indigo-50/50'
                    : 'border-slate-200 hover:border-indigo-400 bg-slate-50/50'
                }`}
              >
                <div className="space-y-1">
                  <UploadCloud className="w-8 h-8 text-slate-400 mx-auto" />
                  <p className="text-sm font-medium text-slate-700">
                    Click to browse or drag and drop
                  </p>
                  <p className="text-xs text-slate-500">PDF, JPG, or PNG (up to 5 MB)</p>
                </div>
              </div>
            )}

            {/* STATE 2: Normal Valid File (<= 5 MB) */}
            {rawFile && !isOversizedImage && (
              <div
                onClick={() => document.getElementById('file-upload-input').click()}
                className="border border-slate-200 rounded-xl p-4 bg-slate-50 hover:bg-slate-100/70 transition-colors cursor-pointer flex items-center justify-between"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-10 h-10 bg-indigo-100 text-indigo-700 rounded-lg flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {rawFile.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatBytes(rawFile.size)} • Click to choose a different file
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleResetFile}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded hover:bg-slate-200/60"
                  title="Remove file"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* STATE 3: Oversized Image Detected (> 5 MB) & Not Yet Compressed */}
            {isOversizedImage && !compressedResult && (
              <div className="border border-amber-200 bg-amber-50/70 rounded-xl p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div className="space-y-0.5 flex-1">
                    <h4 className="text-sm font-bold text-amber-900">File is too large</h4>
                    <p className="text-xs text-amber-800">
                      Current size: <strong className="font-semibold">{formatBytes(rawFile.size)}</strong> • Maximum allowed: <strong className="font-semibold">5.0 MB</strong>
                    </p>
                    <p className="text-xs text-amber-700/90 pt-1 leading-relaxed">
                      Camera photos often exceed 5 MB. You can compress this document image in your browser before uploading while keeping stamps, seals, and text clear.
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-amber-200/60 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={handleResetFile}
                    disabled={isCompressing}
                    className="px-3 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-100 rounded-lg transition-colors cursor-pointer"
                  >
                    Choose Another File
                  </button>

                  <button
                    type="button"
                    onClick={handleCompress}
                    disabled={isCompressing}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                  >
                    {isCompressing ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Compressing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        Compress & Upload
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* STATE 4: Compression Result Feedback */}
            {compressedResult && (
              <div
                className={`border rounded-xl p-4 space-y-3 ${
                  compressedResult.isOverLimit
                    ? 'border-rose-200 bg-rose-50/70'
                    : 'border-emerald-200 bg-emerald-50/60'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                      compressedResult.isOverLimit
                        ? 'bg-rose-100 text-rose-700'
                        : 'bg-emerald-100 text-emerald-700'
                    }`}
                  >
                    {compressedResult.isOverLimit ? (
                      <AlertCircle className="w-5 h-5" />
                    ) : (
                      <CheckCircle2 className="w-5 h-5" />
                    )}
                  </div>
                  <div className="space-y-1 flex-1">
                    <h4
                      className={`text-sm font-bold ${
                        compressedResult.isOverLimit ? 'text-rose-900' : 'text-emerald-900'
                      }`}
                    >
                      {compressedResult.isOverLimit
                        ? 'Compression reduced file size, but it is still above 5 MB'
                        : '✓ Ready to upload'}
                    </h4>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-3 gap-2 py-1 text-xs">
                      <div className="bg-white/80 p-2 rounded-lg border border-slate-200/60">
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider block">
                          Original
                        </span>
                        <strong className="text-slate-800">
                          {compressedResult.originalSizeFormatted}
                        </strong>
                      </div>
                      <div className="bg-white/80 p-2 rounded-lg border border-slate-200/60">
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider block">
                          Compressed
                        </span>
                        <strong
                          className={
                            compressedResult.isOverLimit ? 'text-rose-600' : 'text-emerald-700'
                          }
                        >
                          {compressedResult.compressedSizeFormatted}
                        </strong>
                      </div>
                      <div className="bg-white/80 p-2 rounded-lg border border-slate-200/60">
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider block">
                          Saved
                        </span>
                        <strong className="text-indigo-600">
                          {compressedResult.savedPercent}%
                        </strong>
                      </div>
                    </div>

                    <p
                      className={`text-xs pt-1 ${
                        compressedResult.isOverLimit ? 'text-rose-800' : 'text-emerald-800'
                      }`}
                    >
                      {compressedResult.isOverLimit
                        ? 'The image remains above the 5 MB limit. Please crop or choose a smaller image.'
                        : 'A compressed copy will be uploaded to your vault. Your original local file remains untouched.'}
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200/50 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={handleResetFile}
                    className="text-xs font-medium text-slate-600 hover:text-slate-900 inline-flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Choose Another File
                  </button>

                  {!compressedResult.isOverLimit && (
                    <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded">
                      Document legibility preserved
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer Controls */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting || isCompressing}
              className="px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting || isCompressing || !isReadyToUpload}
              className={`px-5 py-2.5 rounded-xl text-sm font-medium shadow-sm transition-all flex items-center gap-2 cursor-pointer ${
                compressedResult && !compressedResult.isOverLimit
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white'
              }`}
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {compressedResult && !compressedResult.isOverLimit
                ? `Upload Compressed File (${compressedResult.compressedSizeFormatted})`
                : isReplacement
                ? 'Upload Replacement'
                : 'Upload Document'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
