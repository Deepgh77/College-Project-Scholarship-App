import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { EligibilityBadge } from '../components/EligibilityBadge';
import { EligibilityChecklist } from '../components/EligibilityChecklist';
import { RequiredDocumentsList } from '../components/RequiredDocumentsList';
import {
  GraduationCap,
  ArrowLeft,
  Calendar,
  Building2,
  FileText,
  IndianRupee,
  ShieldCheck,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  AlertCircle,
  HelpCircle,
  ExternalLink,
} from 'lucide-react';

export function ScholarshipDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [scholarship, setScholarship] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isStartingApp, setIsStartingApp] = useState(false);
  const [applyError, setApplyError] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError('');

        const res = await api.getScholarshipById(id);
        if (res.success && res.scholarship) {
          setScholarship(res.scholarship);
        } else {
          setError('Scholarship details could not be retrieved.');
        }
      } catch (err) {
        setError(err.message || 'Failed to load scholarship details.');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
        <p className="text-xs font-medium text-slate-600">Loading scheme details & eligibility...</p>
      </div>
    );
  }

  if (error || !scholarship) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 flex flex-col items-center justify-center text-center">
        <AlertCircle className="w-10 h-10 text-rose-500 mb-3" />
        <h2 className="text-base font-bold text-slate-800">Scholarship Not Found</h2>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mb-4">
          {error || 'The requested scholarship could not be found or has been disabled.'}
        </p>
        <Link
          to="/scholarships"
          className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold shadow-xs"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Scholarship Catalog</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-20">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-2xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link
            to="/scholarships"
            className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-600 hover:text-indigo-600 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>All Scholarships</span>
          </Link>

          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 uppercase">
              {scholarship.academicYear}
            </span>
            {scholarship.evaluation && (
              <EligibilityBadge status={scholarship.evaluation.status} />
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* Banner Card */}
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
              {scholarship.department?.code}
            </span>
            <span className="text-xs font-mono text-slate-500 font-semibold">{scholarship.code}</span>
            <span className="text-slate-300">•</span>
            <span className="text-xs text-slate-500">{scholarship.department?.name}</span>
          </div>

          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight leading-snug">
            {scholarship.name}
          </h1>

          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-3xl">
            {scholarship.description}
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-100 text-xs">
            <div>
              <div className="text-slate-400 text-[11px]">Financial Benefit</div>
              <div className="font-bold text-slate-900 text-sm mt-0.5">
                ₹{scholarship.benefitAmount?.toLocaleString('en-IN')} / yr
              </div>
            </div>

            <div>
              <div className="text-slate-400 text-[11px]">Application Window</div>
              <div className="font-semibold text-slate-800 mt-0.5">
                {scholarship.isWindowOpen ? (
                  <span className="text-emerald-700 font-bold">Open</span>
                ) : (
                  <span className="text-slate-500">Closed</span>
                )}
              </div>
            </div>

            <div>
              <div className="text-slate-400 text-[11px]">Deadline</div>
              <div className="font-semibold text-slate-800 mt-0.5">
                {new Date(scholarship.applicationEndDate).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </div>
            </div>

            <div>
              <div className="text-slate-400 text-[11px]">Admission Type</div>
              <div className="font-semibold text-slate-800 mt-0.5">
                {scholarship.isFreshAllowed && 'Fresh'}{' '}
                {scholarship.isFreshAllowed && scholarship.isRenewalAllowed && '& '}{' '}
                {scholarship.isRenewalAllowed && 'Renewal'}
              </div>
            </div>
          </div>
        </div>

        {/* Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column (2 Cols): Documents & Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Required Documents Section */}
            <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
              <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
                <FileText className="w-5 h-5 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">Required Supporting Documents</h3>
              </div>
              <p className="text-xs text-slate-500">
                Prepare legible, authentic copies of these documents before applying. Document uploading will be activated during the Phase 4 Application Workflow.
              </p>
              <RequiredDocumentsList documents={scholarship.requiredDocuments} />
            </div>

            {/* Department Details */}
            <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-center space-x-2 pb-2 border-b border-slate-100">
                <Building2 className="w-4 h-4 text-slate-500" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Administering Department
                </h3>
              </div>
              <div className="text-xs space-y-1">
                <div className="font-bold text-slate-800">{scholarship.department?.name}</div>
                <p className="text-slate-500">{scholarship.department?.description}</p>
              </div>
            </div>
          </div>

          {/* Right Column (1 Col): Live Eligibility Evaluation Card */}
          <div className="space-y-6">
            <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="w-5 h-5 text-indigo-600" />
                  <h3 className="text-sm font-bold text-slate-900">My Eligibility Status</h3>
                </div>
              </div>

              {user?.role === 'STUDENT' ? (
                scholarship.evaluation ? (
                  <EligibilityChecklist
                    evaluation={scholarship.evaluation}
                    profileExists={true}
                  />
                ) : (
                  <p className="text-xs text-slate-500">Evaluating your eligibility...</p>
                )
              ) : (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-2">
                  <p className="text-xs text-slate-600">
                    Log in as a student to receive an automated, explainable eligibility evaluation.
                  </p>
                  <Link
                    to="/login"
                    className="inline-block px-3.5 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold"
                  >
                    Log In as Student
                  </Link>
                </div>
              )}

              {/* Application Creation / Resume Action */}
              <div className="pt-3 border-t border-slate-100 space-y-2">
                {applyError && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-start gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-600 mt-0.5 shrink-0" />
                    <span>{applyError}</span>
                  </div>
                )}

                {user?.role === 'STUDENT' ? (
                  <button
                    onClick={async () => {
                      setIsStartingApp(true);
                      setApplyError('');
                      try {
                        const res = await api.startApplication(scholarship.id);
                        navigate(`/applications/${res.application.id}`);
                      } catch (err) {
                        setApplyError(err.message || 'Failed to start application.');
                      } finally {
                        setIsStartingApp(false);
                      }
                    }}
                    disabled={
                      isStartingApp ||
                      !scholarship.isWindowOpen ||
                      (scholarship.evaluation && !scholarship.evaluation.isEligible)
                    }
                    className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-100 disabled:text-slate-400 text-white text-xs font-bold transition shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
                  >
                    {isStartingApp ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Initializing Application...
                      </>
                    ) : !scholarship.isWindowOpen ? (
                      'Application Window Closed'
                    ) : scholarship.evaluation && !scholarship.evaluation.isEligible ? (
                      'Not Eligible to Apply'
                    ) : (
                      'Apply for Scholarship'
                    )}
                  </button>
                ) : (
                  <Link
                    to="/login"
                    className="block w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold text-center transition shadow-xs"
                  >
                    Log In as Student to Apply
                  </Link>
                )}

                <p className="text-[11px] text-slate-400 text-center">
                  Pre-fills verified student profile data and attaches certificates from vault.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
