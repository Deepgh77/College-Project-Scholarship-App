import React, { useState } from 'react';
import { X, XCircle, AlertOctagon } from 'lucide-react';

const REJECTION_CATEGORIES = [
  { value: 'ELIGIBILITY_NOT_MET', label: 'Eligibility Criteria Not Satisfied' },
  { value: 'ACADEMIC_INCORRECT', label: 'Academic Disqualification / False Marks' },
  { value: 'INFORMATION_MISMATCH', label: 'Severe Profile / Document Discrepancy' },
  { value: 'INCORRECT_DOCUMENT', label: 'Fraudulent or Inauthentic Document' },
  { value: 'OTHER', label: 'Other Regulatory Grounds' },
];

export function RejectModal({ isOpen, onClose, onSubmit, isSubmitting }) {
  const [rejectionCategory, setRejectionCategory] = useState('ELIGIBILITY_NOT_MET');
  const [overallRemarks, setOverallRemarks] = useState('');
  const [validationError, setValidationError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setValidationError('');

    if (!overallRemarks || overallRemarks.trim().length < 10) {
      setValidationError('Please provide a specific, detailed explanation (minimum 10 characters) justifying the rejection.');
      return;
    }

    onSubmit({
      decision: 'REJECT',
      checklistJson: { rejectionCategory },
      overallRemarks: overallRemarks.trim(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-rose-200 bg-rose-50 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
              <AlertOctagon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Reject Scholarship Application</h3>
              <p className="text-xs text-slate-600">Institutional disqualification decision</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {validationError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
              {validationError}
            </div>
          )}

          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs leading-relaxed">
            <span className="font-bold">Warning:</span> Rejection is a formal institutional decision that stops the application workflow and notifies the student immediately.
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Disqualification Category <span className="text-rose-500">*</span>
            </label>
            <select
              value={rejectionCategory}
              onChange={(e) => setRejectionCategory(e.target.value)}
              className="w-full text-xs rounded-lg border border-slate-300 p-2.5 bg-white focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
            >
              {REJECTION_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Detailed Reason / Justification <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={4}
              placeholder="State the exact regulatory or factual basis for disqualifying this application..."
              value={overallRemarks}
              onChange={(e) => setOverallRemarks(e.target.value)}
              className="w-full text-xs rounded-lg border border-slate-300 p-2.5 bg-white focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
            />
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center space-x-1.5 px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm hover:shadow transition disabled:opacity-50"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Rejecting...' : 'Confirm Rejection'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
