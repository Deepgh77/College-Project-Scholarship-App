/**
 * Application Tracking Service
 * Translates technical ApplicationStatus enum values into human-readable,
 * student-friendly labels, short explanations, and suggested next steps.
 * Derives virtual processing stages deterministically from database status.
 */

const STATUS_METADATA = {
  DRAFT: {
    label: 'Draft Application',
    stage: 'Submission',
    stageNumber: 1,
    description: 'Application initiated but not yet submitted.',
    isActionRequired: true,
    suggestedNextAction: 'Complete the required questionnaire and documents, then submit.',
    isTerminal: false,
    badgeVariant: 'amber',
  },
  SUBMITTED: {
    label: 'Submitted (Pending College Scrutiny)',
    stage: 'College Scrutiny',
    stageNumber: 2,
    description: 'Application received and waiting in the college verification queue.',
    isActionRequired: false,
    suggestedNextAction: 'Your enrolled college will scrutinize your application and certificates.',
    isTerminal: false,
    badgeVariant: 'indigo',
  },
  UNDER_COLLEGE_REVIEW: {
    label: 'Under College Scrutiny',
    stage: 'College Scrutiny',
    stageNumber: 2,
    description: 'College verification officer is actively reviewing your form and certificates.',
    isActionRequired: false,
    suggestedNextAction: 'Awaiting college verification committee decision.',
    isTerminal: false,
    badgeVariant: 'indigo',
  },
  COLLEGE_SENT_BACK: {
    label: 'Action Required: Sent Back by College',
    stage: 'College Scrutiny',
    stageNumber: 2,
    description: 'College officer found errors or missing documents requiring your correction.',
    isActionRequired: true,
    suggestedNextAction: 'Open Action Required Center, resolve the flagged items, and resubmit.',
    isTerminal: false,
    badgeVariant: 'rose',
  },
  COLLEGE_REJECTED: {
    label: 'Rejected by College',
    stage: 'College Scrutiny',
    stageNumber: 2,
    description: 'Application was disqualified by the college scrutiny committee.',
    isActionRequired: false,
    suggestedNextAction: 'Review rejection grounds. You may contact your college scholarship desk.',
    isTerminal: true,
    badgeVariant: 'red',
  },
  FORWARDED_TO_AUTHORITY: {
    label: 'Forwarded to Department',
    stage: 'Department Scrutiny',
    stageNumber: 3,
    description: 'College has verified your credentials and forwarded the form to the State Department.',
    isActionRequired: false,
    suggestedNextAction: 'Awaiting departmental authority scrutiny.',
    isTerminal: false,
    badgeVariant: 'blue',
  },
  UNDER_AUTHORITY_REVIEW: {
    label: 'Under Department Scrutiny',
    stage: 'Department Scrutiny',
    stageNumber: 3,
    description: 'Department authority is actively conducting statutory audit and eligibility checks.',
    isActionRequired: false,
    suggestedNextAction: 'Awaiting departmental sanction decision.',
    isTerminal: false,
    badgeVariant: 'blue',
  },
  AUTHORITY_SENT_BACK: {
    label: 'Action Required: Sent Back by Department',
    stage: 'Department Scrutiny',
    stageNumber: 3,
    description: 'Department scrutiny found issues requiring correction before sanction.',
    isActionRequired: true,
    suggestedNextAction: 'Resolve flagged items and resubmit to college for re-scrutiny.',
    isTerminal: false,
    badgeVariant: 'rose',
  },
  AUTHORITY_REJECTED: {
    label: 'Rejected by Department',
    stage: 'Department Scrutiny',
    stageNumber: 3,
    description: 'Application was rejected by the State Department verification authority.',
    isActionRequired: false,
    suggestedNextAction: 'Review final rejection grounds recorded by the department.',
    isTerminal: true,
    badgeVariant: 'red',
  },
  RESUBMITTED_TO_COLLEGE: {
    label: 'Resubmitted for Re-Scrutiny',
    stage: 'College Scrutiny',
    stageNumber: 2,
    description: 'You resolved the required corrections. Form is back in the college verification queue.',
    isActionRequired: false,
    suggestedNextAction: 'Awaiting college re-verification and re-forwarding.',
    isTerminal: false,
    badgeVariant: 'emerald',
  },
  APPROVED: {
    label: 'Sanctioned / Approved',
    stage: 'Sanction & Disbursement',
    stageNumber: 4,
    description: 'Application approved. Scholarship benefit has been formally sanctioned.',
    isActionRequired: false,
    suggestedNextAction: 'Application is queued for disbursement batch preparation.',
    isTerminal: false,
    badgeVariant: 'emerald',
  },
  PAYMENT_PROCESSING: {
    label: 'Payment Batch Preparation',
    stage: 'Sanction & Disbursement',
    stageNumber: 4,
    description: 'Department is compiling disbursement batches for sanctioned beneficiaries.',
    isActionRequired: false,
    suggestedNextAction: 'Awaiting payment processing initiation.',
    isTerminal: false,
    badgeVariant: 'cyan',
  },
  PAYMENT_INITIATED: {
    label: 'Payment Processing / Payment Initiated',
    stage: 'Sanction & Disbursement',
    stageNumber: 4,
    description: 'Scholarship payment batch has been initiated in the disbursement simulation.',
    isActionRequired: false,
    suggestedNextAction: 'Monitor your application status for disbursement confirmation.',
    isTerminal: false,
    badgeVariant: 'cyan',
  },
  DISBURSED: {
    label: 'Benefit Disbursed (Simulated)',
    stage: 'Sanction & Disbursement',
    stageNumber: 4,
    description: 'The sanctioned scholarship benefit has been recorded as disbursed in the system.',
    isActionRequired: false,
    suggestedNextAction: 'Download your application acknowledgement and payment summary.',
    isTerminal: true,
    badgeVariant: 'emerald',
  },
  UNDISBURSED: {
    label: 'Simulated Payment Failed',
    stage: 'Sanction & Disbursement',
    stageNumber: 4,
    description: 'The simulated disbursement batch could not be completed by the system.',
    isActionRequired: true,
    suggestedNextAction: 'Review bank details in your profile and contact the helpdesk.',
    isTerminal: false,
    badgeVariant: 'rose',
  },
  CANCELLED: {
    label: 'Application Cancelled',
    stage: 'Terminal',
    stageNumber: 0,
    description: 'Application was formally withdrawn or cancelled prior to approval.',
    isActionRequired: false,
    suggestedNextAction: 'No further action. You may explore and apply for other eligible schemes.',
    isTerminal: true,
    badgeVariant: 'slate',
  },
  RIGHT_TO_GIVE_UP: {
    label: 'Benefit Surrendered (Right to Give Up)',
    stage: 'Terminal',
    stageNumber: 0,
    description: 'Applicant exercised statutory right to decline / surrender scholarship benefit.',
    isActionRequired: false,
    suggestedNextAction: 'Benefit released. No further processing.',
    isTerminal: true,
    badgeVariant: 'slate',
  },
};

/**
 * Strict allowlist of statuses from which student cancellation is permitted.
 * Cancellation is NEVER permitted from APPROVED, PAYMENT_PROCESSING, PAYMENT_INITIATED,
 * DISBURSED, UNDISBURSED, COLLEGE_REJECTED, AUTHORITY_REJECTED, CANCELLED, or RIGHT_TO_GIVE_UP.
 */
const PERMITTED_CANCEL_STATUSES = [
  'DRAFT',
  'SUBMITTED',
  'UNDER_COLLEGE_REVIEW',
  'COLLEGE_SENT_BACK',
  'RESUBMITTED_TO_COLLEGE',
  'FORWARDED_TO_AUTHORITY',
  'UNDER_AUTHORITY_REVIEW',
  'AUTHORITY_SENT_BACK',
];

/**
 * Permitted statuses from which a student can exercise Right to Give Up.
 */
const PERMITTED_GIVE_UP_STATUSES = [
  'APPROVED',
  'FORWARDED_TO_AUTHORITY',
  'UNDER_AUTHORITY_REVIEW',
];

/**
 * Resolves human-readable status metadata for an application status.
 */
function getStatusMetadata(status) {
  return (
    STATUS_METADATA[status] || {
      label: status,
      stage: 'General',
      stageNumber: 1,
      description: 'Application is being processed.',
      isActionRequired: false,
      suggestedNextAction: 'Check back later for status updates.',
      isTerminal: false,
      badgeVariant: 'slate',
    }
  );
}

/**
 * Formats an ApplicationAuditLog record into a student-facing timeline event.
 * Strictly adheres to the zero-fabrication rule (backed 100% by real database records).
 */
function formatTimelineEvent(log) {
  const actorRoleLabels = {
    STUDENT: 'Applicant',
    COLLEGE: 'College Verification Officer',
    AUTHORITY: 'Department Authority',
    ADMIN: 'System Administrator',
    SYSTEM: 'System Automation',
  };

  const actionTitles = {
    APPLICATION_SUBMITTED: 'Application Submitted',
    REVIEW_UNDER_COLLEGE: 'College Scrutiny Initiated',
    COLLEGE_SENT_BACK: 'Sent Back for Correction by College',
    COLLEGE_REJECTED: 'Application Rejected by College',
    COLLEGE_FORWARDED: 'Verified & Forwarded by College',
    REVIEW_UNDER_AUTHORITY: 'Department Scrutiny Initiated',
    AUTHORITY_SENT_BACK: 'Sent Back for Correction by Department',
    AUTHORITY_REJECTED: 'Application Rejected by Department',
    AUTHORITY_APPROVED: 'Sanctioned & Approved by Department',
    CORRECTION_RESOLVED: 'Correction Resolved by Applicant',
    APPLICATION_RESUBMITTED: 'Application Resubmitted by Applicant',
    APPLICATION_CANCELLED: 'Application Cancelled by Applicant',
    RIGHT_TO_GIVE_UP: 'Right to Give Up Exercised by Applicant',
    PAYMENT_PROCESSING_STARTED: 'Payment Processing Batch Prepared',
    PAYMENT_SIMULATION_INITIATED: 'Payment Simulation Initiated',
    PAYMENT_DISBURSED: 'Scholarship Benefit Disbursed (Simulated)',
    PAYMENT_UNDISBURSED: 'Simulated Disbursement Exception',
  };

  return {
    id: log.id,
    timestamp: log.timestamp,
    action: log.action,
    actionTitle: actionTitles[log.action] || log.action.replace(/_/g, ' '),
    actorRole: log.actorRole,
    actorRoleLabel: actorRoleLabels[log.actorRole] || log.actorRole,
    previousStatus: log.previousStatus,
    newStatus: log.newStatus,
    statusMeta: getStatusMetadata(log.newStatus),
    remarks: log.remarks || null,
  };
}

module.exports = {
  STATUS_METADATA,
  PERMITTED_CANCEL_STATUSES,
  PERMITTED_GIVE_UP_STATUSES,
  getStatusMetadata,
  formatTimelineEvent,
};
