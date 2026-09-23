import React from 'react';
import { X, Download, ExternalLink, FileText, AlertCircle } from 'lucide-react';

export function DocumentPreviewModal({
  isOpen,
  onClose,
  previewUrl,
  downloadUrl,
  title,
  filename,
  mimeType,
}) {
  if (!isOpen) return null;

  const isPdf = mimeType === 'application/pdf' || filename?.toLowerCase().endsWith('.pdf');
  const isImage = mimeType?.startsWith('image/') || /\.(png|jpe?g|webp)$/i.test(filename || '');

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white w-full max-w-4xl h-[90vh] rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center space-x-2.5 truncate">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div className="truncate">
              <h3 className="text-sm font-bold text-slate-900 truncate">
                {title || filename || 'Document Preview'}
              </h3>
              <p className="text-xs text-slate-500 truncate">{filename}</p>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            {downloadUrl && (
              <a
                href={downloadUrl}
                download
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-100 transition shadow-2xs"
              >
                <Download className="w-3.5 h-3.5 text-blue-600" />
                <span>Download</span>
              </a>
            )}

            {previewUrl && (
              <a
                href={previewUrl}
                target="_blank"
                rel="noreferrer"
                className="hidden sm:inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-600 hover:bg-slate-100 transition"
                title="Open in new tab"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 bg-slate-900/5 p-2 overflow-auto flex items-center justify-center">
          {previewUrl ? (
            isPdf ? (
              <iframe
                src={`${previewUrl}#toolbar=0`}
                className="w-full h-full rounded-xl border border-slate-200 bg-white"
                title={title || 'Document PDF Viewer'}
              />
            ) : isImage ? (
              <div className="max-h-full max-w-full overflow-auto flex items-center justify-center p-4">
                <img
                  src={previewUrl}
                  alt={title || 'Document Preview'}
                  className="max-h-[80vh] max-w-full object-contain rounded-lg shadow-md border border-slate-200"
                />
              </div>
            ) : (
              <div className="text-center p-8 bg-white rounded-xl border border-slate-200 shadow-sm max-w-md">
                <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
                <h4 className="text-sm font-bold text-slate-800">Preview Not Available</h4>
                <p className="text-xs text-slate-500 mt-1 mb-4">
                  This file format ({mimeType || 'unknown'}) cannot be previewed directly in browser.
                </p>
                {downloadUrl && (
                  <a
                    href={downloadUrl}
                    download
                    className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download File to View</span>
                  </a>
                )}
              </div>
            )
          ) : (
            <div className="text-center p-6 text-slate-500 text-sm">No preview URL provided.</div>
          )}
        </div>
      </div>
    </div>
  );
}
