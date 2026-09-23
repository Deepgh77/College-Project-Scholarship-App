import React, { useState, useEffect } from 'react';
import { AdminLayout } from '../components/admin/AdminLayout';
import { api } from '../services/api';
import {
  GraduationCap,
  Search,
  Plus,
  Loader2,
  Edit2,
  X,
  FileCheck2,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  FileText,
  Sliders,
  ChevronRight,
  IndianRupee,
} from 'lucide-react';

const ALLOWED_FIELD_LABELS = {
  category: 'Caste Category',
  annualFamilyIncome: 'Annual Family Income (₹)',
  age: 'Student Age (Years)',
  gender: 'Gender',
  previousPercentage: 'Previous Marks (%)',
  courseYear: 'Course Year (1-5)',
  state: 'State of Domicile',
  isHandicapped: 'Specially Abled / Disability',
  disabilityPercentage: 'Disability Percentage (%)',
  collegeId: 'Specific College ID',
};

const OPERATOR_LABELS = {
  LTE: '≤ (At most)',
  GTE: '≥ (At least)',
  EQ: '= (Exactly equal to)',
  NEQ: '≠ (Not equal to)',
  IN: 'Is one of (List)',
};

const DOCUMENT_TYPE_LABELS = {
  INCOME_CERT: 'Income Certificate',
  CASTE_CERT: 'Caste Certificate',
  DOMICILE_CERT: 'Maharashtra Domicile Certificate',
  MARKSHEET_PREV: 'Previous Year Marksheet',
  FEE_RECEIPT: 'College Fee Receipt',
  RATION_CARD: 'Ration Card',
  DISABILITY_CERT: 'Disability Certificate',
  OTHER: 'Other Supporting Document',
};

export function AdminScholarshipsPage() {
  const [scholarships, setScholarships] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [isActiveFilter, setIsActiveFilter] = useState('ALL');

  // Scheme Drawer / Selection
  const [selectedSch, setSelectedSch] = useState(null);
  const [activeSubTab, setActiveSubTab] = useState('rules'); // 'rules' | 'documents' | 'config'
  const [drawerLoading, setDrawerLoading] = useState(false);

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalSch, setEditModalSch] = useState(null);
  const [ruleModalOpen, setRuleModalOpen] = useState(false);
  const [docModalOpen, setDocModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form States
  const [createData, setCreateData] = useState({
    departmentId: '',
    code: '',
    academicYear: '2024-2025',
    name: '',
    description: '',
    benefitAmount: 25000,
    applicationStartDate: '2024-01-01',
    applicationEndDate: '2026-12-31',
    isFreshAllowed: true,
    isRenewalAllowed: true,
    isActive: true,
  });

  const [ruleData, setRuleData] = useState({
    ruleGroup: 'DEFAULT',
    fieldPath: 'annualFamilyIncome',
    operator: 'LTE',
    targetValue: '250000',
    failureReasonText: 'Annual family income must not exceed ₹2,50,000.',
  });

  const [docData, setDocData] = useState({
    documentType: 'INCOME_CERT',
    isMandatory: true,
    helpTitle: 'Competent Authority Income Certificate',
    helpTextSimple: 'Upload official Tehsildar / Sub-Divisional Officer issued income certificate.',
  });

  useEffect(() => {
    loadScholarships();
  }, [page, deptFilter, yearFilter, isActiveFilter]);

  useEffect(() => {
    loadDepartments();
  }, []);

  const loadDepartments = async () => {
    try {
      const res = await api.getAdminDepartments({});
      setDepartments(res.departments || []);
    } catch (err) {
      console.error('Failed to load departments', err);
    }
  };

  const loadScholarships = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getAdminScholarships({
        page,
        limit: 15,
        departmentId: deptFilter || undefined,
        academicYear: yearFilter || undefined,
        isActive: isActiveFilter !== 'ALL' ? isActiveFilter : undefined,
        search: search.trim() || undefined,
      });
      setScholarships(res.scholarships || []);
      setTotal(res.total || 0);
      setTotalPages(res.totalPages || 1);
    } catch (err) {
      setError(err.message || 'Failed to load scholarships.');
    } finally {
      setLoading(false);
    }
  };

  const loadSelectedSchemeDetails = async (schId) => {
    try {
      setDrawerLoading(true);
      const res = await api.getAdminScholarshipById(schId);
      setSelectedSch(res.scholarship);
    } catch (err) {
      setError(err.message || 'Failed to load scholarship details.');
    } finally {
      setDrawerLoading(false);
    }
  };

  const handleToggleStatus = async (sch) => {
    const actionText = sch.isActive ? 'deactivate' : 'activate';
    if (!window.confirm(`Are you sure you want to ${actionText} scheme "${sch.name}"?`)) {
      return;
    }

    try {
      setError(null);
      setSuccessMsg(null);
      const res = await api.updateAdminScholarshipStatus(sch.id, !sch.isActive);
      setSuccessMsg(res.message);
      loadScholarships();
      if (selectedSch?.id === sch.id) {
        loadSelectedSchemeDetails(sch.id);
      }
    } catch (err) {
      setError(err.message || 'Failed to update scheme status.');
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError(null);
      setSuccessMsg(null);
      const res = await api.createAdminScholarship(createData);
      setSuccessMsg(res.message);
      setCreateModalOpen(false);
      loadScholarships();
    } catch (err) {
      setError(err.message || 'Failed to create scholarship.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError(null);
      setSuccessMsg(null);
      const res = await api.updateAdminScholarship(editModalSch.id, {
        name: editModalSch.name,
        description: editModalSch.description,
        benefitAmount: editModalSch.benefitAmount,
        applicationStartDate: editModalSch.applicationStartDate,
        applicationEndDate: editModalSch.applicationEndDate,
        isFreshAllowed: editModalSch.isFreshAllowed,
        isRenewalAllowed: editModalSch.isRenewalAllowed,
      });
      setSuccessMsg(res.message);
      setEditModalSch(null);
      loadScholarships();
      if (selectedSch?.id === editModalSch.id) {
        loadSelectedSchemeDetails(editModalSch.id);
      }
    } catch (err) {
      setError(err.message || 'Failed to update scholarship.');
    } finally {
      setSubmitting(false);
    }
  };

  // Rule Management (Correction #2 - Historical Integrity Preservation)
  const handleAddRuleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError(null);
      setSuccessMsg(null);

      let parsedTarget = ruleData.targetValue;
      if (ruleData.operator === 'LTE' || ruleData.operator === 'GTE') {
        parsedTarget = Number(ruleData.targetValue);
      } else if (ruleData.operator === 'IN') {
        parsedTarget = ruleData.targetValue.split(',').map((s) => s.trim());
      } else if (ruleData.targetValue === 'true') parsedTarget = true;
      else if (ruleData.targetValue === 'false') parsedTarget = false;

      const res = await api.createAdminScholarshipRule(selectedSch.id, {
        ruleGroup: ruleData.ruleGroup,
        fieldPath: ruleData.fieldPath,
        operator: ruleData.operator,
        targetValue: parsedTarget,
        failureReasonText: ruleData.failureReasonText,
      });

      setSuccessMsg(res.message);
      setRuleModalOpen(false);
      loadSelectedSchemeDetails(selectedSch.id);
    } catch (err) {
      setError(err.message || 'Failed to add eligibility rule.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRule = async (ruleId) => {
    if (!window.confirm('Are you sure you want to delete this eligibility rule?')) return;
    try {
      setError(null);
      setSuccessMsg(null);
      const res = await api.deleteAdminScholarshipRule(selectedSch.id, ruleId);
      setSuccessMsg(res.message);
      loadSelectedSchemeDetails(selectedSch.id);
    } catch (err) {
      setError(err.message || 'Failed to delete eligibility rule.');
    }
  };

  // Document Management (Correction #2 - Historical Integrity Preservation)
  const handleAddDocSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError(null);
      setSuccessMsg(null);
      const res = await api.createAdminScholarshipRequiredDoc(selectedSch.id, docData);
      setSuccessMsg(res.message);
      setDocModalOpen(false);
      loadSelectedSchemeDetails(selectedSch.id);
    } catch (err) {
      setError(err.message || 'Failed to add document requirement.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteDoc = async (docId) => {
    if (!window.confirm('Are you sure you want to delete this document requirement?')) return;
    try {
      setError(null);
      setSuccessMsg(null);
      const res = await api.deleteAdminScholarshipRequiredDoc(selectedSch.id, docId);
      setSuccessMsg(res.message);
      loadSelectedSchemeDetails(selectedSch.id);
    } catch (err) {
      setError(err.message || 'Failed to delete document requirement.');
    }
  };

  const formatRuleTarget = (fieldPath, operator, target) => {
    if (fieldPath === 'annualFamilyIncome') {
      return `₹${Number(target).toLocaleString('en-IN')}`;
    }
    if (operator === 'IN' && Array.isArray(target)) {
      return `[ ${target.join(', ')} ]`;
    }
    return String(target);
  };

  return (
    <AdminLayout
      title="Scholarship Schemes & Rules Configuration"
      subtitle="Manage state scholarship catalog, eligibility evaluation criteria, and required documents"
      action={
        <button
          onClick={() => setCreateModalOpen(true)}
          className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-xs transition"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Scheme</span>
        </button>
      }
    >
      {/* Notifications */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-rose-500 hover:text-rose-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-500 hover:text-emerald-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Grid: Catalog on Left, Scheme Configuration Desk on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Scholarship Schemes List (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Filters */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex-1 relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search scheme name or code..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <select
                value={deptFilter}
                onChange={(e) => {
                  setDeptFilter(e.target.value);
                  setPage(1);
                }}
                className="text-xs border border-slate-200 rounded-xl px-2.5 py-1.5 bg-white text-slate-700"
              >
                <option value="">All Departments</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.code}
                  </option>
                ))}
              </select>

              <select
                value={isActiveFilter}
                onChange={(e) => {
                  setIsActiveFilter(e.target.value);
                  setPage(1);
                }}
                className="text-xs border border-slate-200 rounded-xl px-2.5 py-1.5 bg-white text-slate-700"
              >
                <option value="ALL">All States</option>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>

              <button
                onClick={() => {
                  setPage(1);
                  loadScholarships();
                }}
                className="px-3 py-1.5 bg-slate-900 text-white rounded-xl text-xs font-bold"
              >
                Filter
              </button>
            </div>
          </div>

          {/* Scheme Cards */}
          {loading ? (
            <div className="py-20 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-purple-600" />
              <p className="text-xs">Loading scholarships...</p>
            </div>
          ) : scholarships.length === 0 ? (
            <div className="py-20 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
              <GraduationCap className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-semibold text-slate-700">No scholarships found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {scholarships.map((sch) => (
                <div
                  key={sch.id}
                  onClick={() => loadSelectedSchemeDetails(sch.id)}
                  className={`p-4 rounded-2xl border transition cursor-pointer shadow-xs ${
                    selectedSch?.id === sch.id
                      ? 'bg-purple-50/50 border-purple-300 ring-2 ring-purple-500/20'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-lg bg-slate-100 text-slate-800">
                          {sch.code}
                        </span>
                        <span className="text-[11px] font-bold text-purple-700">
                          AY {sch.academicYear}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            sch.isActive
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {sch.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 mt-1">{sch.name}</h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {sch.department?.name || 'Department'}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-sm font-black text-teal-800 flex items-center justify-end">
                        <IndianRupee className="w-3.5 h-3.5" />
                        <span>{Number(sch.benefitAmount).toLocaleString('en-IN')}</span>
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        Benefit / Year
                      </span>
                    </div>
                  </div>

                  <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <div className="flex items-center gap-3">
                      <span>{sch._count?.rules || 0} rules</span> &bull;{' '}
                      <span>{sch._count?.requiredDocuments || 0} required docs</span> &bull;{' '}
                      <span className="font-bold text-slate-800">
                        {sch._count?.applications || 0} applications
                      </span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditModalSch({ ...sch });
                        }}
                        className="p-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100"
                        title="Edit Scheme"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleStatus(sch);
                        }}
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${
                          sch.isActive
                            ? 'border-rose-200 text-rose-700 hover:bg-rose-50'
                            : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                        }`}
                      >
                        {sch.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          <div className="flex items-center justify-between p-3 border border-slate-200 rounded-2xl bg-white text-xs text-slate-500">
            <span>
              Total: <strong>{total}</strong> schemes
            </span>
            <div className="flex items-center space-x-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white disabled:opacity-40"
              >
                Previous
              </button>
              <span className="font-bold text-slate-800">
                Page {page} of {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Selected Scheme Rules & Requirements Desk (5 cols) */}
        <div className="lg:col-span-5">
          {drawerLoading ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-purple-600" />
              <p className="text-xs">Loading scheme configuration...</p>
            </div>
          ) : !selectedSch ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400 space-y-2">
              <Sliders className="w-8 h-8 mx-auto opacity-30" />
              <p className="text-xs font-bold text-slate-600">No Scheme Selected</p>
              <p className="text-[11px] text-slate-400">
                Click any scholarship from the catalog on the left to inspect and configure its
                eligibility rules and required documents.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden space-y-4">
              {/* Scheme Summary Header */}
              <div className="p-4 bg-slate-50 border-b border-slate-200">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700">
                    {selectedSch.code}
                  </span>
                  <span className="text-[10px] font-bold text-slate-500 uppercase">
                    AY {selectedSch.academicYear}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-slate-900 mt-2">{selectedSch.name}</h3>
                <div className="flex items-center justify-between text-xs text-slate-600 mt-2">
                  <span>Sanctioned Benefit:</span>
                  <span className="font-black text-teal-800">
                    ₹{Number(selectedSch.benefitAmount).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-600 mt-1">
                  <span>Submitted Applications:</span>
                  <span className="font-bold text-slate-900">
                    {selectedSch._count?.applications || 0}
                  </span>
                </div>
              </div>

              {/* Sub-Tabs: Rules vs Required Documents */}
              <div className="px-4">
                <div className="flex space-x-1 border-b border-slate-200">
                  <button
                    onClick={() => setActiveSubTab('rules')}
                    className={`pb-2 px-3 text-xs font-bold border-b-2 transition ${
                      activeSubTab === 'rules'
                        ? 'border-purple-600 text-purple-600'
                        : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    Eligibility Rules ({selectedSch.rules?.length || 0})
                  </button>
                  <button
                    onClick={() => setActiveSubTab('documents')}
                    className={`pb-2 px-3 text-xs font-bold border-b-2 transition ${
                      activeSubTab === 'documents'
                        ? 'border-purple-600 text-purple-600'
                        : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    Required Documents ({selectedSch.requiredDocuments?.length || 0})
                  </button>
                </div>
              </div>

              {/* Sub-Tab 1: Eligibility Rules */}
              {activeSubTab === 'rules' && (
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                      Disjunctive Rules (All Must Pass)
                    </span>
                    <button
                      onClick={() => setRuleModalOpen(true)}
                      className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-bold shadow-2xs"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add Rule</span>
                    </button>
                  </div>

                  {selectedSch.rules?.length === 0 ? (
                    <p className="text-xs text-slate-400 py-6 text-center italic">
                      No criteria rules configured. All applicants will pass basic eligibility.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {selectedSch.rules?.map((rule) => (
                        <div
                          key={rule.id}
                          className="p-3 rounded-xl border border-slate-200/90 bg-slate-50/60 text-xs space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-900">
                                {ALLOWED_FIELD_LABELS[rule.fieldPath] || rule.fieldPath}
                              </span>
                              <span className="font-mono font-bold text-purple-700 text-[11px]">
                                {rule.operator}
                              </span>
                              <span className="font-bold text-slate-800 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                                {formatRuleTarget(rule.fieldPath, rule.operator, rule.targetValue)}
                              </span>
                            </div>
                            <button
                              onClick={() => handleDeleteRule(rule.id)}
                              className="text-slate-400 hover:text-rose-600 p-1"
                              title="Delete rule"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <p className="text-[11px] text-slate-500 italic">
                            Fail note: "{rule.failureReasonText}"
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {selectedSch._count?.applications > 0 && (
                    <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-800">
                      * Scheme has {selectedSch._count.applications} submitted application(s). Existing
                      rules cannot be casually deleted to preserve historical evaluation reproducibility.
                    </div>
                  )}
                </div>
              )}

              {/* Sub-Tab 2: Required Documents */}
              {activeSubTab === 'documents' && (
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                      Document Vault Attachments
                    </span>
                    <button
                      onClick={() => setDocModalOpen(true)}
                      className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-bold shadow-2xs"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add Document</span>
                    </button>
                  </div>

                  {selectedSch.requiredDocuments?.length === 0 ? (
                    <p className="text-xs text-slate-400 py-6 text-center italic">
                      No document requirements configured.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {selectedSch.requiredDocuments?.map((doc) => (
                        <div
                          key={doc.id}
                          className="p-3 rounded-xl border border-slate-200/90 bg-slate-50/60 text-xs space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900">
                                {DOCUMENT_TYPE_LABELS[doc.documentType] || doc.documentType}
                              </span>
                              <span
                                className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                  doc.isMandatory
                                    ? 'bg-rose-100 text-rose-800'
                                    : 'bg-slate-200 text-slate-700'
                                }`}
                              >
                                {doc.isMandatory ? 'Mandatory' : 'Optional'}
                              </span>
                            </div>
                            <button
                              onClick={() => handleDeleteDoc(doc.id)}
                              className="text-slate-400 hover:text-rose-600 p-1"
                              title="Delete requirement"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <p className="text-[11px] font-medium text-slate-700">{doc.helpTitle}</p>
                          <p className="text-[10px] text-slate-500">{doc.helpTextSimple}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {selectedSch._count?.applications > 0 && (
                    <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-800">
                      * Scheme has {selectedSch._count.applications} submitted application(s). Existing
                      document requirements cannot be casually deleted to protect snapshot immutability.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Create Scholarship Scheme Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-xl w-full p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                  <GraduationCap className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Create Scholarship Scheme</h3>
              </div>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">State Department *</label>
                <select
                  required
                  value={createData.departmentId}
                  onChange={(e) => setCreateData({ ...createData, departmentId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none bg-white font-medium"
                >
                  <option value="">Select Department...</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Scheme Code *</label>
                  <input
                    type="text"
                    required
                    value={createData.code}
                    onChange={(e) => setCreateData({ ...createData, code: e.target.value })}
                    placeholder="e.g. OBCW-FREESHIP-01"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none uppercase font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Academic Year *</label>
                  <input
                    type="text"
                    required
                    value={createData.academicYear}
                    onChange={(e) => setCreateData({ ...createData, academicYear: e.target.value })}
                    placeholder="2024-2025"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Scheme Title *</label>
                <input
                  type="text"
                  required
                  value={createData.name}
                  onChange={(e) => setCreateData({ ...createData, name: e.target.value })}
                  placeholder="Official scholarship scheme name"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Scheme Description *</label>
                <textarea
                  rows={2}
                  required
                  value={createData.description}
                  onChange={(e) => setCreateData({ ...createData, description: e.target.value })}
                  placeholder="Purpose, target beneficiary groups, and subsidy coverage"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Benefit Amount (₹) *</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={createData.benefitAmount}
                    onChange={(e) => setCreateData({ ...createData, benefitAmount: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={createData.applicationStartDate}
                    onChange={(e) =>
                      setCreateData({ ...createData, applicationStartDate: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">End Date *</label>
                  <input
                    type="date"
                    required
                    value={createData.applicationEndDate}
                    onChange={(e) =>
                      setCreateData({ ...createData, applicationEndDate: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold inline-flex items-center space-x-1.5 disabled:opacity-50"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Scheme</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Scholarship Scheme Modal */}
      {editModalSch && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-xl w-full p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Edit Scheme Configuration</h3>
                <p className="text-xs text-slate-400 font-mono">
                  {editModalSch.code} &bull; AY {editModalSch.academicYear}
                </p>
              </div>
              <button
                onClick={() => setEditModalSch(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Scheme Title *</label>
                <input
                  type="text"
                  required
                  value={editModalSch.name}
                  onChange={(e) => setEditModalSch({ ...editModalSch, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={editModalSch.description}
                  onChange={(e) =>
                    setEditModalSch({ ...editModalSch, description: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Benefit Amount (₹)</label>
                  <input
                    type="number"
                    min={1}
                    value={editModalSch.benefitAmount}
                    onChange={(e) =>
                      setEditModalSch({ ...editModalSch, benefitAmount: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={
                      editModalSch.applicationStartDate
                        ? new Date(editModalSch.applicationStartDate).toISOString().split('T')[0]
                        : ''
                    }
                    onChange={(e) =>
                      setEditModalSch({
                        ...editModalSch,
                        applicationStartDate: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">End Date</label>
                  <input
                    type="date"
                    value={
                      editModalSch.applicationEndDate
                        ? new Date(editModalSch.applicationEndDate).toISOString().split('T')[0]
                        : ''
                    }
                    onChange={(e) =>
                      setEditModalSch({ ...editModalSch, applicationEndDate: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setEditModalSch(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold inline-flex items-center space-x-1.5 disabled:opacity-50"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Eligibility Rule Modal */}
      {ruleModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Add Eligibility Rule</h3>
                <p className="text-xs text-slate-400 font-mono">{selectedSch.code}</p>
              </div>
              <button
                onClick={() => setRuleModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddRuleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Target Profile Field *</label>
                <select
                  value={ruleData.fieldPath}
                  onChange={(e) => setRuleData({ ...ruleData, fieldPath: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none bg-white font-medium"
                >
                  {Object.entries(ALLOWED_FIELD_LABELS).map(([field, label]) => (
                    <option key={field} value={field}>
                      {label} ({field})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Operator *</label>
                <select
                  value={ruleData.operator}
                  onChange={(e) => setRuleData({ ...ruleData, operator: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none bg-white font-medium"
                >
                  {Object.entries(OPERATOR_LABELS).map(([op, label]) => (
                    <option key={op} value={op}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Target Value *</label>
                <input
                  type="text"
                  required
                  value={ruleData.targetValue}
                  onChange={(e) => setRuleData({ ...ruleData, targetValue: e.target.value })}
                  placeholder={
                    ruleData.operator === 'IN'
                      ? 'e.g. OBC, SC, ST'
                      : ruleData.fieldPath === 'annualFamilyIncome'
                      ? 'e.g. 250000'
                      : 'Target comparison value'
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Failure Reason Text *</label>
                <textarea
                  rows={2}
                  required
                  value={ruleData.failureReasonText}
                  onChange={(e) =>
                    setRuleData({ ...ruleData, failureReasonText: e.target.value })
                  }
                  placeholder="Clear student-facing explanation if this condition is not met"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setRuleModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold inline-flex items-center space-x-1.5 disabled:opacity-50"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Rule</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Required Document Modal */}
      {docModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Add Required Document</h3>
                <p className="text-xs text-slate-400 font-mono">{selectedSch.code}</p>
              </div>
              <button
                onClick={() => setDocModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddDocSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Document Type *</label>
                <select
                  value={docData.documentType}
                  onChange={(e) => setDocData({ ...docData, documentType: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none bg-white font-medium"
                >
                  {Object.entries(DOCUMENT_TYPE_LABELS).map(([type, label]) => (
                    <option key={type} value={type}>
                      {label} ({type})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={docData.isMandatory}
                    onChange={(e) => setDocData({ ...docData, isMandatory: e.target.checked })}
                    className="rounded text-purple-600 focus:ring-purple-500"
                  />
                  <span>Mandatory for Submission</span>
                </label>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Help Title *</label>
                <input
                  type="text"
                  required
                  value={docData.helpTitle}
                  onChange={(e) => setDocData({ ...docData, helpTitle: e.target.value })}
                  placeholder="e.g. Valid Income Certificate"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Help Text / Instructions *</label>
                <textarea
                  rows={2}
                  required
                  value={docData.helpTextSimple}
                  onChange={(e) => setDocData({ ...docData, helpTextSimple: e.target.value })}
                  placeholder="e.g. Must be issued by Tehsildar with annual income clearly mentioned."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setDocModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold inline-flex items-center space-x-1.5 disabled:opacity-50"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Document</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
