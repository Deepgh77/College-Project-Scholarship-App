const { prisma } = require('../../config/prisma');
const studentProfileRepository = require('./student-profile.repository');
const scholarshipService = require('../scholarship/scholarship.service');
const {
  getStatusMetadata,
  formatTimelineEvent,
} = require('../application/application-tracking.service');

class StudentProfileService {
  /**
   * Deterministically calculates profile completion percentage across 5 logical sections.
   * Every section carries exactly 20% (Total: 100%).
   * Unentered / NULL / empty fields strictly contribute 0 points.
   * No synthetic or database default contributes points.
   */
  calculateCompletion(profile) {
    if (!profile) {
      return {
        total: 0,
        sections: { personal: 0, address: 0, academic: 0, income: 0, bank: 0 },
      };
    }

    const isNonEmptyStr = (val) => typeof val === 'string' && val.trim().length > 0;
    const isValidNum = (val) => val !== null && val !== undefined && val !== '' && !isNaN(Number(val));

    // 1. Personal Details (20%)
    let personalScore = 0;
    if (isNonEmptyStr(profile.fullName)) personalScore += 5;
    if (profile.dob && !isNaN(new Date(profile.dob).getTime())) personalScore += 5;
    if (profile.gender && ['MALE', 'FEMALE', 'OTHER'].includes(profile.gender)) personalScore += 5;
    if (profile.category && ['OPEN', 'OBC', 'SC', 'ST', 'VJNT', 'SBC', 'EWS'].includes(profile.category)) personalScore += 5;

    // 2. Contact & Address Details (20%)
    let addressScore = 0;
    if (profile.mobile && /^[6-9]\d{9}$/.test(String(profile.mobile).trim())) addressScore += 3;
    if (isNonEmptyStr(profile.address)) addressScore += 3;
    if (isNonEmptyStr(profile.state)) addressScore += 3;
    if (isNonEmptyStr(profile.district)) addressScore += 3;
    if (isNonEmptyStr(profile.taluka)) addressScore += 2;
    if (isNonEmptyStr(profile.cityVillage)) addressScore += 3;
    if (profile.pincode && /^\d{6}$/.test(String(profile.pincode).trim())) addressScore += 3;

    // 3. Academic Details (20%)
    let academicScore = 0;
    if (isNonEmptyStr(profile.collegeId)) academicScore += 4;
    if (isNonEmptyStr(profile.courseName)) academicScore += 4;
    if (isValidNum(profile.courseYear) && Number(profile.courseYear) >= 1 && Number(profile.courseYear) <= 6) academicScore += 3;
    if (isValidNum(profile.admissionYear) && Number(profile.admissionYear) >= 2015 && Number(profile.admissionYear) <= 2035) academicScore += 3;
    if (isNonEmptyStr(profile.previousQualification)) academicScore += 3;
    if (isValidNum(profile.previousPercentage) && Number(profile.previousPercentage) > 0 && Number(profile.previousPercentage) <= 100) academicScore += 3;

    // 4. Family & Income Details (20%)
    let incomeScore = 0;
    if (isNonEmptyStr(profile.guardianName)) incomeScore += 10;
    if (isValidNum(profile.annualFamilyIncome) && Number(profile.annualFamilyIncome) >= 0) incomeScore += 10;

    // 5. Bank Details (20%)
    let bankScore = 0;
    if (profile.bankAccountNo && /^\d{9,18}$/.test(String(profile.bankAccountNo).trim())) bankScore += 7;
    if (profile.bankIfsc && /^[A-Z]{4}0[A-Z0-9]{6}$/.test(String(profile.bankIfsc).trim().toUpperCase())) bankScore += 7;
    if (isNonEmptyStr(profile.bankName)) bankScore += 6;

    const total = Math.min(100, personalScore + addressScore + academicScore + incomeScore + bankScore);

    return {
      total,
      sections: {
        personal: personalScore,
        address: addressScore,
        academic: academicScore,
        income: incomeScore,
        bank: bankScore,
      },
    };
  }

  /**
   * Helper to normalize a field value:
   * - undefined in rawData: preserve existing value (or null if new)
   * - null or empty string: return null (intentionally cleared or unprovided)
   * - provided string: return trimmed string
   */
  _normalizeString(rawVal, existingVal) {
    if (rawVal === undefined) return existingVal ?? null;
    if (rawVal === null || (typeof rawVal === 'string' && rawVal.trim() === '')) return null;
    return String(rawVal).trim();
  }

  /**
   * Helper to normalize a numeric field:
   * - undefined in rawData: preserve existing value (or null if new)
   * - null or empty string: return null
   * - valid number: return parsed number
   */
  _normalizeNumber(rawVal, existingVal) {
    if (rawVal === undefined) {
      if (existingVal === null || existingVal === undefined) return null;
      return Number(existingVal);
    }
    if (rawVal === null || rawVal === '' || isNaN(Number(rawVal))) return null;
    return Number(rawVal);
  }

  /**
   * Get student profile for authenticated student
   */
  async getProfile(userId) {
    const profile = await studentProfileRepository.findByUserId(userId);
    const completion = this.calculateCompletion(profile);

    return {
      profile,
      completion,
    };
  }

  /**
   * Create or update student profile without synthetic defaults.
   * Unprovided / empty fields remain NULL in PostgreSQL.
   */
  async saveProfile(userId, rawData) {
    const existing = await studentProfileRepository.findByUserId(userId);

    // Normalize DOB
    let dob = null;
    if (rawData.dob === undefined) {
      dob = existing?.dob ?? null;
    } else if (rawData.dob && !isNaN(Date.parse(rawData.dob))) {
      dob = new Date(rawData.dob);
    }

    // Normalize Handicap & Percentage
    let isHandicapped = false;
    if (rawData.isHandicapped === undefined) {
      isHandicapped = existing?.isHandicapped ?? false;
    } else {
      isHandicapped = Boolean(rawData.isHandicapped);
    }

    let disabilityPercentage = null;
    if (isHandicapped) {
      disabilityPercentage = this._normalizeNumber(rawData.disabilityPercentage, existing?.disabilityPercentage);
    }

    // Assemble genuine profile data
    const profileData = {
      // 1. Personal Details
      fullName: this._normalizeString(rawData.fullName, existing?.fullName),
      dob,
      gender: this._normalizeString(rawData.gender, existing?.gender),
      category: this._normalizeString(rawData.category, existing?.category),
      religion: this._normalizeString(rawData.religion, existing?.religion),
      isHandicapped,
      disabilityPercentage,

      // 2. Contact & Address Details
      mobile: this._normalizeString(rawData.mobile, existing?.mobile),
      address: this._normalizeString(rawData.address, existing?.address),
      state: this._normalizeString(rawData.state, existing?.state),
      district: this._normalizeString(rawData.district, existing?.district),
      taluka: this._normalizeString(rawData.taluka, existing?.taluka),
      cityVillage: this._normalizeString(rawData.cityVillage, existing?.cityVillage),
      pincode: this._normalizeString(rawData.pincode, existing?.pincode),

      // 3. Academic Details
      collegeId: this._normalizeString(rawData.collegeId, existing?.collegeId),
      courseName: this._normalizeString(rawData.courseName, existing?.courseName),
      courseYear: this._normalizeNumber(rawData.courseYear, existing?.courseYear),
      admissionYear: this._normalizeNumber(rawData.admissionYear, existing?.admissionYear),
      previousQualification: this._normalizeString(rawData.previousQualification, existing?.previousQualification),
      previousPercentage: this._normalizeNumber(rawData.previousPercentage, existing?.previousPercentage),

      // 4. Family & Income Details
      guardianName: this._normalizeString(rawData.guardianName, existing?.guardianName),
      annualFamilyIncome: this._normalizeNumber(rawData.annualFamilyIncome, existing?.annualFamilyIncome),

      // 5. Bank Details
      bankAccountNo: this._normalizeString(rawData.bankAccountNo, existing?.bankAccountNo),
      bankIfsc: rawData.bankIfsc !== undefined
        ? (rawData.bankIfsc && String(rawData.bankIfsc).trim() ? String(rawData.bankIfsc).trim().toUpperCase() : null)
        : (existing?.bankIfsc ?? null),
      bankName: this._normalizeString(rawData.bankName, existing?.bankName),
    };

    // Calculate genuine completion percentage
    const completion = this.calculateCompletion(profileData);
    profileData.completionPercentage = completion.total;

    // Persist strictly genuine student profile to database
    const savedProfile = await studentProfileRepository.upsertProfile(userId, profileData);

    return {
      profile: savedProfile,
      completion,
    };
  }

  /**
   * List colleges for dropdown
   */
  async getColleges() {
    return studentProfileRepository.findAllColleges();
  }

  /**
   * Aggregates student dashboard metrics, profile completion, active application,
   * open actions required, documents count, featured scholarships, and recent activity.
   */
  async getDashboardData(userId) {
    const profile = await studentProfileRepository.findByUserId(userId);
    const completion = this.calculateCompletion(profile);

    const studentInfo = {
      fullName: profile?.fullName || null,
      college: profile?.college
        ? {
            id: profile.college.id,
            name: profile.college.name,
            code: profile.college.code,
          }
        : null,
    };

    if (!profile) {
      // New / uninitialized student
      return {
        student: studentInfo,
        profile: {
          completionPercentage: 0,
          sections: completion.sections,
        },
        activeApplication: null,
        totalApplicationsCount: 0,
        actionRequired: { count: 0, items: [] },
        documents: { uploadedCount: 0 },
        featuredScholarships: [],
        recentActivity: [],
        payment: null,
      };
    }

    // Query student's applications with scholarship, latest review, open corrections, paymentRecord
    const [applications, docCount, auditLogs, allScholarships] = await Promise.all([
      prisma.application.findMany({
        where: { studentId: profile.id },
        include: {
          scholarship: {
            include: {
              department: {
                select: { id: true, code: true, name: true },
              },
            },
          },
          reviews: {
            orderBy: { cycleNumber: 'desc' },
            take: 1,
          },
          correctionRequests: {
            where: {
              status: { in: ['OPEN', 'RE_FLAGGED'] },
            },
          },
          paymentRecord: {
            include: {
              batch: {
                select: { batchNumber: true },
              },
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.document.count({
        where: { studentId: profile.id },
      }),
      prisma.applicationAuditLog.findMany({
        where: { application: { studentId: profile.id } },
        take: 5,
        orderBy: { timestamp: 'desc' },
        include: {
          application: {
            select: {
              id: true,
              applicationNumber: true,
              scholarship: { select: { name: true } },
            },
          },
        },
      }),
      scholarshipService.getScholarships({ isActive: true }, userId),
    ]);

    // Select most relevant / active application
    // Priority:
    // 1. Sent back (Action Required)
    // 2. In-flight review (Under review, submitted, forwarded)
    // 3. Payment active / Approved / Disbursed
    // 4. Draft
    // 5. Terminal / latest
    const activeApp =
      applications.find((a) => ['COLLEGE_SENT_BACK', 'AUTHORITY_SENT_BACK'].includes(a.status)) ||
      applications.find((a) =>
        [
          'SUBMITTED',
          'UNDER_COLLEGE_REVIEW',
          'RESUBMITTED_TO_COLLEGE',
          'FORWARDED_TO_AUTHORITY',
          'UNDER_AUTHORITY_REVIEW',
          'PAYMENT_PROCESSING',
          'PAYMENT_INITIATED',
        ].includes(a.status)
      ) ||
      applications.find((a) => ['APPROVED', 'DISBURSED', 'UNDISBURSED'].includes(a.status)) ||
      applications.find((a) => a.status === 'DRAFT') ||
      applications[0] ||
      null;

    let formattedActiveApp = null;
    let paymentSummary = null;

    if (activeApp) {
      const statusMeta = getStatusMetadata(activeApp.status);
      formattedActiveApp = {
        id: activeApp.id,
        applicationNumber: activeApp.applicationNumber,
        status: activeApp.status,
        statusMeta,
        academicYear: activeApp.academicYear,
        cycleNumber: activeApp.reviews?.[0]?.cycleNumber || 1,
        submittedAt: activeApp.submittedAt,
        scholarship: {
          id: activeApp.scholarship.id,
          code: activeApp.scholarship.code,
          name: activeApp.scholarship.name,
          benefitAmount: Number(activeApp.scholarship.benefitAmount),
          department: activeApp.scholarship.department,
        },
      };

      if (activeApp.paymentRecord) {
        paymentSummary = {
          id: activeApp.paymentRecord.id,
          status: activeApp.paymentRecord.status,
          amount: Number(activeApp.paymentRecord.amount),
          simulationReference: activeApp.paymentRecord.simulationReference,
          batchNumber: activeApp.paymentRecord.batch?.batchNumber || null,
          disbursedAt: activeApp.paymentRecord.disbursedAt,
          failureReason: activeApp.paymentRecord.failureReason,
        };
      }
    }

    // Collect all open correction requests across applications
    const openCorrectionItems = [];
    for (const app of applications) {
      for (const c of app.correctionRequests || []) {
        openCorrectionItems.push({
          id: c.id,
          applicationId: app.id,
          applicationNumber: app.applicationNumber,
          scholarshipName: app.scholarship?.name,
          affectedSection: c.affectedSection,
          affectedField: c.affectedField,
          affectedDocumentType: c.affectedDocumentType,
          rejectionCategory: c.rejectionCategory,
          reasonText: c.reasonText,
          actionRequiredText: c.actionRequiredText,
          status: c.status,
        });
      }
    }

    // Format recent activity
    const recentActivity = auditLogs.map((log) => {
      const formatted = formatTimelineEvent(log);
      return {
        ...formatted,
        applicationNumber: log.application?.applicationNumber,
        scholarshipName: log.application?.scholarship?.name,
      };
    });

    // Top 3 featured/recommended scholarships with evaluated eligibility
    const rawScholarshipList = Array.isArray(allScholarships)
      ? allScholarships
      : (allScholarships?.scholarships || []);
    const featuredScholarships = rawScholarshipList.slice(0, 3).map((s) => ({
      id: s.id,
      code: s.code,
      name: s.name,
      benefitAmount: s.benefitAmount,
      academicYear: s.academicYear,
      departmentName: s.department?.name,
      departmentCode: s.department?.code,
      isWindowOpen: s.isWindowOpen,
      eligibility: s.eligibility
        ? {
            status: s.eligibility.status,
            isEligible: s.eligibility.isEligible,
            summary: s.eligibility.summary,
          }
        : null,
    }));

    return {
      student: studentInfo,
      profile: {
        completionPercentage: completion.total,
        sections: completion.sections,
      },
      activeApplication: formattedActiveApp,
      totalApplicationsCount: applications.length,
      actionRequired: {
        count: openCorrectionItems.length,
        items: openCorrectionItems,
      },
      documents: {
        uploadedCount: docCount,
      },
      featuredScholarships,
      recentActivity,
      payment: paymentSummary,
    };
  }
}

module.exports = new StudentProfileService();
