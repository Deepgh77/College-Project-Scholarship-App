import React, { useState } from 'react';
import { X, AlertTriangle, Plus, Trash2, AlertCircle, Loader2, Info } from 'lucide-react';

const SECTIONS = [
  { value: 'DOCUMENT', label: 'Document Issue' },
  { value: 'PERSONAL', label: 'Personal Information' },
  { value: 'ACADEMIC', label: 'Academic Details' },
  { value: 'FINANCIAL', label: 'Financial / Income' },
  { value: 'ELIGIBILITY', label: 'Scheme Eligibility' },
];

const CATEGORIES = [
  { value: 'INCORRECT_DOCUMENT', label: 'Incorrect Document' },
  { value: 'EXPIRED_DOCUMENT', label: 'Expired Document' },
  { value: 'UNREADABLE_DOCUMENT', label: 'Unreadable / Blurred Document' },
  { value: 'INFORMATION_MISMATCH', label: 'Information Mismatch' },
  { value: 'ACADEMIC_INCORRECT', label: 'Academic Discrepancy' },
  { value: 'ELIGIBILITY_NOT_MET', label: 'Eligibility Criterion Discrepancy' },
  { value: 'OTHER', label: 'Other Specific Issue' },
];

const DOC_TYPES = [
  { value: 'INCOME_CERT', label: 'Income Certificate' },
  { value: 'CASTE_CERT', label: 'Caste Certificate' },
  { value: 'DOMICILE_CERT', label: 'Domicile Certificate' },
  { value: 'MARKSHEET_PREV', label: 'Previous Year Marksheet' },
  { value: 'FEE_RECEIPT', label: 'Current Year Fee Receipt' },
  { value: 'RATION_CARD', label: 'Ration Card' },
  { value: 'DISABILITY_CERT', label: 'Disability Certificate' },
  { value: 'OTHER', label: 'Other Document' },
];

export function SendBackModal({ isOpen, onClose, onConfirm, application, isSubmitting }) {
  const [overallRemarks, setOverallRemarks] = useState('');
  const [corrections, setCorrections] = useState([
    {
      affectedSection: 'DOCUMENT',
      affectedDocumentType: 'INCOME_CERT',
      affectedField: '',
      rejectionCategory: 'EXPIRED_DOCUMENT',
      reasonText: '',
      actionRequiredText: '',
    },
  ]);
  const [error, setError] = useState('');

  if (!isOpen || !application) return null;

  const handleAddCorrection = () => {
    setCorrections((prev) => [
      ...prev,
      {
        affectedSection: 'DOCUMENT',
        affectedDocumentType: 'INCOME_CERT',
        affectedField: '',
        rejectionCategory: 'INCORRECT_DOCUMENT',
        reasonText: '',
        actionRequiredText: '',
      },
    ]);
  };

  const handleRemoveCorrection = (index) => {
    if (corrections.length <= 1) return;
    setCorrections((prev) => prev.filter((_, i) => i !== index));
  };

  const handleChange = (index, field, value) => {
    setCorrections((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (corrections.length === 0) {
      setError('At least one structured correction request is required.');
      return;
    }

    for (let i = 0; i < corrections.length; i++) {
      const c = corrections[i];
      if (!c.reasonText || c.reasonText.trim().length < 10) {
        setError(`Correction #${i + 1}: Reason explanation must be at least 10 characters long.`);
        return;
      }
      if (!c.actionRequiredText || c.actionRequiredText.trim().length < 10) {
        setError(`Correction #${i + 1}: Action required must provide clear student instructions (min 10 characters).`);
        return;
      }
      if (c.affectedSection === 'DOCUMENT' && !c.affectedDocumentType) {
        setError(`Correction #${i + 1}: Please select the affected document type.`);
        return;
      }
    }

    onConfirm({
      decision: 'SEND_BACK',
      overallRemarks: overallRemarks.trim() || 'Application sent back for correction by Department.',
      corrections,
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative bg-white rounded-2xl shadow-xl max-w-2xl w-full p-6 sm:p-8 border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          disabled={isSubmitting}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3 mb-4">
          <div className="w-11 h-11 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 leading-tight">
              Send Back for Student Correction
            </h2>
            <p className="text-xs text-slate-500">Department Scrutiny Return</p>
          </div>
        </div>

        {/* Workflow Routing Note */}
        <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl mb-5 flex items-start space-x-2 text-amber-900 text-xs leading-relaxed">
          <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <span>
            <strong>Verification Routing Notice:</strong> When sent back by the Department, the student will
            rectify these items and resubmit. The application will first return to their College for re-verification
            before returning to the Department queue.
          </span>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start space-x-2 text-rose-800 text-xs">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Overall Remarks */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Overall Reviewer Remarks (Optional)
            </label>
            <textarea
              rows={2}
              value={overallRemarks}
              onChange={(e) => setOverallRemarks(e.target.value)}
              placeholder="e.g. Please rectify the highlighted discrepancies and upload valid certificates."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white"
            />
          </div>

          {/* Structured Corrections List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Correction Items ({corrections.length}) <span className="text-rose-500">*</span>
              </label>
              <button
                type="button"
                onClick={handleAddCorrection}
                className="inline-flex items-center space-x-1 text-xs font-bold text-amber-700 hover:text-amber-800 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Item</span>
              </button>
            </div>

            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {corrections.map((corr, idx) => (
                <div
                  key={idx}
                  className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-3 relative"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <span className="font-bold text-slate-800">Correction Item #{idx + 1}</span>
                    {corrections.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveCorrection(idx)}
                        className="text-slate-400 hover:text-rose-600 transition cursor-pointer"
                        title="Remove item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Affected Section
                      </label>
                      <select
                        value={corr.affectedSection}
                        onChange={(e) => handleChange(idx, 'affectedSection', e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:ring-1 focus:ring-amber-500 cursor-pointer"
                      >
                        {SECTIONS.map((s) => (
                          <option key={s.value} value={s.value}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Discrepancy Category
                      </label>
                      <select
                        value={corr.rejectionCategory}
                        onChange={(e) => handleChange(idx, 'rejectionCategory', e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:ring-1 focus:ring-amber-500 cursor-pointer"
                      >
                        {CATEGORIES.map((c) => (
                          <option key={c.value} value={c.value}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {corr.affectedSection === 'DOCUMENT' && (
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Affected Document
                        </label>
                        <select
                          value={corr.affectedDocumentType}
                          onChange={(e) => handleChange(idx, 'affectedDocumentType', e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:ring-1 focus:ring-amber-500 cursor-pointer"
                        >
                          {DOC_TYPES.map((d) => (
                            <option key={d.value} value={d.value}>
                              {d.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {corr.affectedSection !== 'DOCUMENT' && (
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Affected Field Name (e.g. annualFamilyIncome, courseYear)
                        </label>
                        <input
                          type="text"
                          value={corr.affectedField}
                          onChange={(e) => handleChange(idx, 'affectedField', e.target.value)}
                          placeholder="e.g. annualFamilyIncome"
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:ring-1 focus:ring-amber-500"
                        />
                      </div>
                    )}

                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Specific Reason Explanation (Min 10 characters) <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={corr.reasonText}
                        onChange={(e) => handleChange(idx, 'reasonText', e.target.value)}
                        placeholder="Explain exact problem with submitted credential..."
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:ring-1 focus:ring-amber-500"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Action Required by Student (Min 10 characters) <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={corr.actionRequiredText}
                        onChange={(e) => handleChange(idx, 'actionRequiredText', e.target.value)}
                        placeholder="Instruct student on exact fix required..."
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:ring-1 focus:ring-amber-500"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
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
              disabled={isSubmitting}
              className="inline-flex items-center space-x-1.5 px-5 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Submitting Send-Back...</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Confirm Send Back ({corrections.length} Items)</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
