import React from 'react';
import { X, Download, ExternalLink, FileText, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';

export function DocumentPreviewModal({
  isOpen,
  onClose,
  document: passedDoc = null,
  doc = null,
  selectedVersion = null,
}) {
  const document = passedDoc || doc;
  if (!isOpen || !document) return null;

  const version = selectedVersion || document.currentVersion;
  const isPdf = version?.mimeType === 'application/pdf';
  const previewUrl = selectedVersion
    ? api.getVersionPreviewUrl(document.id, selectedVersion.id)
    : api.getDocumentPreviewUrl(document.id);
  const downloadUrl = selectedVersion
    ? api.getVersionDownloadUrl(document.id, selectedVersion.id)
    : api.getDocumentDownloadUrl(document.id);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-4xl w-full flex flex-col max-h-[90vh] border border-slate-100 animate-in fade-in zoom-in-95 duration-200 my-auto">
        {/* Header */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-100 flex items-center justify-between shrink-0 gap-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  {document.typeInfo?.label || document.documentType}
                </h3>
                <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-xs font-semibold rounded-md border border-indigo-100">
                  v{version?.versionNumber}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {version?.originalFilename} • {version?.fileSizeFormatted}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={downloadUrl}
              download={version?.originalFilename}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Download
            </a>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content / Preview Area */}
        <div className="flex-1 p-6 overflow-auto bg-slate-50/50 flex items-center justify-center min-h-[400px]">
          {isPdf ? (
            <iframe
              src={previewUrl}
              title={version?.originalFilename || 'Document Preview'}
              className="w-full h-[65vh] rounded-xl border border-slate-200 bg-white shadow-sm"
            />
          ) : (
            <div className="max-h-[65vh] flex flex-col items-center justify-center p-4">
              <img
                src={previewUrl}
                alt={version?.originalFilename || 'Document Preview'}
                className="max-h-[60vh] max-w-full object-contain rounded-xl shadow-md border border-slate-200"
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 bg-white rounded-b-2xl flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5 text-emerald-600 font-medium">
            <CheckCircle2 className="w-4 h-4" />
            <span>Securely stored in private student vault</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
