import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle, HelpCircle } from 'lucide-react';

/**
 * Eligibility Badge Component
 * Displays authoritative eligibility status: ELIGIBLE, INCOMPLETE, NOT_ELIGIBLE
 */
export function EligibilityBadge({ status, className = '' }) {
  switch (status) {
    case 'ELIGIBLE':
      return (
        <span
          className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 ${className}`}
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
          <span>Eligible</span>
        </span>
      );

    case 'INCOMPLETE':
      return (
        <span
          className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200 ${className}`}
        >
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
          <span>Profile Incomplete</span>
        </span>
      );

    case 'NOT_ELIGIBLE':
      return (
        <span
          className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200 ${className}`}
        >
          <XCircle className="w-3.5 h-3.5 text-rose-600 flex-shrink-0" />
          <span>Not Eligible</span>
        </span>
      );

    default:
      return (
        <span
          className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200 ${className}`}
        >
          <HelpCircle className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          <span>Check Eligibility</span>
        </span>
      );
  }
}
