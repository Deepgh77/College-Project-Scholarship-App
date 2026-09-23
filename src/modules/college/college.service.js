const fs = require('fs');
const path = require('path');
const collegeRepository = require('./college.repository');
const { STATUS_METADATA } = require('../application/application-tracking.service');

/**
 * College Service
 * Implements business logic for the College/Institute Scrutiny Portal.
 * Enforces institutional boundaries and state machine rules.
 */
class CollegeService {
  /**
   * Helper: Ensure caller is a verified COLLEGE user with an assigned collegeId.
   */
  _requireCollegeOfficer(user) {
    if (!user || user.role !== 'COLLEGE' || !user.collegeId) {
      const error = new Error('Access denied. Only authorized College verification officers can access this portal.');
      error.statusCode = 403;
      throw error;
    }
    return user.collegeId;
  }

  /**
   * Get Institute Dashboard metrics and workload intelligence.
   */
  async getDashboard(user) {
    const collegeId = this._requireCollegeOfficer(user);

    const college = await collegeRepository.findCollegeById(collegeId);
    if (!college) {
      const error = new Error('College institutional record not found.');
      error.statusCode = 404;
      throw error;
    }

    const { metrics, workload } = await collegeRepository.getDashboardMetrics(collegeId);

    return {
      success: true,
      college: {
        id: college.id,
        code: college.code,
        name: college.name,
        university: college.university,
        district: college.district,
        taluka: college.taluka,
      },
      metrics,
      workload,
    };
  }

  /**
   * Get filtered, sorted, paginated applications for college queue.
   */
  async getApplications(user, query = {}) {
    const collegeId = this._requireCollegeOfficer(user);

    const result = await collegeRepository.getApplications(collegeId, query);

    // Decorate each application with human-readable status metadata
    const decoratedApplications = result.applications.map((app) => {
      const meta = STATUS_METADATA[app.status] || {
        label: app.status,
        badge: 'gray',
        stage: 'Unknown',
        stageNumber: 0,
      };

      return {
        ...app,
        statusMeta: meta,
      };
    });

    return {
      success: true,
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
      applications: decoratedApplications,
    };
  }

  /**
   * Get detailed application payload for the review desk.
   */
  async getApplicationDetails(user, applicationId) {
    const collegeId = this._requireCollegeOfficer(user);

    const app = await collegeRepository.getApplicationDetails(collegeId, applicationId);
    if (!app) {
      const error = new Error('Application not found or access denied.');
      error.statusCode = 404;
      throw error;
    }

    const statusMeta = STATUS_METADATA[app.status] || {
      label: app.status,
      badge: 'gray',
      stage: 'Unknown',
      stageNumber: 0,
    };

    // 1. Resolve current active cycle snapshot
    const activeSnapshot = app.snapshots?.[0] || null;
    const currentCycleNumber = activeSnapshot?.cycleNumber || 1;

    // 2. Resolve document snapshots for current cycle with preview/download URLs
    const currentDocSnaps = (app.documentSnapshots || [])
      .filter((ds) => ds.cycleNumber === currentCycleNumber)
      .map((ds) => ({
        id: ds.id,
        cycleNumber: ds.cycleNumber,
        documentType: ds.documentType,
        documentVersionId: ds.documentVersionId,
        documentVersion: ds.documentVersion
          ? {
              id: ds.documentVersion.id,
              versionNumber: ds.documentVersion.versionNumber,
              originalFilename: ds.documentVersion.originalFilename,
              fileSizeBytes: ds.documentVersion.fileSizeBytes,
              mimeType: ds.documentVersion.mimeType,
              isCompressed: ds.documentVersion.isCompressed,
              previewUrl: `/api/college/applications/${app.id}/documents/${ds.documentVersionId}/preview`,
              downloadUrl: `/api/college/applications/${app.id}/documents/${ds.documentVersionId}/download`,
            }
          : null,
      }));

    // 3. Resolve multi-cycle history
    const multiCycleHistory = (app.snapshots || []).map((snap) => {
      const cycleReviews = (app.reviews || []).filter((r) => r.cycleNumber === snap.cycleNumber);
      const cycleCorrections = (app.correctionRequests || []).filter((c) => c.cycleNumber === snap.cycleNumber);
      const cycleDocs = (app.documentSnapshots || []).filter((ds) => ds.cycleNumber === snap.cycleNumber);

      return {
        cycleNumber: snap.cycleNumber,
        submittedAt: snap.submittedAt,
        snapshotData: snap.snapshotDataJson,
        reviews: cycleReviews,
        corrections: cycleCorrections,
        documentCount: cycleDocs.length,
      };
    });

    // 4. Derive allowed reviewer actions
    const allowedActions = [];
    if (['SUBMITTED', 'RESUBMITTED_TO_COLLEGE'].includes(app.status)) {
      allowedActions.push('START_REVIEW');
    } else if (app.status === 'UNDER_COLLEGE_REVIEW') {
      allowedActions.push('VERIFY_FORWARD');
      allowedActions.push('SEND_BACK');
      allowedActions.push('REJECT');
    }

    return {
      success: true,
      application: {
        id: app.id,
        applicationNumber: app.applicationNumber,
        academicYear: app.academicYear,
        status: app.status,
        statusMeta,
        currentCycle: currentCycleNumber,
        submittedAt: app.submittedAt,
        updatedAt: app.updatedAt,
        student: app.student,
        scholarship: app.scholarship,
      },
      currentSnapshot: activeSnapshot?.snapshotDataJson || null,
      documentSnapshots: currentDocSnaps,
      multiCycleHistory,
      correctionRequests: app.correctionRequests || [],
      reviews: app.reviews || [],
      auditLogs: (app.auditLogs || []).map((log) => ({
        id: log.id,
        action: log.action,
        previousStatus: log.previousStatus,
        newStatus: log.newStatus,
        actorRole: log.actorRole,
        actorEmail: log.actorUser?.email || null,
        remarks: log.remarks,
        timestamp: log.timestamp,
      })),
      allowedActions,
    };
  }

  /**
   * Securely stream an application document version for preview or download.
   */
  async resolveApplicationDocumentStream(user, applicationId, versionId) {
    const collegeId = this._requireCollegeOfficer(user);

    const docVersion = await collegeRepository.findApplicationDocumentVersion(collegeId, applicationId, versionId);
    if (!docVersion) {
      const error = new Error('Document not found or access denied.');
      error.statusCode = 404;
      throw error;
    }

    // Verify physical file existence
    try {
      await fs.promises.access(docVersion.storagePath, fs.constants.R_OK);
    } catch {
      const error = new Error('The physical document file could not be located on the server.');
      error.statusCode = 404;
      throw error;
    }

    return {
      filePath: path.resolve(docVersion.storagePath),
      originalFilename: docVersion.originalFilename,
      mimeType: docVersion.mimeType,
      fileSizeBytes: docVersion.fileSizeBytes,
      versionNumber: docVersion.versionNumber,
    };
  }

  /**
   * Scrutiny: Start Review.
   */
  async startReview(user, applicationId, clientIp = null) {
    const collegeId = this._requireCollegeOfficer(user);

    const updated = await collegeRepository.startReview({
      collegeId,
      applicationId,
      reviewerUserId: user.id,
      clientIp,
    });

    return {
      success: true,
      message: 'Application scrutiny initiated successfully.',
      status: updated.status,
    };
  }

  /**
   * Scrutiny: Submit Scrutiny Decision (FORWARD, SEND_BACK, REJECT).
   */
  async submitReviewDecision(user, applicationId, payload = {}, clientIp = null) {
    const collegeId = this._requireCollegeOfficer(user);

    const { decision, checklistJson, overallRemarks, corrections } = payload;
    if (!decision) {
      const error = new Error('Scrutiny decision is required (VERIFY_FORWARD, SEND_BACK, REJECT).');
      error.statusCode = 400;
      throw error;
    }

    // Input validation for structured corrections
    if (decision === 'SEND_BACK') {
      if (!Array.isArray(corrections) || corrections.length === 0) {
        const error = new Error('At least one structured correction request is required to return an application.');
        error.statusCode = 400;
        throw error;
      }

      for (let i = 0; i < corrections.length; i++) {
        const c = corrections[i];
        if (!c.reasonText || c.reasonText.trim().length < 10) {
          const error = new Error(
            `Correction #${i + 1}: Reason explanation must be specific and at least 10 characters long.`
          );
          error.statusCode = 400;
          throw error;
        }
        if (!c.actionRequiredText || c.actionRequiredText.trim().length < 10) {
          const error = new Error(
            `Correction #${i + 1}: Action required must provide clear student instructions of at least 10 characters.`
          );
          error.statusCode = 400;
          throw error;
        }
        if (c.affectedSection === 'DOCUMENT' && !c.affectedDocumentType) {
          const error = new Error(`Correction #${i + 1}: Document type is required when affected section is DOCUMENT.`);
          error.statusCode = 400;
          throw error;
        }
      }
    }

    if (decision === 'REJECT') {
      if (!overallRemarks || overallRemarks.trim().length < 10) {
        const error = new Error('A detailed reason of at least 10 characters is required to reject an application.');
        error.statusCode = 400;
        throw error;
      }
    }

    const result = await collegeRepository.submitReviewDecision({
      collegeId,
      applicationId,
      reviewerUserId: user.id,
      decision,
      checklistJson,
      overallRemarks,
      corrections,
      clientIp,
    });

    return {
      success: true,
      message: `Scrutiny decision "${decision}" recorded successfully.`,
      status: result.application.status,
      review: result.review,
    };
  }

  /**
   * Scrutiny: Review Individual Correction Item.
   */
  async reviewCorrection(user, applicationId, correctionId, payload = {}, clientIp = null) {
    const collegeId = this._requireCollegeOfficer(user);

    const { decision, remarks } = payload;
    if (!decision || !['ACCEPT', 'RE_FLAG'].includes(decision)) {
      const error = new Error("Decision must be either 'ACCEPT' or 'RE_FLAG'.");
      error.statusCode = 400;
      throw error;
    }

    const updated = await collegeRepository.reviewCorrectionItem({
      collegeId,
      applicationId,
      correctionId,
      reviewerUserId: user.id,
      decision,
      remarks,
      clientIp,
    });

    return {
      success: true,
      message: `Correction item decision "${decision}" recorded.`,
      correction: updated,
    };
  }
}

module.exports = new CollegeService();
