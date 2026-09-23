import React, { useState } from 'react';
import { X, CheckCircle, ArrowRight } from 'lucide-react';

export function ForwardModal({ isOpen, onClose, onSubmit, isSubmitting }) {
  const [check1, setCheck1] = useState(false);
  const [check2, setCheck2] = useState(false);
  const [check3, setCheck3] = useState(false);
  const [overallRemarks, setOverallRemarks] = useState('');

  if (!isOpen) return null;

  const allChecked = check1 && check2 && check3;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!allChecked) return;

    onSubmit({
      decision: 'VERIFY_FORWARD',
      checklistJson: {
        institutionalRecordsVerified: true,
        documentsInspected: true,
        noUnresolvedDiscrepancies: true,
      },
      overallRemarks: overallRemarks.trim() || 'Verified and recommended for department authority sanction.',
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-emerald-200 bg-emerald-50 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Forward to Department Authority</h3>
              <p className="text-xs text-slate-600">Complete institutional endorsement and forward</p>
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
          <div className="space-y-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              Scrutiny Endorsement Checklist
            </h4>

            <label className="flex items-start space-x-2.5 cursor-pointer text-xs text-slate-700">
              <input
                type="checkbox"
                checked={check1}
                onChange={(e) => setCheck1(e.target.checked)}
                className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
              />
              <span>
                I confirm that applicant details (academic course, year, and category) match institutional college records.
              </span>
            </label>

            <label className="flex items-start space-x-2.5 cursor-pointer text-xs text-slate-700">
              <input
                type="checkbox"
                checked={check2}
                onChange={(e) => setCheck2(e.target.checked)}
                className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
              />
              <span>
                I confirm that all uploaded mandatory certificates have been visually scrutinized and verified.
              </span>
            </label>

            <label className="flex items-start space-x-2.5 cursor-pointer text-xs text-slate-700">
              <input
                type="checkbox"
                checked={check3}
                onChange={(e) => setCheck3(e.target.checked)}
                className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
              />
              <span>
                I confirm that there are zero unresolved correction items remaining on this application.
              </span>
            </label>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Endorsement Remarks (Optional)
            </label>
            <textarea
              rows={3}
              placeholder="Add optional scrutiny remarks or recommendations for the Department Authority..."
              value={overallRemarks}
              onChange={(e) => setOverallRemarks(e.target.value)}
              className="w-full text-xs rounded-lg border border-slate-300 p-2.5 bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
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
              disabled={!allChecked || isSubmitting}
              className="inline-flex items-center space-x-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm hover:shadow transition disabled:opacity-50"
            >
              <span>{isSubmitting ? 'Forwarding...' : 'Verify & Forward to Authority'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
