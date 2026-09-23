const crypto = require('crypto');
const { getQuestionnaireForScholarship } = require('./scholarship-questionnaire.registry');

/**
 * Validates student questionnaire responses against a declarative questionnaire schema.
 */
function validateQuestionnaire(schema, responses = {}) {
  const errors = [];
  const cleanedResponses = {};

  for (const field of schema) {
    const val = responses[field.fieldKey];

    if (field.required) {
      if (val === undefined || val === null || (typeof val === 'string' && val.trim() === '')) {
        errors.push(`${field.label} is required.`);
        continue;
      }
    }

    if (val !== undefined && val !== null) {
      if (field.type === 'BOOLEAN') {
        cleanedResponses[field.fieldKey] = Boolean(val);
      } else if (field.type === 'DATE') {
        const parsedDate = new Date(val);
        if (isNaN(parsedDate.getTime())) {
          errors.push(`Invalid date format for ${field.label}.`);
        } else {
          cleanedResponses[field.fieldKey] = parsedDate.toISOString().split('T')[0];
        }
      } else if (field.type === 'TEXT') {
        cleanedResponses[field.fieldKey] = String(val).trim();
      } else if (field.type === 'RADIO' || field.type === 'SELECT') {
        const allowed = (field.options || []).map((o) => (typeof o === 'string' ? o : o.value));
        if (allowed.length > 0 && !allowed.includes(val)) {
          errors.push(`Invalid selection for ${field.label}.`);
        } else {
          cleanedResponses[field.fieldKey] = val;
        }
      } else {
        cleanedResponses[field.fieldKey] = val;
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    cleanedResponses,
  };
}

/**
 * Generates an official, human-readable Application Reference Number (ARN).
 * Format: MHA-<YEAR_CLEAN>-<RANDOM_ALPHANUMERIC_6>
 * Example: MHA-202425-K9A4B7
 */
function generateApplicationNumber(academicYear = '2024-2025') {
  const cleanYear = academicYear.replace(/[^0-9]/g, '');
  const randomChars = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `MHA-${cleanYear}-${randomChars}`;
}

/**
 * Builds the canonical frozen snapshotDataJson structure matching prisma/schema.prisma specification.
 */
function buildSnapshotDataJson({
  studentProfile,
  scholarship,
  eligibilityEvaluation,
  questionnaireResponses,
  verifiedDocumentVersions,
}) {
  return {
    student: {
      personal: {
        fullName: studentProfile.fullName,
        dob: studentProfile.dob,
        gender: studentProfile.gender,
        category: studentProfile.category,
        religion: studentProfile.religion,
        mobile: studentProfile.mobile,
        isHandicapped: studentProfile.isHandicapped,
        disabilityPercentage: studentProfile.disabilityPercentage,
      },
      address: {
        address: studentProfile.address,
        cityVillage: studentProfile.cityVillage,
        taluka: studentProfile.taluka,
        district: studentProfile.district,
        state: studentProfile.state,
        pincode: studentProfile.pincode,
      },
      academic: {
        collegeId: studentProfile.collegeId,
        collegeName: studentProfile.college?.name || null,
        collegeUniversity: studentProfile.college?.university || null,
        courseName: studentProfile.courseName,
        courseYear: studentProfile.courseYear,
        admissionYear: studentProfile.admissionYear,
        previousQualification: studentProfile.previousQualification,
        previousPercentage: studentProfile.previousPercentage
          ? Number(studentProfile.previousPercentage)
          : null,
      },
      financial: {
        annualFamilyIncome: studentProfile.annualFamilyIncome
          ? Number(studentProfile.annualFamilyIncome)
          : null,
        guardianName: studentProfile.guardianName,
      },
      bank: {
        bankName: studentProfile.bankName,
        bankAccountNo: studentProfile.bankAccountNo
          ? `XXXXXX${studentProfile.bankAccountNo.slice(-4)}`
          : null,
        bankIfsc: studentProfile.bankIfsc,
      },
    },
    questionnaireResponses,
    scholarshipConfig: {
      id: scholarship.id,
      code: scholarship.code,
      name: scholarship.name,
      academicYear: scholarship.academicYear,
      benefitAmount: Number(scholarship.benefitAmount),
      departmentName: scholarship.department?.name || scholarship.departmentId,
      departmentCode: scholarship.department?.code || '',
    },
    eligibilityEvaluation: {
      status: eligibilityEvaluation.status,
      isEligible: eligibilityEvaluation.isEligible,
      evaluatedAt: new Date().toISOString(),
      summary: eligibilityEvaluation.summary,
      evaluatedRules: eligibilityEvaluation.evaluatedRules || [],
    },
    submittedDocuments: verifiedDocumentVersions.map((v) => ({
      documentType: v.document.documentType,
      documentVersionId: v.id,
      versionNumber: v.versionNumber,
      originalFilename: v.originalFilename,
      fileSizeBytes: v.fileSizeBytes,
      mimeType: v.mimeType,
      isCompressed: v.isCompressed,
    })),
  };
}

/**
 * Computes healthScore (0–100) for a draft application based on profile, questionnaire, and documents.
 */
function calculateDraftHealthScore({ profile, scholarship, draftData }) {
  let score = 0;

  // 1. Profile completeness (up to 40 points)
  if (profile) {
    const profilePct = profile.completionPercentage || 0;
    score += Math.round((profilePct / 100) * 40);
  }

  // 2. Questionnaire completeness (up to 30 points)
  const schema = getQuestionnaireForScholarship(scholarship.code);
  const qResponses = draftData.questionnaire || {};
  if (schema.length === 0) {
    score += 30;
  } else {
    let answered = 0;
    for (const f of schema) {
      if (qResponses[f.fieldKey] !== undefined && qResponses[f.fieldKey] !== null && qResponses[f.fieldKey] !== '') {
        answered++;
      }
    }
    score += Math.round((answered / schema.length) * 30);
  }

  // 3. Mandatory documents attached (up to 30 points)
  const mandatoryDocs = (scholarship.requiredDocuments || []).filter((d) => d.isMandatory);
  const selectedDocs = draftData.selectedDocuments || {};
  if (mandatoryDocs.length === 0) {
    score += 30;
  } else {
    let attached = 0;
    for (const doc of mandatoryDocs) {
      if (selectedDocs[doc.documentType]) {
        attached++;
      }
    }
    score += Math.round((attached / mandatoryDocs.length) * 30);
  }

  return Math.min(100, Math.max(0, score));
}

module.exports = {
  validateQuestionnaire,
  generateApplicationNumber,
  buildSnapshotDataJson,
  calculateDraftHealthScore,
};
