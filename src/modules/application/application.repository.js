const { prisma } = require('../../config/prisma');

class ApplicationRepository {
  /**
   * Resolves StudentProfile record for a given User ID.
   */
  async findStudentProfileByUserId(userId) {
    return prisma.studentProfile.findUnique({
      where: { userId },
      include: {
        college: true,
      },
    });
  }

  /**
   * Finds scholarship details including rules, required documents, and department.
   */
  async findScholarshipById(id) {
    return prisma.scholarship.findUnique({
      where: { id },
      include: {
        department: true,
        rules: {
          orderBy: { ruleGroup: 'asc' },
        },
        requiredDocuments: {
          orderBy: { isMandatory: 'desc' },
        },
      },
    });
  }

  /**
   * Finds existing application for a student, scholarship, and academic year.
   */
  async findApplicationByStudentAndScholarship(studentId, scholarshipId, academicYear) {
    return prisma.application.findUnique({
      where: {
        studentId_scholarshipId_academicYear: {
          studentId,
          scholarshipId,
          academicYear,
        },
      },
      include: {
        scholarship: {
          include: {
            department: true,
            requiredDocuments: true,
          },
        },
      },
    });
  }

  /**
   * Finds an application by ID and validates student ownership.
   */
  async findApplicationByIdAndStudentId(id, studentId) {
    return prisma.application.findFirst({
      where: {
        id,
        studentId,
      },
      include: {
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
      },
    });
  }

  /**
   * Lists all applications for a student, ordered by creation date descending.
   */
  async findStudentApplications(studentId) {
    return prisma.application.findMany({
      where: { studentId },
      include: {
        scholarship: {
          include: {
            department: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },
          },
        },
        documentSnapshots: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Retrieves all document records from the student's vault with versions.
   */
  async findStudentVaultDocuments(studentId) {
    return prisma.document.findMany({
      where: { studentId },
      include: {
        versions: {
          orderBy: { versionNumber: 'desc' },
        },
      },
    });
  }

  /**
   * Creates a new Application in DRAFT status.
   */
  async createDraftApplication({
    studentId,
    scholarshipId,
    academicYear,
    draftDataJson,
    healthScore = 0,
  }) {
    return prisma.application.create({
      data: {
        studentId,
        scholarshipId,
        academicYear,
        status: 'DRAFT',
        draftDataJson,
        healthScore,
      },
      include: {
        scholarship: {
          include: {
            department: true,
            requiredDocuments: true,
          },
        },
      },
    });
  }

  /**
   * Updates draft questionnaire and document bindings.
   */
  async updateDraftApplication(id, { draftDataJson, healthScore }) {
    return prisma.application.update({
      where: { id },
      data: {
        draftDataJson,
        healthScore,
        updatedAt: new Date(),
      },
      include: {
        scholarship: {
          include: {
            department: true,
            requiredDocuments: true,
          },
        },
      },
    });
  }

  /**
   * Verifies that all provided DocumentVersion IDs belong to the authenticated student.
   */
  async findVerifiedDocumentVersions(versionIds, studentId) {
    if (!versionIds || versionIds.length === 0) return [];

    return prisma.documentVersion.findMany({
      where: {
        id: { in: versionIds },
        document: {
          studentId,
        },
      },
      include: {
        document: true,
      },
    });
  }

  /**
   * Executes genuine concurrency-safe submission inside an atomic transaction.
   */
  async executeAtomicSubmission({
    applicationId,
    studentId,
    userId,
    applicationNumber,
    now,
    snapshotDataJson,
    attachedDocumentVersionMap,
    clientIp = null,
  }) {
    return prisma.$transaction(async (tx) => {
      // 1. ATOMIC CONDITIONAL TRANSITION
      // Exactly one concurrent transaction can match `status: 'DRAFT'` and acquire the row lock.
      const updateResult = await tx.application.updateMany({
        where: {
          id: applicationId,
          studentId,
          status: 'DRAFT',
        },
        data: {
          status: 'SUBMITTED',
          applicationNumber,
          submittedAt: now,
          draftDataJson: null, // Clear working draft
          healthScore: 100,
        },
      });

      if (updateResult.count === 0) {
        const error = new Error('Application is not in draft status or has already been submitted.');
        error.statusCode = 409;
        throw error;
      }

      // 2. Fetch updated Application row
      const updatedApplication = await tx.application.findUnique({
        where: { id: applicationId },
        include: {
          scholarship: {
            include: { department: true },
          },
        },
      });

      // 3. Create ApplicationSnapshot (cycleNumber: 1)
      await tx.applicationSnapshot.create({
        data: {
          applicationId,
          cycleNumber: 1,
          snapshotDataJson,
          submittedAt: now,
        },
      });

      // 4. Create ApplicationDocumentSnapshot records
      for (const [docType, versionId] of Object.entries(attachedDocumentVersionMap)) {
        await tx.applicationDocumentSnapshot.create({
          data: {
            applicationId,
            cycleNumber: 1,
            documentVersionId: versionId,
            documentType: docType,
          },
        });
      }

      // 5. Create ApplicationAuditLog
      await tx.applicationAuditLog.create({
        data: {
          applicationId,
          actorUserId: userId,
          actorRole: 'STUDENT',
          action: 'APPLICATION_SUBMITTED',
          previousStatus: 'DRAFT',
          newStatus: 'SUBMITTED',
          remarks: `Application formally submitted by applicant with ARN: ${applicationNumber}.`,
          ipAddress: clientIp,
          timestamp: now,
        },
      });

      // 6. Create in-app Notification
      await tx.notification.create({
        data: {
          userId,
          title: 'Scholarship Application Submitted',
          message: `Your application for "${updatedApplication.scholarship.name}" has been submitted successfully with ARN: ${applicationNumber}.`,
          category: 'STATUS_UPDATE',
          actionUrl: `/applications/${applicationId}`,
        },
      });

      return updatedApplication;
    });
  }

  /**
   * Retrieves complete application tracking data including reviews, corrections,
   * audit trail, snapshots, and document snapshots.
   */
  async findApplicationTrackingDetails(id, studentId) {
    return prisma.application.findFirst({
      where: { id, studentId },
      include: {
        scholarship: {
          include: {
            department: true,
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
          orderBy: { cycleNumber: 'desc' },
          include: {
            correctionRequests: {
              include: {
                resolvedDocumentVersion: true,
              },
            },
          },
        },
        correctionRequests: {
          orderBy: { createdAt: 'desc' },
          include: {
            resolvedDocumentVersion: true,
          },
        },
        auditLogs: {
          orderBy: { timestamp: 'asc' },
        },
        paymentRecord: {
          include: {
            batch: true,
          },
        },
      },
    });
  }

  /**
   * Finds an ApplicationAuditLog record trail for an application.
   */
  async findApplicationAuditLogs(applicationId, studentId) {
    const app = await prisma.application.findFirst({
      where: { id: applicationId, studentId },
      select: { id: true },
    });
    if (!app) return null;

    return prisma.applicationAuditLog.findMany({
      where: { applicationId },
      orderBy: { timestamp: 'asc' },
    });
  }

  /**
   * Finds a single correction request and validates student ownership.
   */
  async findCorrectionRequestById(correctionId, studentId) {
    return prisma.applicationCorrectionRequest.findFirst({
      where: {
        id: correctionId,
        application: {
          studentId,
        },
      },
      include: {
        application: true,
        review: true,
        resolvedDocumentVersion: true,
      },
    });
  }

  /**
   * Resolves a correction request (document or field) by student.
   */
  async resolveCorrectionRequest({
    correctionId,
    studentId,
    studentResponseText,
    resolvedDocumentVersionId = null,
    fieldCorrection = null,
  }) {
    return prisma.$transaction(async (tx) => {
      const correction = await tx.applicationCorrectionRequest.findFirst({
        where: {
          id: correctionId,
          application: {
            studentId,
          },
        },
        include: {
          application: true,
        },
      });

      if (!correction) {
        const error = new Error('Correction request not found or access denied.');
        error.statusCode = 404;
        throw error;
      }

      if (correction.status === 'ACCEPTED') {
        const error = new Error('This correction has already been accepted and cannot be modified.');
        error.statusCode = 400;
        throw error;
      }

      const app = correction.application;
      if (app.status !== 'COLLEGE_SENT_BACK' && app.status !== 'AUTHORITY_SENT_BACK') {
        const error = new Error('Corrections can only be resolved when application is sent back.');
        error.statusCode = 400;
        throw error;
      }

      const updatedCorrection = await tx.applicationCorrectionRequest.update({
        where: { id: correctionId },
        data: {
          status: 'RESOLVED_BY_STUDENT',
          studentResponseText: studentResponseText || null,
          resolvedDocumentVersionId: resolvedDocumentVersionId || null,
          resolvedAt: new Date(),
        },
        include: {
          resolvedDocumentVersion: true,
        },
      });

      // If a field correction was supplied, stage it in Application.draftDataJson.corrections
      if (fieldCorrection && fieldCorrection.field) {
        const currentDraft = app.draftDataJson || {};
        const corrections = currentDraft.corrections || {};
        corrections[fieldCorrection.field] = fieldCorrection.value;

        await tx.application.update({
          where: { id: app.id },
          data: {
            draftDataJson: {
              ...currentDraft,
              corrections,
            },
          },
        });
      }

      return updatedCorrection;
    });
  }

  /**
   * Executes atomic resubmission transaction:
   * 1. Validates all open/re-flagged corrections are resolved.
   * 2. Preserves cycle 1 snapshots untouched.
   * 3. Creates cycle 2 ApplicationSnapshot with updated field corrections.
   * 4. Creates cycle 2 ApplicationDocumentSnapshot linking new document versions.
   * 5. Transitions status to RESUBMITTED_TO_COLLEGE.
   * 6. Creates ApplicationAuditLog & Notification.
   */
  async executeAtomicResubmission({
    applicationId,
    studentId,
    userId,
    now = new Date(),
    clientIp = null,
  }) {
    return prisma.$transaction(async (tx) => {
      // 1. Lock and verify application row
      const app = await tx.application.findFirst({
        where: {
          id: applicationId,
          studentId,
          status: { in: ['COLLEGE_SENT_BACK', 'AUTHORITY_SENT_BACK'] },
        },
        include: {
          scholarship: {
            include: { department: true },
          },
          snapshots: {
            orderBy: { cycleNumber: 'desc' },
          },
          correctionRequests: {
            where: {
              status: { in: ['OPEN', 'RE_FLAGGED'] },
            },
          },
        },
      });

      if (!app) {
        const error = new Error(
          'Application not found or not in a sent-back status eligible for resubmission.'
        );
        error.statusCode = 400;
        throw error;
      }

      // 2. Assert zero unresolved items remain
      if (app.correctionRequests.length > 0) {
        const error = new Error(
          `Cannot resubmit application. All flagged corrections must be resolved first. (${app.correctionRequests.length} open items remain)`
        );
        error.statusCode = 400;
        error.unresolvedCount = app.correctionRequests.length;
        throw error;
      }

      // 3. Fetch all resolved corrections for this application
      const resolvedCorrections = await tx.applicationCorrectionRequest.findMany({
        where: {
          applicationId,
          status: 'RESOLVED_BY_STUDENT',
        },
        include: {
          resolvedDocumentVersion: true,
        },
      });

      // 4. Calculate next cycleNumber
      const latestCycleNumber = app.snapshots.length > 0 ? app.snapshots[0].cycleNumber : 1;
      const newCycleNumber = latestCycleNumber + 1;

      // 5. Build cycle 2 snapshot data by merging cycle 1 snapshot data with staged field corrections
      const baseSnapshot = app.snapshots.length > 0 ? app.snapshots[0].snapshotDataJson : {};
      const draftData = app.draftDataJson || {};
      const stagedFieldCorrections = draftData.corrections || {};

      const updatedSnapshotData = JSON.parse(JSON.stringify(baseSnapshot));
      if (updatedSnapshotData.student) {
        for (const [key, val] of Object.entries(stagedFieldCorrections)) {
          for (const sec of ['personal', 'academic', 'financial', 'bank']) {
            if (
              updatedSnapshotData.student[sec] &&
              updatedSnapshotData.student[sec][key] !== undefined
            ) {
              updatedSnapshotData.student[sec][key] = val;
            }
          }
        }
      }

      // Create new ApplicationSnapshot for new cycle (cycle 1 remains untouched)
      await tx.applicationSnapshot.create({
        data: {
          applicationId,
          cycleNumber: newCycleNumber,
          snapshotDataJson: updatedSnapshotData,
          submittedAt: now,
        },
      });

      // 6. Build document snapshot mapping for new cycle
      const correctedDocMap = {};
      for (const c of resolvedCorrections) {
        if (c.affectedDocumentType && c.resolvedDocumentVersionId) {
          correctedDocMap[c.affectedDocumentType] = c.resolvedDocumentVersionId;
        }
      }

      // Fetch cycle 1 document snapshots as base
      const cycle1DocSnapshots = await tx.applicationDocumentSnapshot.findMany({
        where: {
          applicationId,
          cycleNumber: 1,
        },
      });

      // Insert cycle 2 document snapshots (cycle 1 remains untouched)
      for (const docSnap of cycle1DocSnapshots) {
        const versionIdToUse =
          correctedDocMap[docSnap.documentType] || docSnap.documentVersionId;
        await tx.applicationDocumentSnapshot.create({
          data: {
            applicationId,
            cycleNumber: newCycleNumber,
            documentVersionId: versionIdToUse,
            documentType: docSnap.documentType,
          },
        });
      }

      // 7. Transition Application to RESUBMITTED_TO_COLLEGE
      const previousStatus = app.status;
      const updatedApplication = await tx.application.update({
        where: { id: applicationId },
        data: {
          status: 'RESUBMITTED_TO_COLLEGE',
          draftDataJson: null,
          updatedAt: now,
        },
        include: {
          scholarship: {
            include: { department: true },
          },
        },
      });

      // 8. Create ApplicationAuditLog
      await tx.applicationAuditLog.create({
        data: {
          applicationId,
          actorUserId: userId,
          actorRole: 'STUDENT',
          action: 'APPLICATION_RESUBMITTED',
          previousStatus,
          newStatus: 'RESUBMITTED_TO_COLLEGE',
          remarks:
            'All flagged corrections resolved and resubmitted by applicant for college re-verification.',
          ipAddress: clientIp,
          timestamp: now,
        },
      });

      // 9. Create in-app Notification
      await tx.notification.create({
        data: {
          userId,
          title: 'Application Resubmitted to College',
          message: `Your application (${app.applicationNumber}) has been resubmitted to your college for re-scrutiny.`,
          category: 'STATUS_UPDATE',
          actionUrl: `/applications/${applicationId}`,
        },
      });

      return updatedApplication;
    });
  }

  /**
   * Formally withdraws/cancels an active pre-approval application.
   */
  async executeCancelApplication({
    applicationId,
    studentId,
    userId,
    reason,
    clientIp = null,
  }) {
    const { PERMITTED_CANCEL_STATUSES } = require('./application-tracking.service');
    return prisma.$transaction(async (tx) => {
      const app = await tx.application.findFirst({
        where: { id: applicationId, studentId },
      });

      if (!app) {
        const error = new Error('Application not found or access denied.');
        error.statusCode = 404;
        throw error;
      }

      if (!PERMITTED_CANCEL_STATUSES.includes(app.status)) {
        const error = new Error(
          `Application cannot be cancelled from current status "${app.status}". Cancellation is only allowed before approval or final decision.`
        );
        error.statusCode = 400;
        throw error;
      }

      const previousStatus = app.status;
      const updated = await tx.application.update({
        where: { id: applicationId },
        data: {
          status: 'CANCELLED',
          updatedAt: new Date(),
        },
      });

      await tx.applicationAuditLog.create({
        data: {
          applicationId,
          actorUserId: userId,
          actorRole: 'STUDENT',
          action: 'APPLICATION_CANCELLED',
          previousStatus,
          newStatus: 'CANCELLED',
          remarks: reason || 'Application cancelled by applicant.',
          ipAddress: clientIp,
          timestamp: new Date(),
        },
      });

      return updated;
    });
  }

  /**
   * Formally surrenders scholarship benefit under statutory Right to Give Up.
   */
  async executeRightToGiveUp({
    applicationId,
    studentId,
    userId,
    reason,
    clientIp = null,
  }) {
    const { PERMITTED_GIVE_UP_STATUSES } = require('./application-tracking.service');
    return prisma.$transaction(async (tx) => {
      const app = await tx.application.findFirst({
        where: { id: applicationId, studentId },
      });

      if (!app) {
        const error = new Error('Application not found or access denied.');
        error.statusCode = 404;
        throw error;
      }

      if (!PERMITTED_GIVE_UP_STATUSES.includes(app.status)) {
        const error = new Error(
          `Right to Give Up cannot be exercised from status "${app.status}". Only permitted for active pre-disbursement or sanctioned applications.`
        );
        error.statusCode = 400;
        throw error;
      }

      const previousStatus = app.status;
      const updated = await tx.application.update({
        where: { id: applicationId },
        data: {
          status: 'RIGHT_TO_GIVE_UP',
          updatedAt: new Date(),
        },
      });

      await tx.applicationAuditLog.create({
        data: {
          applicationId,
          actorUserId: userId,
          actorRole: 'STUDENT',
          action: 'RIGHT_TO_GIVE_UP',
          previousStatus,
          newStatus: 'RIGHT_TO_GIVE_UP',
          remarks:
            reason || 'Applicant exercised statutory right to surrender scholarship benefit.',
          ipAddress: clientIp,
          timestamp: new Date(),
        },
      });

      return updated;
    });
  }

  /**
   * Reviewer Scrutiny Workflow: Start review.
   */
  async startApplicationReview({
    applicationId,
    reviewerUserId,
    reviewerRole,
    targetStatus,
    clientIp = null,
  }) {
    return prisma.$transaction(async (tx) => {
      const app = await tx.application.findUnique({
        where: { id: applicationId },
      });

      if (!app) {
        const error = new Error('Application not found.');
        error.statusCode = 404;
        throw error;
      }

      const previousStatus = app.status;
      const updated = await tx.application.update({
        where: { id: applicationId },
        data: {
          status: targetStatus,
          updatedAt: new Date(),
        },
      });

      await tx.applicationAuditLog.create({
        data: {
          applicationId,
          actorUserId: reviewerUserId,
          actorRole: reviewerRole,
          action:
            reviewerRole === 'COLLEGE'
              ? 'REVIEW_UNDER_COLLEGE'
              : 'REVIEW_UNDER_AUTHORITY',
          previousStatus,
          newStatus: targetStatus,
          remarks: `${reviewerRole} verification officer opened application for scrutiny.`,
          ipAddress: clientIp,
          timestamp: new Date(),
        },
      });

      return updated;
    });
  }

  /**
   * Reviewer Scrutiny Workflow: Submit review decision.
   */
  async submitReviewDecision({
    applicationId,
    reviewerUserId,
    reviewerRole,
    decision,
    checklistJson = {},
    overallRemarks = '',
    corrections = [],
    clientIp = null,
  }) {
    return prisma.$transaction(async (tx) => {
      const app = await tx.application.findUnique({
        where: { id: applicationId },
        include: {
          student: true,
          snapshots: { orderBy: { cycleNumber: 'desc' }, take: 1 },
        },
      });

      if (!app) {
        const error = new Error('Application not found.');
        error.statusCode = 404;
        throw error;
      }

      const currentCycle = app.snapshots.length > 0 ? app.snapshots[0].cycleNumber : 1;

      // Determine new status based on decision and reviewer role
      let newStatus;
      let auditAction;

      if (decision === 'SEND_BACK') {
        newStatus =
          reviewerRole === 'COLLEGE' ? 'COLLEGE_SENT_BACK' : 'AUTHORITY_SENT_BACK';
        auditAction =
          reviewerRole === 'COLLEGE' ? 'COLLEGE_SENT_BACK' : 'AUTHORITY_SENT_BACK';
      } else if (decision === 'REJECT') {
        newStatus =
          reviewerRole === 'COLLEGE' ? 'COLLEGE_REJECTED' : 'AUTHORITY_REJECTED';
        auditAction =
          reviewerRole === 'COLLEGE' ? 'COLLEGE_REJECTED' : 'AUTHORITY_REJECTED';
      } else if (decision === 'VERIFY_FORWARD') {
        newStatus = 'FORWARDED_TO_AUTHORITY';
        auditAction = 'COLLEGE_FORWARDED';
      } else if (decision === 'APPROVE') {
        newStatus = 'APPROVED';
        auditAction = 'AUTHORITY_APPROVED';
      } else {
        const error = new Error(`Unsupported review decision: ${decision}`);
        error.statusCode = 400;
        throw error;
      }

      // Create ApplicationReview
      const review = await tx.applicationReview.create({
        data: {
          applicationId,
          cycleNumber: currentCycle,
          reviewerUserId,
          reviewerRole,
          decision,
          checklistJson,
          overallRemarks,
          reviewedAt: new Date(),
        },
      });

      // If SEND_BACK, create ApplicationCorrectionRequest records
      if (decision === 'SEND_BACK' && corrections.length > 0) {
        for (const corr of corrections) {
          await tx.applicationCorrectionRequest.create({
            data: {
              applicationId,
              reviewId: review.id,
              cycleNumber: currentCycle,
              reviewerRole,
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

        // Send in-app notification to student
        await tx.notification.create({
          data: {
            userId: app.student.userId,
            title: `Action Required: Application Sent Back by ${reviewerRole}`,
            message: `Your scholarship application was reviewed and returned with ${corrections.length} correction request(s). Please review and rectify them.`,
            category: 'ACTION_REQUIRED',
            actionUrl: `/applications/${applicationId}`,
          },
        });
      }

      // Update Application status
      const previousStatus = app.status;
      const updatedApp = await tx.application.update({
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
          actorRole: reviewerRole,
          action: auditAction,
          previousStatus,
          newStatus,
          remarks: overallRemarks || `Review completed with decision: ${decision}`,
          ipAddress: clientIp,
          timestamp: new Date(),
        },
      });

      return {
        review,
        application: updatedApp,
      };
    });
  }

  /**
   * Reviewer Scrutiny Workflow: Accept or re-flag a correction item.
   */
  async reviewCorrectionItem({
    correctionId,
    reviewerUserId,
    decision, // 'ACCEPT' | 'RE_FLAG'
    remarks = '',
    clientIp = null,
  }) {
    return prisma.$transaction(async (tx) => {
      const correction = await tx.applicationCorrectionRequest.findUnique({
        where: { id: correctionId },
        include: { application: true },
      });

      if (!correction) {
        const error = new Error('Correction request not found.');
        error.statusCode = 404;
        throw error;
      }

      const targetStatus = decision === 'ACCEPT' ? 'ACCEPTED' : 'RE_FLAGGED';
      const updated = await tx.applicationCorrectionRequest.update({
        where: { id: correctionId },
        data: {
          status: targetStatus,
          reviewedAt: new Date(),
        },
      });

      // If re-flagged, application status moves back to COLLEGE_SENT_BACK
      if (decision === 'RE_FLAG') {
        const app = correction.application;
        if (app.status === 'UNDER_COLLEGE_REVIEW') {
          await tx.application.update({
            where: { id: app.id },
            data: { status: 'COLLEGE_SENT_BACK', updatedAt: new Date() },
          });

          await tx.applicationAuditLog.create({
            data: {
              applicationId: app.id,
              actorUserId: reviewerUserId,
              actorRole: 'COLLEGE',
              action: 'COLLEGE_SENT_BACK',
              previousStatus: 'UNDER_COLLEGE_REVIEW',
              newStatus: 'COLLEGE_SENT_BACK',
              remarks: remarks || 'Item was re-flagged during re-scrutiny.',
              ipAddress: clientIp,
              timestamp: new Date(),
            },
          });
        }
      }

      return updated;
    });
  }
}

module.exports = new ApplicationRepository();
