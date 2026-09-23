const scholarshipRepository = require('./scholarship.repository');
const { evaluateScholarshipEligibility } = require('./eligibility.engine');

class ScholarshipService {
  /**
   * Computes the application window status without altering catalog visibility
   */
  _computeWindowStatus(startDate, endDate, now = new Date()) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (now < start) {
      return { isWindowOpen: false, windowStatus: 'UPCOMING' };
    }
    if (now > end) {
      return { isWindowOpen: false, windowStatus: 'CLOSED' };
    }
    return { isWindowOpen: true, windowStatus: 'OPEN' };
  }

  /**
   * List scholarships for catalog discovery with optional filters and student eligibility
   */
  async getScholarships(filters = {}, userId = null) {
    const scholarships = await scholarshipRepository.findAll(filters);

    let studentProfile = null;
    if (userId) {
      studentProfile = await scholarshipRepository.findStudentProfileByUserId(userId);
    }

    const now = new Date();
    const formatted = scholarships.map((s) => {
      const windowInfo = this._computeWindowStatus(s.applicationStartDate, s.applicationEndDate, now);

      let eligibility = null;
      if (userId) {
        const evalResult = evaluateScholarshipEligibility(s.rules, studentProfile, now);
        eligibility = {
          status: evalResult.status,
          isEligible: evalResult.isEligible,
          summary: evalResult.summary,
          missingCount: evalResult.missingFields.length,
        };
      }

      return {
        id: s.id,
        code: s.code,
        academicYear: s.academicYear,
        name: s.name,
        description: s.description,
        benefitAmount: Number(s.benefitAmount),
        applicationStartDate: s.applicationStartDate,
        applicationEndDate: s.applicationEndDate,
        isFreshAllowed: s.isFreshAllowed,
        isRenewalAllowed: s.isRenewalAllowed,
        isActive: s.isActive,
        ...windowInfo,
        department: s.department,
        rulesCount: s.rules.length,
        requiredDocsCount: s.requiredDocuments.length,
        requiredDocumentTypes: s.requiredDocuments.map((d) => d.documentType),
        ...(eligibility ? { eligibility } : {}),
      };
    });

    return {
      count: formatted.length,
      scholarships: formatted,
    };
  }

  /**
   * Get single scholarship details by ID
   */
  async getScholarshipById(id, userId = null) {
    const s = await scholarshipRepository.findById(id);
    if (!s) {
      const error = new Error('Scholarship not found.');
      error.statusCode = 404;
      throw error;
    }

    const now = new Date();
    const windowInfo = this._computeWindowStatus(s.applicationStartDate, s.applicationEndDate, now);

    let evaluation = null;
    if (userId) {
      const studentProfile = await scholarshipRepository.findStudentProfileByUserId(userId);
      evaluation = evaluateScholarshipEligibility(s.rules, studentProfile, now);
    }

    return {
      scholarship: {
        id: s.id,
        code: s.code,
        academicYear: s.academicYear,
        name: s.name,
        description: s.description,
        benefitAmount: Number(s.benefitAmount),
        applicationStartDate: s.applicationStartDate,
        applicationEndDate: s.applicationEndDate,
        isFreshAllowed: s.isFreshAllowed,
        isRenewalAllowed: s.isRenewalAllowed,
        isActive: s.isActive,
        ...windowInfo,
        department: s.department,
        rules: s.rules.map((r) => ({
          id: r.id,
          ruleGroup: r.ruleGroup,
          fieldPath: r.fieldPath,
          operator: r.operator,
          targetValue: r.targetValue,
          failureReasonText: r.failureReasonText,
        })),
        requiredDocuments: s.requiredDocuments.map((d) => ({
          id: d.id,
          documentType: d.documentType,
          isMandatory: d.isMandatory,
          helpTitle: d.helpTitle,
          helpTextSimple: d.helpTextSimple,
        })),
        ...(evaluation ? { evaluation } : {}),
      },
    };
  }

  /**
   * Get active departments list
   */
  async getDepartments() {
    return scholarshipRepository.findAllDepartments();
  }

  /**
   * Evaluate authenticated student's eligibility for a specific scholarship
   */
  async evaluateStudentEligibility(scholarshipId, userId) {
    const scholarship = await scholarshipRepository.findById(scholarshipId);
    if (!scholarship) {
      const error = new Error('Scholarship not found.');
      error.statusCode = 404;
      throw error;
    }

    const studentProfile = await scholarshipRepository.findStudentProfileByUserId(userId);
    const evaluation = evaluateScholarshipEligibility(scholarship.rules, studentProfile);

    return {
      scholarshipId: scholarship.id,
      scholarshipCode: scholarship.code,
      scholarshipName: scholarship.name,
      profileExists: Boolean(studentProfile),
      evaluation,
    };
  }

  /**
   * Batch evaluate all active scholarships for the authenticated student
   */
  async evaluateAllScholarships(userId) {
    const scholarships = await scholarshipRepository.findAll({ includeInactive: false });
    const studentProfile = await scholarshipRepository.findStudentProfileByUserId(userId);

    const now = new Date();
    const evaluations = {};

    for (const s of scholarships) {
      const evalResult = evaluateScholarshipEligibility(s.rules, studentProfile, now);
      evaluations[s.id] = {
        scholarshipId: s.id,
        code: s.code,
        name: s.name,
        status: evalResult.status,
        isEligible: evalResult.isEligible,
        summary: evalResult.summary,
        missingFields: evalResult.missingFields,
        failedReasons: evalResult.failedReasons,
      };
    }

    return {
      profileExists: Boolean(studentProfile),
      totalEvaluated: scholarships.length,
      evaluations,
    };
  }
}

module.exports = new ScholarshipService();
