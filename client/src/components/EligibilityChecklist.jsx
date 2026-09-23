import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, AlertTriangle, XCircle, ArrowRight } from 'lucide-react';

/**
 * Explainable Eligibility Checklist Component
 * Displays rule-by-rule evaluation breakdown with icons, explanations, and profile action links.
 */
export function EligibilityChecklist({ evaluation, profileExists }) {
  if (!evaluation) return null;

  const { status, summary, evaluatedGroups, missingFields } = evaluation;

  return (
    <div className="space-y-4">
      {/* Overall Status Banner */}
      <div
        className={`p-4 rounded-xl border flex items-start space-x-3 ${
          status === 'ELIGIBLE'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
            : status === 'INCOMPLETE'
            ? 'bg-amber-50 border-amber-200 text-amber-900'
            : 'bg-rose-50 border-rose-200 text-rose-900'
        }`}
      >
        <div className="mt-0.5 flex-shrink-0">
          {status === 'ELIGIBLE' && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
          {status === 'INCOMPLETE' && <AlertTriangle className="w-5 h-5 text-amber-600" />}
          {status === 'NOT_ELIGIBLE' && <XCircle className="w-5 h-5 text-rose-600" />}
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold tracking-tight">
              {status === 'ELIGIBLE' && 'You Are Eligible'}
              {status === 'INCOMPLETE' && 'Profile Incomplete — Action Needed'}
              {status === 'NOT_ELIGIBLE' && 'Criteria Not Met'}
            </h4>
            <span
              className={`text-[11px] font-bold px-2 py-0.5 rounded-full uppercase ${
                status === 'ELIGIBLE'
                  ? 'bg-emerald-200 text-emerald-800'
                  : status === 'INCOMPLETE'
                  ? 'bg-amber-200 text-amber-800'
                  : 'bg-rose-200 text-rose-800'
              }`}
            >
              {status}
            </span>
          </div>
          <p className="text-xs mt-1 leading-relaxed">{summary}</p>

          {status === 'INCOMPLETE' && (
            <div className="mt-3">
              <Link
                to="/profile"
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs transition"
              >
                <span>Update Required Profile Fields</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Evaluated Rule Groups Breakdown */}
      {evaluatedGroups && evaluatedGroups.length > 0 && (
        <div className="space-y-3">
          <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Detailed Eligibility Breakdown
          </h5>

          {evaluatedGroups.map((group, gIdx) => (
            <div
              key={gIdx}
              className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs"
            >
              {evaluatedGroups.length > 1 && (
                <div className="bg-slate-50 px-3.5 py-2 border-b border-slate-200 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">
                    Pathway: {group.groupName.replace(/_/g, ' ')}
                  </span>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase ${
                      group.status === 'SATISFIED'
                        ? 'bg-emerald-100 text-emerald-800'
                        : group.status === 'INCOMPLETE'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {group.status}
                  </span>
                </div>
              )}

              <div className="divide-y divide-slate-100">
                {group.rules.map((rule, rIdx) => (
                  <div key={rIdx} className="p-3 sm:p-3.5 flex items-start space-x-3 text-xs">
                    <div className="mt-0.5 flex-shrink-0">
                      {rule.status === 'SATISFIED' && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      )}
                      {rule.status === 'INCOMPLETE' && (
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                      )}
                      {rule.status === 'FAILED' && <XCircle className="w-4 h-4 text-rose-600" />}
                      {rule.status === 'CONFIG_ERROR' && (
                        <XCircle className="w-4 h-4 text-slate-400" />
                      )}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-800 capitalize">
                          {rule.fieldPath.replace(/([A-Z])/g, ' $1')} Requirement
                        </span>
                        <span
                          className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                            rule.status === 'SATISFIED'
                              ? 'text-emerald-700 bg-emerald-50'
                              : rule.status === 'INCOMPLETE'
                              ? 'text-amber-700 bg-amber-50'
                              : 'text-rose-700 bg-rose-50'
                          }`}
                        >
                          {rule.status}
                        </span>
                      </div>

                      <p className="text-slate-600 mt-0.5">{rule.message}</p>

                      {rule.status === 'FAILED' && rule.failureReason && (
                        <p className="text-rose-600 font-medium text-[11px] mt-0.5">
                          Reason: {rule.failureReason}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
