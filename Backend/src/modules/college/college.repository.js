const { prisma } = require('../../config/prisma');

/**
 * College Repository
 * Interacts with PostgreSQL via Prisma, enforcing strict institutional tenant isolation
 * on all queries so a COLLEGE officer can ONLY access applications for their own college.
 */
class CollegeRepository {
  /**
   * Look up college details by college ID.
   */
  async findCollegeById(collegeId) {
    return prisma.college.findUnique({
      where: { id: collegeId },
    });
  }

  /**
   * Look up college by user's assigned collegeId.
   */
  async findCollegeByUserId(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { college: true },
    });
    return user?.college || null;
  }

  /**
   * Get college-scoped dashboard metrics and deterministic workload intelligence.
   */
  async getDashboardMetrics(collegeId) {
    const now = new Date();

    // 1. Core status counts for this college (excluding draft)
    const baseWhere = {
      student: { collegeId },
      status: { not: 'DRAFT' },
    };

    const [
      totalApplications,
      submittedCount,
      underReviewCount,
      sentBackCount,
      forwardedCount,
      rejectedCount,
      resubmittedCount,
      approvedCount,
    ] = await Promise.all([
      prisma.application.count({ where: baseWhere }),
      prisma.application.count({ where: { ...baseWhere, status: 'SUBMITTED' } }),
      prisma.application.count({ where: { ...baseWhere, status: 'UNDER_COLLEGE_REVIEW' } }),
      prisma.application.count({ where: { ...baseWhere, status: 'COLLEGE_SENT_BACK' } }),
      prisma.application.count({
        where: {
          ...baseWhere,
          status: {
            in: [
              'FORWARDED_TO_AUTHORITY',
              'UNDER_AUTHORITY_REVIEW',
              'AUTHORITY_SENT_BACK',
              'AUTHORITY_REJECTED',
              'APPROVED',
              'PAYMENT_PROCESSING',
              'PAYMENT_INITIATED',
              'DISBURSED',
              'UNDISBURSED',
            ],
          },
        },
      }),
      prisma.application.count({ where: { ...baseWhere, status: 'COLLEGE_REJECTED' } }),
      prisma.application.count({ where: { ...baseWhere, status: 'RESUBMITTED_TO_COLLEGE' } }),
      prisma.application.count({ where: { ...baseWhere, status: 'APPROVED' } }),
    ]);

    const awaitingAction = submittedCount + resubmittedCount;

    // 2. Deterministic aging calculation for applications requiring college attention
    const activeCollegeApps = await prisma.application.findMany({
      where: {
        student: { collegeId },
        status: { in: ['SUBMITTED', 'RESUBMITTED_TO_COLLEGE', 'UNDER_COLLEGE_REVIEW'] },
      },
      select: {
        id: true,
        submittedAt: true,
        updatedAt: true,
        status: true,
      },
    });

    let freshUnder3Days = 0;
    let moderate3To7Days = 0;
    let overdueOver7Days = 0;

    for (const app of activeCollegeApps) {
      const refDate = app.status === 'RESUBMITTED_TO_COLLEGE' ? app.updatedAt : app.submittedAt || app.updatedAt;
      const ageInDays = Math.floor((now - new Date(refDate)) / (1000 * 60 * 60 * 24));

      if (ageInDays < 3) {
        freshUnder3Days++;
      } else if (ageInDays <= 7) {
        moderate3To7Days++;
      } else {
        overdueOver7Days++;
      }
    }

    // 3. Immediate Action Required: Oldest pending applications awaiting college review
    const immediateActionApps = await prisma.application.findMany({
      where: {
        student: { collegeId },
        status: { in: ['SUBMITTED', 'RESUBMITTED_TO_COLLEGE'] },
      },
      orderBy: { submittedAt: 'asc' },
      take: 6,
      include: {
        student: { select: { fullName: true, category: true, courseName: true } },
        scholarship: { select: { name: true, code: true } },
        snapshots: { orderBy: { cycleNumber: 'desc' }, take: 1, select: { cycleNumber: true } },
      },
    });

    const immediateActionRequired = immediateActionApps.map((a) => {
      const refDate = a.status === 'RESUBMITTED_TO_COLLEGE' ? a.updatedAt : a.submittedAt || a.createdAt;
      const daysPending = Math.floor((now - new Date(refDate)) / (1000 * 60 * 60 * 24));
      return {
        id: a.id,
        applicationNumber: a.applicationNumber,
        studentName: a.student?.fullName || 'Applicant',
        studentCategory: a.student?.category || null,
        courseName: a.student?.courseName || null,
        scholarshipName: a.scholarship?.name || '',
        scholarshipCode: a.scholarship?.code || '',
        status: a.status,
        cycleNumber: a.snapshots?.[0]?.cycleNumber || 1,
        submittedAt: a.submittedAt,
        updatedAt: a.updatedAt,
        daysPending,
      };
    });

    // 4. Scheme-wise distribution of applications
    const schemeCounts = await prisma.application.groupBy({
      by: ['scholarshipId'],
      where: baseWhere,
      _count: { id: true },
    });

    const scholarshipIds = schemeCounts.map((sc) => sc.scholarshipId);
    const scholarships = await prisma.scholarship.findMany({
      where: { id: { in: scholarshipIds } },
      select: { id: true, code: true, name: true },
    });

    const scholarshipMap = new Map(scholarships.map((s) => [s.id, s]));
    const schemeDistribution = schemeCounts
      .map((sc) => {
        const s = scholarshipMap.get(sc.scholarshipId);
        return {
          id: sc.scholarshipId,
          code: s?.code || 'N/A',
          name: s?.name || 'Unknown Scheme',
          count: sc._count.id,
        };
      })
      .sort((a, b) => b.count - a.count);

    return {
      metrics: {
        totalApplications,
        awaitingAction,
        submittedCount,
        resubmittedCount,
        underReviewCount,
        sentBackCount,
        forwardedCount,
        rejectedCount,
        approvedCount,
      },
      workload: {
        aging: {
          freshUnder3Days,
          moderate3To7Days,
          overdueOver7Days,
        },
        immediateActionRequired,
        schemeDistribution,
      },
    };
  }

  /**
   * Get filtered, sorted, paginated applications strictly for the reviewer's college.
   */
  async getApplications(collegeId, {
    page = 1,
    limit = 15,
    search = '',
    status = 'ALL',
    scholarshipId = '',
    academicYear = '',
    sortBy = 'submittedAt',
    sortOrder = 'desc',
  } = {}) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 15));
    const skip = (pageNum - 1) * limitNum;

    // Strict college tenant scoping
    const where = {
      student: { collegeId },
      status: { not: 'DRAFT' },
    };

    // Status filter
    if (status && status !== 'ALL') {
      if (status === 'AWAITING_ACTION') {
        where.status = { in: ['SUBMITTED', 'RESUBMITTED_TO_COLLEGE'] };
      } else if (status === 'FORWARDED') {
        where.status = {
          in: [
            'FORWARDED_TO_AUTHORITY',
            'UNDER_AUTHORITY_REVIEW',
            'AUTHORITY_SENT_BACK',
            'AUTHORITY_REJECTED',
            'APPROVED',
            'PAYMENT_PROCESSING',
            'PAYMENT_INITIATED',
            'DISBURSED',
            'UNDISBURSED',
          ],
        };
      } else {
        where.status = status;
      }
    }

    // Scholarship filter
    if (scholarshipId) {
      where.scholarshipId = scholarshipId;
    }

    // Academic year filter
    if (academicYear) {
      where.academicYear = academicYear;
    }

    // Search query
    const trimmedSearch = search.trim();
    if (trimmedSearch) {
      where.OR = [
        { applicationNumber: { contains: trimmedSearch, mode: 'insensitive' } },
        { student: { fullName: { contains: trimmedSearch, mode: 'insensitive' } } },
        { student: { user: { email: { contains: trimmedSearch, mode: 'insensitive' } } } },
        { student: { mobile: { contains: trimmedSearch, mode: 'insensitive' } } },
      ];
    }

    // Sorting
    let orderBy = {};
    const validSortOrder = sortOrder.toLowerCase() === 'asc' ? 'asc' : 'desc';

    if (sortBy === 'studentName') {
      orderBy = { student: { fullName: validSortOrder } };
    } else if (sortBy === 'updatedAt') {
      orderBy = { updatedAt: validSortOrder };
    } else {
      orderBy = { submittedAt: validSortOrder };
    }

    const [total, applications] = await Promise.all([
      prisma.application.count({ where }),
      prisma.application.findMany({
        where,
        skip,
        take: limitNum,
        orderBy,
        include: {
          student: {
            select: {
              fullName: true,
              category: true,
              gender: true,
              mobile: true,
              courseName: true,
              courseYear: true,
              user: { select: { email: true } },
            },
          },
          scholarship: {
            select: {
              id: true,
              code: true,
              name: true,
              benefitAmount: true,
            },
          },
          snapshots: {
            orderBy: { cycleNumber: 'desc' },
            take: 1,
            select: { cycleNumber: true },
          },
          correctionRequests: {
            where: { status: 'OPEN' },
            select: { id: true },
          },
        },
      }),
    ]);

    const now = new Date();
    const formatted = applications.map((app) => {
      const refDate = app.status === 'RESUBMITTED_TO_COLLEGE' ? app.updatedAt : app.submittedAt || app.createdAt;
      const daysPending = Math.floor((now - new Date(refDate)) / (1000 * 60 * 60 * 24));

      return {
        id: app.id,
        applicationNumber: app.applicationNumber,
        student: {
          fullName: app.student?.fullName || 'Applicant',
          category: app.student?.category,
          gender: app.student?.gender,
          mobile: app.student?.mobile,
          email: app.student?.user?.email,
          courseName: app.student?.courseName,
          courseYear: app.student?.courseYear,
        },
        scholarship: app.scholarship,
        academicYear: app.academicYear,
        status: app.status,
        cycleNumber: app.snapshots?.[0]?.cycleNumber || 1,
        openCorrectionsCount: app.correctionRequests?.length || 0,
        submittedAt: app.submittedAt,
        updatedAt: app.updatedAt,
        daysPending,
      };
    });

    return {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 1,
      applications: formatted,
    };
  }

  /**
   * Get full details of an application for review desk, strictly scoped to college.
   */
  async getApplicationDetails(collegeId, applicationId) {
    return prisma.application.findFirst({
      where: {
        id: applicationId,
        student: { collegeId },
      },
      include: {
        student: {
          include: {
            user: { select: { id: true, email: true, createdAt: true } },
            college: true,
          },
        },
        scholarship: {
          include: {
            department: true,
            rules: true,
            requiredDocuments: true,
          },
        },
        snapshots: {
          orderBy: { cycleNumber: 'desc' },
        },
        documentSnapshots: {
          include: {
            documentVersion: true,
          },
          orderBy: { cycleNumber: 'desc' },
        },
        reviews: {
          include: {
            reviewerUser: { select: { id: true, email: true, role: true } },
            correctionRequests: {
              include: {
                resolvedDocumentVersion: true,
              },
            },
          },
          orderBy: { reviewedAt: 'desc' },
        },
        correctionRequests: {
          include: {
            resolvedDocumentVersion: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        auditLogs: {
          include: {
            actorUser: { select: { id: true, email: true, role: true } },
          },
          orderBy: { timestamp: 'asc' },
        },
      },
    });
  }

  /**
   * Securely resolve an application's snapshotted document version for preview/download.
   * Strictly enforces that:
   * 1. Application belongs to the reviewer's college.
   * 2. Document version is actually attached to this application in ApplicationDocumentSnapshot.
   */
  async findApplicationDocumentVersion(collegeId, applicationId, documentVersionId) {
    const app = await prisma.application.findFirst({
      where: {
        id: applicationId,
        student: { collegeId },
      },
      include: {
        documentSnapshots: {
          where: { documentVersionId },
          include: { documentVersion: true },
        },
      },
    });

    if (!app || !app.documentSnapshots || app.documentSnapshots.length === 0) {
      return null;
    }

    return app.documentSnapshots[0].documentVersion;
  }

  /**
   * Initiate College Scrutiny: Transitions status from SUBMITTED or RESUBMITTED_TO_COLLEGE to UNDER_COLLEGE_REVIEW.
   */
  async startReview({ collegeId, applicationId, reviewerUserId, clientIp = null }) {
    return prisma.$transaction(async (tx) => {
      const app = await tx.application.findFirst({
        where: {
          id: applicationId,
          student: { collegeId },
        },
      });

      if (!app) {
        const error = new Error('Application not found or access denied.');
        error.statusCode = 404;
        throw error;
      }

      const permittedStatuses = ['SUBMITTED', 'RESUBMITTED_TO_COLLEGE'];
      if (!permittedStatuses.includes(app.status)) {
        const error = new Error(
          `Cannot initiate scrutiny from status "${app.status}". Scrutiny can only be started on newly submitted or resubmitted applications.`
        );
        error.statusCode = 400;
        throw error;
      }

      const previousStatus = app.status;
      const updated = await tx.application.update({
        where: { id: applicationId },
        data: {
          status: 'UNDER_COLLEGE_REVIEW',
          updatedAt: new Date(),
        },
      });

      await tx.applicationAuditLog.create({
        data: {
          applicationId,
          actorUserId: reviewerUserId,
          actorRole: 'COLLEGE',
          action: 'REVIEW_UNDER_COLLEGE',
          previousStatus,
          newStatus: 'UNDER_COLLEGE_REVIEW',
          remarks: 'College verification officer opened application for scrutiny.',
          ipAddress: clientIp,
          timestamp: new Date(),
        },
      });

      return updated;
    });
  }

  /**
   * Submit Review Decision:
   * - VERIFY_FORWARD -> FORWARDED_TO_AUTHORITY
   * - SEND_BACK -> COLLEGE_SENT_BACK (with structured corrections)
   * - REJECT -> COLLEGE_REJECTED (with category and reason)
   */
  async submitReviewDecision({
    collegeId,
    applicationId,
    reviewerUserId,
    decision,
    checklistJson = {},
    overallRemarks = '',
    corrections = [],
    clientIp = null,
  }) {
    return prisma.$transaction(async (tx) => {
      const app = await tx.application.findFirst({
        where: {
          id: applicationId,
          student: { collegeId },
        },
        include: {
          student: true,
          snapshots: { orderBy: { cycleNumber: 'desc' }, take: 1 },
          correctionRequests: { where: { status: 'OPEN' } },
        },
      });

      if (!app) {
        const error = new Error('Application not found or access denied.');
        error.statusCode = 404;
        throw error;
      }

      if (app.status !== 'UNDER_COLLEGE_REVIEW') {
        const error = new Error(
          `Cannot submit scrutiny decision while application is in status "${app.status}". Must be in UNDER_COLLEGE_REVIEW.`
        );
        error.statusCode = 400;
        throw error;
      }

      const currentCycle = app.snapshots.length > 0 ? app.snapshots[0].cycleNumber : 1;
      const previousStatus = app.status;

      let newStatus;
      let auditAction;

      if (decision === 'VERIFY_FORWARD') {
        // Precondition 1: Zero open correction requests allowed
        if (app.correctionRequests && app.correctionRequests.length > 0) {
          const error = new Error(
            `Cannot forward application to Authority while ${app.correctionRequests.length} open correction request(s) remain unresolved.`
          );
          error.statusCode = 400;
          throw error;
        }

        newStatus = 'FORWARDED_TO_AUTHORITY';
        auditAction = 'COLLEGE_FORWARDED';
      } else if (decision === 'SEND_BACK') {
        // Precondition 2: Must provide at least one structured correction
        if (!corrections || corrections.length === 0) {
          const error = new Error('At least one structured correction request is required to send back an application.');
          error.statusCode = 400;
          throw error;
        }

        newStatus = 'COLLEGE_SENT_BACK';
        auditAction = 'COLLEGE_SENT_BACK';
      } else if (decision === 'REJECT') {
        if (!overallRemarks || overallRemarks.trim().length < 10) {
          const error = new Error('A detailed reason (minimum 10 characters) is required to reject an application.');
          error.statusCode = 400;
          throw error;
        }

        newStatus = 'COLLEGE_REJECTED';
        auditAction = 'COLLEGE_REJECTED';
      } else {
        const error = new Error(`Unsupported review decision: ${decision}`);
        error.statusCode = 400;
        throw error;
      }

      // 1. Create ApplicationReview record
      const review = await tx.applicationReview.create({
        data: {
          applicationId,
          cycleNumber: currentCycle,
          reviewerUserId,
          reviewerRole: 'COLLEGE',
          decision,
          checklistJson,
          overallRemarks: overallRemarks || '',
          reviewedAt: new Date(),
        },
      });

      // 2. If SEND_BACK, create structured ApplicationCorrectionRequest records
      if (decision === 'SEND_BACK') {
        for (const corr of corrections) {
          await tx.applicationCorrectionRequest.create({
            data: {
              applicationId,
              reviewId: review.id,
              cycleNumber: currentCycle,
              reviewerRole: 'COLLEGE',
              affectedSection: corr.affectedSection || 'DOCUMENT',
              affectedField: corr.affectedField || null,
              affectedDocumentType: corr.affectedDocumentType || null,
              rejectionCategory: corr.rejectionCategory || 'INCORRECT_DOCUMENT',
              reasonText: corr.reasonText,
              actionRequiredText: corr.actionRequiredText,
              status: 'OPEN',
              createdAt: new Date(),
            },
          });
        }

        // Notify student of action required
        await tx.notification.create({
          data: {
            userId: app.student.userId,
            title: 'Action Required: Application Sent Back by College',
            message: `Your scholarship application was reviewed and returned with ${corrections.length} correction request(s). Please review and rectify them.`,
            category: 'ACTION_REQUIRED',
            actionUrl: `/applications/${applicationId}`,
          },
        });
      }

      // 3. If FORWARDED_TO_AUTHORITY, notify student of progress
      if (decision === 'VERIFY_FORWARD') {
        await tx.notification.create({
          data: {
            userId: app.student.userId,
            title: 'Application Verified by College',
            message: 'Your scholarship application has been verified by your college and forwarded to the Department Authority for final scrutiny.',
            category: 'STATUS_UPDATE',
            actionUrl: `/applications/${applicationId}`,
          },
        });
      }

      // 4. If REJECT, notify student of decision
      if (decision === 'REJECT') {
        await tx.notification.create({
          data: {
            userId: app.student.userId,
            title: 'Application Rejected by College',
            message: `Your scholarship application was reviewed and rejected by your college. Reason: ${overallRemarks}`,
            category: 'STATUS_UPDATE',
            actionUrl: `/applications/${applicationId}`,
          },
        });
      }

      // 5. Update Application status
      const updatedApp = await tx.application.update({
        where: { id: applicationId },
        data: {
          status: newStatus,
          updatedAt: new Date(),
        },
      });

      // 6. Record ApplicationAuditLog entry
      await tx.applicationAuditLog.create({
        data: {
          applicationId,
          actorUserId: reviewerUserId,
          actorRole: 'COLLEGE',
          action: auditAction,
          previousStatus,
          newStatus,
          remarks:
            decision === 'SEND_BACK'
              ? `Application sent back with ${corrections.length} correction(s). Remarks: ${overallRemarks || 'N/A'}`
              : overallRemarks || `Review decision "${decision}" recorded by College verification officer.`,
          ipAddress: clientIp,
          timestamp: new Date(),
        },
      });

      return {
        application: updatedApp,
        review,
      };
    });
  }

  /**
   * Review an individual correction item for resubmitted applications.
   */
  async reviewCorrectionItem({
    collegeId,
    applicationId,
    correctionId,
    reviewerUserId,
    decision,
    remarks = '',
    clientIp = null,
  }) {
    return prisma.$transaction(async (tx) => {
      const app = await tx.application.findFirst({
        where: {
          id: applicationId,
          student: { collegeId },
        },
      });

      if (!app) {
        const error = new Error('Application not found or access denied.');
        error.statusCode = 404;
        throw error;
      }

      const corr = await tx.applicationCorrectionRequest.findFirst({
        where: {
          id: correctionId,
          applicationId,
        },
      });

      if (!corr) {
        const error = new Error('Correction request item not found.');
        error.statusCode = 404;
        throw error;
      }

      const newStatus = decision === 'ACCEPT' ? 'ACCEPTED' : 'RE_FLAGGED';

      const updatedCorr = await tx.applicationCorrectionRequest.update({
        where: { id: correctionId },
        data: {
          status: newStatus,
          reviewedAt: new Date(),
        },
      });

      // If re-flagged, ensure application moves back to COLLEGE_SENT_BACK if currently under review
      if (newStatus === 'RE_FLAGGED' && app.status === 'UNDER_COLLEGE_REVIEW') {
        await tx.application.update({
          where: { id: applicationId },
          data: {
            status: 'COLLEGE_SENT_BACK',
            updatedAt: new Date(),
          },
        });
      }

      await tx.applicationAuditLog.create({
        data: {
          applicationId,
          actorUserId: reviewerUserId,
          actorRole: 'COLLEGE',
          action: `CORRECTION_ITEM_${newStatus}`,
          previousStatus: app.status,
          newStatus: newStatus === 'RE_FLAGGED' ? 'COLLEGE_SENT_BACK' : app.status,
          remarks: `Correction item for ${corr.affectedSection} ${corr.affectedField || corr.affectedDocumentType || ''} marked as ${newStatus}. ${remarks}`,
          ipAddress: clientIp,
          timestamp: new Date(),
        },
      });

      return updatedCorr;
    });
  }
}

module.exports = new CollegeRepository();
