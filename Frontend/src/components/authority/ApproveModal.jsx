import React, { useState } from 'react';
import { X, CheckCircle, AlertCircle, Loader2, Award, FileCheck } from 'lucide-react';

export function ApproveModal({ isOpen, onClose, onConfirm, application, isSubmitting }) {
  const [remarks, setRemarks] = useState('');
  const [checklist, setChecklist] = useState({
    eligibilityReviewed: false,
    documentsReviewed: false,
    collegeVerificationReviewed: false,
    applicationInfoReviewed: false,
  });
  const [error, setError] = useState('');

  if (!isOpen || !application) return null;

  const handleCheckboxChange = (key) => {
    setChecklist((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const isAllChecked = Object.values(checklist).every(Boolean);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isAllChecked) {
      setError('Please complete all department review verification checklist items.');
      return;
    }

    onConfirm({
      decision: 'APPROVE',
      checklistJson: checklist,
      overallRemarks: remarks.trim() || 'Department scrutiny completed and approved.',
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

        <div className="flex items-center space-x-3 mb-5">
          <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 leading-tight">
              Approve Scholarship Application
            </h2>
            <p className="text-xs text-slate-500">Department Final Sanction Review</p>
          </div>
        </div>

        {/* Application & Benefit Info */}
        <div className="p-3.5 bg-emerald-50/60 border border-emerald-100 rounded-xl mb-5 text-xs text-emerald-900 space-y-1.5">
          <div className="flex justify-between">
            <span className="text-emerald-700">Applicant:</span>
            <span className="font-bold text-emerald-950">{application.student?.fullName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-emerald-700">Scheme:</span>
            <span className="font-bold text-emerald-950 text-right truncate max-w-[280px]">
              {application.scholarship?.name}
            </span>
          </div>
          {application.scholarship?.benefitAmount && (
            <div className="flex justify-between pt-1 border-t border-emerald-200/60">
              <span className="text-emerald-700">Scholarship Benefit:</span>
              <span className="font-extrabold text-emerald-900 text-sm">
                ₹{Number(application.scholarship.benefitAmount).toLocaleString('en-IN')}
              </span>
            </div>
          )}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start space-x-2 text-rose-800 text-xs">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Review Verification Checklist */}
          <div className="space-y-2.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              Department Scrutiny Verification Checklist <span className="text-rose-500">*</span>
            </label>
            <div className="space-y-2 p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800">
              <label className="flex items-start space-x-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checklist.eligibilityReviewed}
                  onChange={() => handleCheckboxChange('eligibilityReviewed')}
                  className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
                <span className="leading-snug">
                  Applicant meets departmental scheme eligibility rules and income thresholds.
                </span>
              </label>

              <label className="flex items-start space-x-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checklist.documentsReviewed}
                  onChange={() => handleCheckboxChange('documentsReviewed')}
                  className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
                <span className="leading-snug">
                  Required certificates and document versions verified against snapshot.
                </span>
              </label>

              <label className="flex items-start space-x-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checklist.collegeVerificationReviewed}
                  onChange={() => handleCheckboxChange('collegeVerificationReviewed')}
                  className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
                <span className="leading-snug">
                  College scrutiny endorsement and forwarding remarks verified.
                </span>
              </label>

              <label className="flex items-start space-x-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checklist.applicationInfoReviewed}
                  onChange={() => handleCheckboxChange('applicationInfoReviewed')}
                  className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
                <span className="leading-snug">
                  Application credentials and academic data confirmed accurate.
                </span>
              </label>
            </div>
          </div>

          {/* Department Remarks */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Department Officer Remarks (Optional)
            </label>
            <textarea
              rows={2}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Scrutiny completed. Approved for scholarship award."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
            />
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
              disabled={!isAllChecked || isSubmitting}
              className="inline-flex items-center space-x-1.5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Processing Approval...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Confirm Approval</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
