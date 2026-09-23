import React, { useState } from 'react';
import { X, XCircle, AlertCircle, Loader2 } from 'lucide-react';

const REJECTION_REASONS = [
  'Does not meet scheme caste/category eligibility rules.',
  'Annual family income exceeds the scheme threshold.',
  'Ineligible course or academic year.',
  'Domicile criteria not satisfied.',
  'Fraudulent or tampered documentation detected.',
  'Other department-level ineligibility criterion.',
];

export function RejectModal({ isOpen, onClose, onConfirm, application, isSubmitting }) {
  const [remarks, setRemarks] = useState('');
  const [selectedPreset, setSelectedPreset] = useState('');
  const [error, setError] = useState('');

  if (!isOpen || !application) return null;

  const handlePresetSelect = (preset) => {
    setSelectedPreset(preset);
    setRemarks(preset);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!remarks || remarks.trim().length < 10) {
      setError('Please provide a specific rejection justification of at least 10 characters.');
      return;
    }

    onConfirm({
      decision: 'REJECT',
      overallRemarks: remarks.trim(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 sm:p-8 border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          disabled={isSubmitting}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3 mb-4">
          <div className="w-11 h-11 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
            <XCircle className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 leading-tight">
              Reject Scholarship Application
            </h2>
            <p className="text-xs text-slate-500">Department Scrutiny Decision</p>
          </div>
        </div>

        {/* Warning Notice with Neutral Academic Phrasing */}
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl mb-4 text-xs text-rose-900 space-y-1 leading-relaxed">
          <p className="font-bold text-rose-950">Important Lifecycle Notice:</p>
          <p>
            This decision closes the current application lifecycle and cannot be changed through the normal student
            correction workflow.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start space-x-2 text-rose-800 text-xs">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Quick Presets */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Select Primary Rejection Reason
            </label>
            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
              {REJECTION_REASONS.map((reason, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handlePresetSelect(reason)}
                  className={`w-full text-left p-2 rounded-lg text-xs transition border cursor-pointer ${
                    selectedPreset === reason
                      ? 'bg-rose-50 border-rose-300 text-rose-900 font-semibold'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {reason}
                </button>
              ))}
            </div>
          </div>

          {/* Detailed Justification Textarea */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Detailed Justification / Officer Remarks <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Provide exact justification explaining why this application is rejected..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              This explanation will be permanently recorded in the audit trail and displayed to the student.
            </p>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!remarks || remarks.trim().length < 10 || isSubmitting}
              className="inline-flex items-center space-x-1.5 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Processing Rejection...</span>
                </>
              ) : (
                <>
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Confirm Rejection</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
