import React, { useState } from 'react';
import { X, Plus, Trash2, AlertTriangle, Send } from 'lucide-react';

const SECTIONS = [
  { value: 'DOCUMENT', label: 'Document Issue' },
  { value: 'ACADEMIC', label: 'Academic Details' },
  { value: 'PERSONAL', label: 'Personal Details' },
  { value: 'FINANCIAL', label: 'Financial / Income Details' },
  { value: 'ELIGIBILITY', label: 'Eligibility Criterion' },
];

const DOCUMENT_TYPES = [
  { value: 'INCOME_CERT', label: 'Income Certificate' },
  { value: 'CASTE_CERT', label: 'Caste Certificate' },
  { value: 'DOMICILE_CERT', label: 'Domicile Certificate' },
  { value: 'MARKSHEET_PREV', label: 'Previous Marksheet' },
  { value: 'FEE_RECEIPT', label: 'College Fee Receipt' },
  { value: 'RATION_CARD', label: 'Ration Card' },
  { value: 'DISABILITY_CERT', label: 'Disability Certificate' },
  { value: 'OTHER', label: 'Other Document' },
];

const CATEGORIES = [
  { value: 'INCORRECT_DOCUMENT', label: 'Incorrect Document Uploaded' },
  { value: 'EXPIRED_DOCUMENT', label: 'Expired Certificate' },
  { value: 'UNREADABLE_DOCUMENT', label: 'Blurry / Unreadable Scan' },
  { value: 'INFORMATION_MISMATCH', label: 'Data Mismatch with Certificate' },
  { value: 'ACADEMIC_INCORRECT', label: 'Academic Marks / Qualification Discrepancy' },
  { value: 'ELIGIBILITY_NOT_MET', label: 'Eligibility Requirement Not Satisfied' },
  { value: 'OTHER', label: 'Other Discrepancy' },
];

export function SendBackModal({ isOpen, onClose, onSubmit, isSubmitting }) {
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
  const [overallRemarks, setOverallRemarks] = useState('');
  const [validationError, setValidationError] = useState('');

  if (!isOpen) return null;

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

  const handleCorrectionChange = (index, field, value) => {
    setCorrections((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setValidationError('');

    if (corrections.length === 0) {
      setValidationError('At least one structured correction is required.');
      return;
    }

    for (let i = 0; i < corrections.length; i++) {
      const c = corrections[i];
      if (c.affectedSection === 'DOCUMENT' && !c.affectedDocumentType) {
        setValidationError(`Correction #${i + 1}: Please select the affected document type.`);
        return;
      }
      if (c.affectedSection !== 'DOCUMENT' && !c.affectedField?.trim()) {
        setValidationError(`Correction #${i + 1}: Please specify the affected field name.`);
        return;
      }
      if (!c.reasonText || c.reasonText.trim().length < 10) {
        setValidationError(`Correction #${i + 1}: Specific reason explanation must be at least 10 characters.`);
        return;
      }
      if (!c.actionRequiredText || c.actionRequiredText.trim().length < 10) {
        setValidationError(`Correction #${i + 1}: Required action instruction must be at least 10 characters.`);
        return;
      }
    }

    onSubmit({
      decision: 'SEND_BACK',
      overallRemarks: overallRemarks.trim() || 'Returned by College Verification Officer for corrections.',
      corrections,
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-amber-200 bg-amber-50 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Send Back Application for Correction</h3>
              <p className="text-xs text-slate-600">
                Specify exact structured discrepancies so the student can rectify them.
              </p>
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {validationError && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
              {validationError}
            </div>
          )}

          {/* Correction Items */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Correction Items ({corrections.length})
              </h4>
              <button
                type="button"
                onClick={handleAddCorrection}
                className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 text-xs font-bold hover:bg-blue-100 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Another Discrepancy</span>
              </button>
            </div>

            {corrections.map((corr, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3 relative group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 bg-slate-200 px-2 py-0.5 rounded">
                    Item #{idx + 1}
                  </span>
                  {corrections.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveCorrection(idx)}
                      className="text-xs text-rose-600 hover:text-rose-800 flex items-center space-x-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Section */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Affected Section
                    </label>
                    <select
                      value={corr.affectedSection}
                      onChange={(e) => handleCorrectionChange(idx, 'affectedSection', e.target.value)}
                      className="w-full text-xs rounded-lg border border-slate-300 p-2 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    >
                      {SECTIONS.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Document Type or Field Name */}
                  {corr.affectedSection === 'DOCUMENT' ? (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Affected Document
                      </label>
                      <select
                        value={corr.affectedDocumentType}
                        onChange={(e) => handleCorrectionChange(idx, 'affectedDocumentType', e.target.value)}
                        className="w-full text-xs rounded-lg border border-slate-300 p-2 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                      >
                        {DOCUMENT_TYPES.map((dt) => (
                          <option key={dt.value} value={dt.value}>
                            {dt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Affected Field Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. previousPercentage, annualFamilyIncome"
                        value={corr.affectedField}
                        onChange={(e) => handleCorrectionChange(idx, 'affectedField', e.target.value)}
                        className="w-full text-xs rounded-lg border border-slate-300 p-2 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                      />
                    </div>
                  )}

                  {/* Rejection Category */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Discrepancy Category
                    </label>
                    <select
                      value={corr.rejectionCategory}
                      onChange={(e) => handleCorrectionChange(idx, 'rejectionCategory', e.target.value)}
                      className="w-full text-xs rounded-lg border border-slate-300 p-2 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    >
                      {CATEGORIES.map((cat) => (
                        <option key={cat.value} value={cat.value}>
                          {cat.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Reason Text */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Exact Reason Explanation <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Explain specifically what is incorrect, missing, or mismatched..."
                      value={corr.reasonText}
                      onChange={(e) => handleCorrectionChange(idx, 'reasonText', e.target.value)}
                      className="w-full text-xs rounded-lg border border-slate-300 p-2 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>

                  {/* Action Required */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Action Required from Student <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      rows={2}
                      placeholder="e.g. Upload a valid current Income Certificate in Document Vault..."
                      value={corr.actionRequiredText}
                      onChange={(e) => handleCorrectionChange(idx, 'actionRequiredText', e.target.value)}
                      className="w-full text-xs rounded-lg border border-slate-300 p-2 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Overall Remarks */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Overall Scrutiny Remarks
            </label>
            <textarea
              rows={2}
              placeholder="Add summary notes or endorsement remarks for the student..."
              value={overallRemarks}
              onChange={(e) => setOverallRemarks(e.target.value)}
              className="w-full text-xs rounded-lg border border-slate-300 p-2.5 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end space-x-3">
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
              className="inline-flex items-center space-x-2 px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-sm hover:shadow transition disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Submitting...' : 'Send Back for Corrections'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
