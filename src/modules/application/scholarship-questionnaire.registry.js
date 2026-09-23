/**
 * Declarative Scheme Questionnaire Registry (Phase 5)
 * 
 * Maps Scholarship Scheme Code to scheme-specific questionnaire fields.
 * 
 * Principles:
 * 1. Zero database schema modification.
 * 2. Does NOT hard-code universal questions in frontend JSX.
 * 3. DEFAULT schema is genuinely minimal (only universal non-duplication statutory check).
 * 4. Specific schemes define only fields genuinely relevant to their operational workflow.
 */

const SCHEME_QUESTIONNAIRES = {
  // Post-Matric Scholarship for SC Students
  'SJD-SC-001': [
    {
      fieldKey: 'admissionReceiptNo',
      label: 'College Admission Fee Receipt Number',
      type: 'TEXT',
      placeholder: 'e.g. REC-2024-8841',
      required: true,
      helpText: 'Receipt number issued by your college during admission to the current course year.',
    },
    {
      fieldKey: 'admissionDate',
      label: 'Date of Admission to Current Course Year',
      type: 'DATE',
      required: true,
      helpText: 'Date on which course fees were deposited for this academic session.',
    },
    {
      fieldKey: 'isAvailingOtherScholarship',
      label: 'Are you currently availing any other government scholarship/stipend for this course?',
      type: 'BOOLEAN',
      required: true,
      defaultValue: false,
      helpText: 'Government regulations prohibit receiving duplicate maintenance allowance for the same course.',
    },
  ],

  // Post-Matric Scholarship Scheme for OBC Students
  'OBCW-OBC-002': [
    {
      fieldKey: 'admissionReceiptNo',
      label: 'College Admission Fee Receipt Number',
      type: 'TEXT',
      placeholder: 'e.g. REC-2024-9102',
      required: true,
      helpText: 'Receipt number issued by your college for current academic year fees.',
    },
    {
      fieldKey: 'admissionDate',
      label: 'Date of Admission to Current Course Year',
      type: 'DATE',
      required: true,
      helpText: 'Date of admission payment for current academic session.',
    },
    {
      fieldKey: 'isAvailingOtherScholarship',
      label: 'Are you currently availing any other government scholarship/stipend for this course?',
      type: 'BOOLEAN',
      required: true,
      defaultValue: false,
      helpText: 'State rules prohibit holding two concurrent fee reimbursement benefits.',
    },
  ],

  // EBC Tuition Fee Scheme
  'DHE-EBC-003': [
    {
      fieldKey: 'admissionReceiptNo',
      label: 'College Admission / Fee Receipt Number',
      type: 'TEXT',
      placeholder: 'e.g. REC-2024-5512',
      required: true,
      helpText: 'Admission fee receipt number issued by your college/institution.',
    },
    {
      fieldKey: 'admissionDate',
      label: 'Date of Admission to Current Course Year',
      type: 'DATE',
      required: true,
      helpText: 'Date of course fee payment for current academic year.',
    },
    {
      fieldKey: 'isAvailingOtherScholarship',
      label: 'Are you currently availing any other government scholarship/concession?',
      type: 'BOOLEAN',
      required: true,
      defaultValue: false,
      helpText: 'Government regulations prohibit duplicate fee reimbursement from multiple departments.',
    },
  ],

  // Savitribai Phule Scholarship for Girl Students
  'DHE-GIRLS-004': [
    {
      fieldKey: 'admissionReceiptNo',
      label: 'College Admission / Fee Receipt Number',
      type: 'TEXT',
      placeholder: 'e.g. REC-2024-3310',
      required: true,
      helpText: 'Admission fee receipt number issued by your college.',
    },
    {
      fieldKey: 'isAvailingOtherScholarship',
      label: 'Are you currently availing any other government scholarship for this course?',
      type: 'BOOLEAN',
      required: true,
      defaultValue: false,
      helpText: 'Statutory declaration of non-receipt of other state/central scholarship benefits.',
    },
  ],

  // Divyang Scholarship Scheme
  'SJD-DIV-005': [
    {
      fieldKey: 'udidOrCardNumber',
      label: 'UDID (Unique Disability ID) / Disability Certificate Number',
      type: 'TEXT',
      placeholder: 'e.g. MH1234567890123456',
      required: true,
      helpText: 'National UDID card number or district civil surgeon certificate serial number.',
    },
    {
      fieldKey: 'admissionReceiptNo',
      label: 'College Admission / Fee Receipt Number',
      type: 'TEXT',
      placeholder: 'e.g. REC-2024-7721',
      required: true,
      helpText: 'Current year admission receipt number issued by your institute.',
    },
    {
      fieldKey: 'isAvailingOtherScholarship',
      label: 'Are you currently availing any other government scholarship/stipend for this course?',
      type: 'BOOLEAN',
      required: true,
      defaultValue: false,
      helpText: 'Statutory declaration of non-receipt of duplicate state/central allowances.',
    },
  ],

  // Post-Matric Scholarship Scheme for ST Students
  'TDD-ST-006': [
    {
      fieldKey: 'admissionReceiptNo',
      label: 'College Admission Fee Receipt Number',
      type: 'TEXT',
      placeholder: 'e.g. REC-2024-4412',
      required: true,
      helpText: 'Receipt number issued by your college during admission to the current course year.',
    },
    {
      fieldKey: 'admissionDate',
      label: 'Date of Admission to Current Course Year',
      type: 'DATE',
      required: true,
      helpText: 'Date on which course fees were deposited for this academic session.',
    },
    {
      fieldKey: 'isAvailingOtherScholarship',
      label: 'Are you currently availing any other government scholarship/stipend for this course?',
      type: 'BOOLEAN',
      required: true,
      defaultValue: false,
      helpText: 'Tribal Development Department regulations prohibit holding concurrent government scholarships.',
    },
  ],

  // Genuinely minimal DEFAULT fallback for any unconfigured or new scheme
  // Does NOT impose hostel status, roll numbers, or irrelevant questions
  DEFAULT: [
    {
      fieldKey: 'isAvailingOtherScholarship',
      label: 'Are you currently availing any other government scholarship/stipend for this course?',
      type: 'BOOLEAN',
      required: true,
      defaultValue: false,
      helpText: 'Statutory declaration: government regulations prohibit duplicate scholarship benefits for the same academic session.',
    },
  ],
};

/**
 * Returns the questionnaire configuration array for a given scholarship scheme code.
 */
function getQuestionnaireForScholarship(scholarshipCode) {
  return SCHEME_QUESTIONNAIRES[scholarshipCode] || SCHEME_QUESTIONNAIRES['DEFAULT'];
}

module.exports = {
  SCHEME_QUESTIONNAIRES,
  getQuestionnaireForScholarship,
};
