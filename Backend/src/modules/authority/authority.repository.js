const { prisma } = require('../../config/prisma');

/**
 * Authority Repository
 * Interacts with PostgreSQL via Prisma for the Centralized Authority Panel.
 * Applications across ALL departments are accessible, with Department acting as a query filter
 * rather than an access-control isolation boundary.
 */
class AuthorityRepository {
  /**
   * Look up department details by department ID (optional metadata helper).
   */
  async findDepartmentById(departmentId) {
    if (!departmentId) return null;
    return prisma.department.findUnique({
      where: { id: departmentId },
    });
  }

  /**
   * Get centralized dashboard metrics across all departments, including department workload distribution.
   */
  async getDashboardMetrics() {
    const now = new Date();

    // Core status counts across all departments (excluding draft)
    const baseWhere = {
      status: { not: 'DRAFT' },
    };

    const [
      totalApplications,
      forwardedCount,
      underReviewCount,
      sentBackCount,
      approvedCount,
      rejectedCount,
    ] = await Promise.all([
      prisma.application.count({ where: baseWhere }),
      prisma.application.count({ where: { ...baseWhere, status: 'FORWARDED_TO_AUTHORITY' } }),
      prisma.application.count({ where: { ...baseWhere, status: 'UNDER_AUTHORITY_REVIEW' } }),
      prisma.application.count({ where: { ...baseWhere, status: 'AUTHORITY_SENT_BACK' } }),
      prisma.application.count({ where: { ...baseWhere, status: 'APPROVED' } }),
      prisma.application.count({ where: { ...baseWhere, status: 'AUTHORITY_REJECTED' } }),
    ]);

    const awaitingAction = forwardedCount;

    // Active applications requiring authority scrutiny across all departments
    const activeAuthorityApps = await prisma.application.findMany({
      where: {
        status: { in: ['FORWARDED_TO_AUTHORITY', 'UNDER_AUTHORITY_REVIEW'] },
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

    for (const app of activeAuthorityApps) {
      const refDate = app.updatedAt || app.submittedAt;
      const ageInDays = Math.floor((now - new Date(refDate)) / (1000 * 60 * 60 * 24));

      if (ageInDays < 3) {
        freshUnder3Days++;
      } else if (ageInDays <= 7) {
        moderate3To7Days++;
      } else {
        overdueOver7Days++;
      }
    }

    // Immediate action required list (top 6 applications pending action across all departments)
    const immediateActionRequired = await prisma.application.findMany({
      where: {
        status: { in: ['FORWARDED_TO_AUTHORITY', 'UNDER_AUTHORITY_REVIEW'] },
      },
      include: {
        student: {
          include: {
            college: true,
            user: { select: { email: true } },
          },
        },
        scholarship: {
          include: {
            department: { select: { id: true, name: true, code: true } },
          },
        },
      },
      orderBy: { updatedAt: 'asc' },
      take: 6,
    });

    // 1. Department Distribution (workload by department)
    const allDepartments = await prisma.department.findMany({
      where: { isActive: true },
      select: { id: true, code: true, name: true },
    });

    const deptMap = new Map(allDepartments.map((d) => [d.id, { id: d.id, code: d.code, name: d.name, count: 0 }]));

    const appsWithDepts = await prisma.application.findMany({
      where: baseWhere,
      select: {
        id: true,
        scholarship: { select: { departmentId: true } },
      },
    });

    for (const app of appsWithDepts) {
      const dId = app.scholarship?.departmentId;
      if (dId && deptMap.has(dId)) {
        deptMap.get(dId).count++;
      }
    }

    const departmentDistribution = Array.from(deptMap.values()).sort((a, b) => b.count - a.count);

    // 2. Scheme distribution across all departments
    const schemeCounts = await prisma.application.groupBy({
      by: ['scholarshipId'],
      where: baseWhere,
      _count: { id: true },
    });

    const scholarships = await prisma.scholarship.findMany({
      select: { id: true, code: true, name: true, department: { select: { code: true } } },
    });

    const scholarshipMap = new Map(scholarships.map((s) => [s.id, s]));

    const schemeDistribution = schemeCounts
      .map((sc) => {
        const s = scholarshipMap.get(sc.scholarshipId);
        return {
          id: sc.scholarshipId,
          code: s?.code || 'N/A',
          name: s?.name || 'Unknown Scheme',
          departmentCode: s?.department?.code || '',
          count: sc._count.id,
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // 3. College distribution across all departments
    const collegeCounts = await prisma.application.groupBy({
      by: ['studentId'],
      where: baseWhere,
      _count: { id: true },
    });

    const studentsWithColleges = await prisma.studentProfile.findMany({
      where: { id: { in: collegeCounts.map((c) => c.studentId) } },
      select: { id: true, collegeId: true, college: { select: { id: true, name: true, code: true } } },
    });

    const collegeAgg = new Map();
    for (const st of studentsWithColleges) {
      if (st.college) {
        const cId = st.college.id;
        const existing = collegeAgg.get(cId) || { id: cId, name: st.college.name, code: st.college.code, count: 0 };
        existing.count++;
        collegeAgg.set(cId, existing);
      }
    }

    const collegeDistribution = Array.from(collegeAgg.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      metrics: {
        totalApplications,
        awaitingAction,
        forwardedCount,
        underReviewCount,
        sentBackCount,
        approvedCount,
        rejectedCount,
      },
      workload: {
        aging: {
          freshUnder3Days,
          moderate3To7Days,
          overdueOver7Days,
        },
        immediateActionRequired: immediateActionRequired.map((app) => ({
          id: app.id,
          applicationNumber: app.applicationNumber,
          studentName: app.student?.fullName || 'N/A',
          studentEmail: app.student?.user?.email || 'N/A',
          collegeName: app.student?.college?.name || 'N/A',
          scholarshipName: app.scholarship?.name || 'N/A',
          departmentName: app.scholarship?.department?.name || 'N/A',
          departmentCode: app.scholarship?.department?.code || 'N/A',
          status: app.status,
          updatedAt: app.updatedAt,
          daysPending: Math.floor((now - new Date(app.updatedAt || app.submittedAt)) / (1000 * 60 * 60 * 24)),
        })),
        departmentDistribution,
        schemeDistribution,
        collegeDistribution,
      },
    };
  }

  /**
   * Get filtered, sorted, paginated applications across all departments.
   * Department is an optional query filter.
   */
  async getApplications({
    page = 1,
    limit = 15,
    search = '',
    status = 'ALL',
    departmentId = '',
    scholarshipId = '',
    collegeId = '',
    academicYear = '',
    sortBy = 'submittedAt',
    sortOrder = 'desc',
  } = {}) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 15));
    const skip = (pageNum - 1) * limitNum;

    const where = {
      status: { not: 'DRAFT' },
    };

    // Status filter
    if (status && status !== 'ALL') {
      if (status === 'AWAITING_ACTION') {
        where.status = 'FORWARDED_TO_AUTHORITY';
      } else {
        where.status = status;
      }
    }

    // Department filter
    if (departmentId) {
      where.scholarship = { departmentId };
    }

    // Scholarship filter
    if (scholarshipId) {
      where.scholarshipId = scholarshipId;
    }

    // College filter
    if (collegeId) {
      where.student = { collegeId };
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
        { student: { college: { name: { contains: trimmedSearch, mode: 'insensitive' } } } },
      ];
    }

    // Allowed sort columns
    const allowedSortFields = ['submittedAt', 'createdAt', 'updatedAt', 'applicationNumber', 'status'];
    const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'submittedAt';
    const safeSortOrder = sortOrder.toLowerCase() === 'asc' ? 'asc' : 'desc';

    const [total, applications] = await Promise.all([
      prisma.application.count({ where }),
      prisma.application.findMany({
        where,
        include: {
          student: {
            include: {
              college: true,
              user: { select: { email: true } },
            },
          },
          scholarship: {
            select: {
              id: true,
              code: true,
              name: true,
              benefitAmount: true,
              department: { select: { id: true, code: true, name: true } },
            },
          },
          correctionRequests: {
            where: { status: 'OPEN' },
            select: { id: true },
          },
        },
        orderBy: { [safeSortBy]: safeSortOrder },
        skip,
        take: limitNum,
      }),
    ]);

    const now = new Date();
    const formattedApps = applications.map((app) => ({
      id: app.id,
      applicationNumber: app.applicationNumber,
      academicYear: app.academicYear,
      status: app.status,
      submittedAt: app.submittedAt,
      updatedAt: app.updatedAt,
      studentName: app.student?.fullName || 'N/A',
      studentEmail: app.student?.user?.email || 'N/A',
      studentMobile: app.student?.mobile || 'N/A',
      collegeName: app.student?.college?.name || 'N/A',
      collegeCode: app.student?.college?.code || 'N/A',
      scholarshipName: app.scholarship?.name || 'N/A',
      scholarshipCode: app.scholarship?.code || 'N/A',
      departmentName: app.scholarship?.department?.name || 'N/A',
      departmentCode: app.scholarship?.department?.code || 'N/A',
      benefitAmount: app.scholarship?.benefitAmount ? Number(app.scholarship.benefitAmount) : 0,
      openCorrectionsCount: app.correctionRequests?.length || 0,
      daysPending: Math.floor((now - new Date(app.updatedAt || app.submittedAt)) / (1000 * 60 * 60 * 24)),
    }));

    return {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 1,
      applications: formattedApps,
    };
  }

  /**
   * Get detailed application payload for the Authority review desk across any department.
   */
  async getApplicationDetails(applicationId) {
    return prisma.application.findFirst({
      where: {
        id: applicationId,
        status: { not: 'DRAFT' },
      },
      include: {
        student: {
          include: {
            college: true,
            user: { select: { email: true, createdAt: true } },
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
   * Look up an attached document version strictly within the application snapshot.
   * Preserves exact snapshot attachment validation (does NOT allow arbitrary versionId access).
   */
  async findApplicationDocumentVersion(applicationId, versionId) {
    const docSnap = await prisma.applicationDocumentSnapshot.findFirst({
      where: {
        applicationId,
        documentVersionId: versionId,
      },
      include: {
        documentVersion: true,
      },
    });

    return docSnap?.documentVersion || null;
  }

  /**
   * Filter options: All active departments, scholarships, and colleges.
   */
  async getFilterOptions() {
    const [departments, scholarships, colleges] = await Promise.all([
      prisma.department.findMany({
        where: { isActive: true },
        select: { id: true, code: true, name: true },
        orderBy: { name: 'asc' },
      }),
      prisma.scholarship.findMany({
        where: { isActive: true },
        select: { id: true, code: true, name: true, departmentId: true },
        orderBy: { name: 'asc' },
      }),
      prisma.college.findMany({
        where: { isActive: true },
        select: { id: true, code: true, name: true },
        orderBy: { name: 'asc' },
      }),
    ]);

    return { departments, scholarships, colleges };
  }

  /**
   * Scrutiny: Start Review (FORWARDED_TO_AUTHORITY -> UNDER_AUTHORITY_REVIEW).
   * Valid across all departments.
   */
  async startReview({ applicationId, reviewerUserId, clientIp = null }) {
    return prisma.$transaction(async (tx) => {
      const app = await tx.application.findFirst({
        where: { id: applicationId },
      });

      if (!app) {
        const error = new Error('Application not found.');
        error.statusCode = 404;
        throw error;
      }

      if (app.status !== 'FORWARDED_TO_AUTHORITY') {
        const error = new Error(
            `Cannot initiate department scrutiny from status "${app.status}". Application must be FORWARDED_TO_AUTHORITY.`
        );
        error.statusCode = 400;
        throw error;
      }

      const previousStatus = app.status;
      const updated = await tx.application.update({
        where: { id: applicationId },
        data: {
          status: 'UNDER_AUTHORITY_REVIEW',
          updatedAt: new Date(),
        },
      });

      await tx.applicationAuditLog.create({
        data: {
          applicationId,
          actorUserId: reviewerUserId,
          actorRole: 'AUTHORITY',
          action: 'REVIEW_UNDER_AUTHORITY',
          previousStatus,
          newStatus: 'UNDER_AUTHORITY_REVIEW',
          remarks: 'Department scrutiny officer initiated review of application credentials and documents.',
          ipAddress: clientIp,
          timestamp: new Date(),
        },
      });

      return updated;
    });
  }

  /**
   * Scrutiny: Submit Scrutiny Decision (APPROVE, SEND_BACK, REJECT).
   * Valid across all departments.
   */
  async submitReviewDecision({
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
        where: { id: applicationId },
        include: {
          student: true,
          snapshots: { orderBy: { cycleNumber: 'desc' }, take: 1 },
          correctionRequests: { where: { status: { in: ['OPEN', 'RE_FLAGGED'] } } },
        },
      });

      if (!app) {
        const error = new Error('Application not found.');
        error.statusCode = 404;
        throw error;
      }

      if (app.status !== 'UNDER_AUTHORITY_REVIEW') {
        const error = new Error(
          `Cannot submit scrutiny decision from status "${app.status}". Application must be in UNDER_AUTHORITY_REVIEW state.`
        );
        error.statusCode = 400;
        throw error;
      }

      const currentCycle = app.snapshots.length > 0 ? app.snapshots[0].cycleNumber : 1;
      const previousStatus = app.status;

      let newStatus;
      let auditAction;

      if (decision === 'APPROVE') {
        // Enforce 0 open corrections before approval
        if (app.correctionRequests && app.correctionRequests.length > 0) {
          const error = new Error(
            `Cannot approve application while ${app.correctionRequests.length} unresolved correction request(s) remain.`
          );
          error.statusCode = 400;
          throw error;
        }

        newStatus = 'APPROVED';
        auditAction = 'AUTHORITY_APPROVED';
      } else if (decision === 'SEND_BACK') {
        newStatus = 'AUTHORITY_SENT_BACK';
        auditAction = 'AUTHORITY_SENT_BACK';
      } else if (decision === 'REJECT') {
        newStatus = 'AUTHORITY_REJECTED';
        auditAction = 'AUTHORITY_REJECTED';
      } else {
        const error = new Error(`Unsupported scrutiny decision: ${decision}. Expected APPROVE, SEND_BACK, or REJECT.`);
        error.statusCode = 400;
        throw error;
      }

      // Create ApplicationReview
      const review = await tx.applicationReview.create({
        data: {
          applicationId,
          cycleNumber: currentCycle,
          reviewerUserId,
          reviewerRole: 'AUTHORITY',
          decision,
          checklistJson: checklistJson || {},
          overallRemarks: overallRemarks || '',
          reviewedAt: new Date(),
        },
      });

      // If SEND_BACK, create structured correction requests and notify student
      if (decision === 'SEND_BACK') {
        for (const corr of corrections) {
          await tx.applicationCorrectionRequest.create({
            data: {
              applicationId,
              reviewId: review.id,
              cycleNumber: currentCycle,
              reviewerRole: 'AUTHORITY',
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

        await tx.notification.create({
          data: {
            userId: app.student.userId,
            title: 'Action Required: Application Sent Back by Department',
            message: `Your scholarship application was reviewed by the Department and returned with ${corrections.length} correction request(s). Please resolve them and resubmit for college re-verification.`,
            category: 'ACTION_REQUIRED',
            actionUrl: `/applications/${applicationId}`,
          },
        });
      }

      // If APPROVE, notify student
      if (decision === 'APPROVE') {
        await tx.notification.create({
          data: {
            userId: app.student.userId,
            title: 'Scholarship Application Approved!',
            message: `Congratulations! Your scholarship application (${app.applicationNumber}) has been approved by the Department.`,
            category: 'STATUS_UPDATE',
            actionUrl: `/applications/${applicationId}`,
          },
        });
      }

      // If REJECT, notify student
      if (decision === 'REJECT') {
        await tx.notification.create({
          data: {
            userId: app.student.userId,
            title: 'Application Rejected by Department',
            message: `Your scholarship application (${app.applicationNumber}) was rejected by the Department. Reason: ${overallRemarks}`,
            category: 'STATUS_UPDATE',
            actionUrl: `/applications/${applicationId}`,
          },
        });
      }

      // Update Application status
      const updatedApplication = await tx.application.update({
        where: { id: applicationId },
        data: {
          status: newStatus,
          updatedAt: new Date(),
        },
      });

      // Create ApplicationAuditLog
      await tx.applicationAuditLog.create({
        data: {
          applicationId,
          actorUserId: reviewerUserId,
          actorRole: 'AUTHORITY',
          action: auditAction,
          previousStatus,
          newStatus,
          remarks: overallRemarks || `Department scrutiny completed with decision: ${decision}`,
          ipAddress: clientIp,
          timestamp: new Date(),
        },
      });

      return {
        review,
        application: updatedApplication,
      };
    });
  }
}

module.exports = new AuthorityRepository();
