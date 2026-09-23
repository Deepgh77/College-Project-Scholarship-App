import React from 'react';
import { X, Download, FileText, ExternalLink } from 'lucide-react';
import { api } from '../../services/api';

export function DocumentPreviewModal({ isOpen, onClose, applicationId, documentVersion, documentType }) {
  if (!isOpen || !documentVersion || !applicationId) return null;

  const isPdf = documentVersion.mimeType === 'application/pdf';
  const previewUrl = api.getAuthorityDocPreviewUrl(applicationId, documentVersion.id);
  const downloadUrl = api.getAuthorityDocDownloadUrl(applicationId, documentVersion.id);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-4xl w-full flex flex-col max-h-[90vh] border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-purple-50 text-purple-700 rounded-xl flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-bold text-slate-900">{documentType || 'Attached Document'}</h3>
                <span className="px-2 py-0.5 bg-purple-50 text-purple-700 text-[11px] font-semibold rounded-md border border-purple-100">
                  Version {documentVersion.versionNumber}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {documentVersion.originalFilename} • {(documentVersion.fileSizeBytes / 1024).toFixed(1)} KB
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <a
              href={downloadUrl}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </a>

            <a
              href={previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-purple-200 bg-purple-50 text-xs font-semibold text-purple-700 hover:bg-purple-100 transition cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>New Tab</span>
            </a>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Viewer Body */}
        <div className="flex-1 overflow-auto p-4 bg-slate-50 flex items-center justify-center min-h-[420px]">
          {isPdf ? (
            <iframe
              src={previewUrl}
              title="Department Document Preview"
              className="w-full h-[65vh] rounded-xl border border-slate-200 bg-white"
            />
          ) : (
            <div className="max-h-[65vh] overflow-auto flex items-center justify-center">
              <img
                src={previewUrl}
                alt={documentVersion.originalFilename}
                className="max-w-full max-h-[65vh] object-contain rounded-xl shadow-xs"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
