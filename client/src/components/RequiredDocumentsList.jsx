import React from 'react';
import { FileText, CheckCircle, Info } from 'lucide-react';

/**
 * Required Documents List Component
 * Shows documents required for scholarship eligibility, issuing details, and mandatory/optional tags.
 */
export function RequiredDocumentsList({ documents = [] }) {
  if (!documents || documents.length === 0) {
    return (
      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500 text-center">
        No specific documents are registered for this scheme.
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {documents.map((doc, idx) => (
        <div
          key={doc.id || idx}
          className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-indigo-200 transition shadow-2xs flex items-start space-x-3 text-xs"
        >
          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0 mt-0.5">
            <FileText className="w-4 h-4" />
          </div>

          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h5 className="font-bold text-slate-900 text-sm">
                {doc.helpTitle || doc.documentType.replace(/_/g, ' ')}
              </h5>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                  doc.isMandatory
                    ? 'bg-rose-100 text-rose-800 border border-rose-200'
                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                }`}
              >
                {doc.isMandatory ? 'Mandatory' : 'Optional'}
              </span>
            </div>

            {doc.helpTextSimple && (
              <p className="text-slate-500 mt-1 leading-relaxed">{doc.helpTextSimple}</p>
            )}

            <div className="mt-2 flex items-center space-x-1.5 text-[11px] text-slate-400">
              <Info className="w-3 h-3" />
              <span>Document Type: {doc.documentType}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
