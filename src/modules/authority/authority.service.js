const fs = require('fs');
const path = require('path');
const authorityRepository = require('./authority.repository');
const { STATUS_METADATA } = require('../application/application-tracking.service');

/**
 * Authority Service
 * Implements business logic for the Centralized Authority Portal.
 * Any user with role === 'AUTHORITY' can view and process applications across all departments.
 */
class AuthorityService {
  /**
   * Helper: Ensure caller is a verified user with role === 'AUTHORITY'.
   */
  _requireAuthorityOfficer(user) {
    if (!user || user.role !== 'AUTHORITY') {
      const error = new Error('Access denied. Only authorized Authority verification officers can access this portal.');
      error.statusCode = 403;
      throw error;
    }
    return user;
  }

  /**
   * Get Centralized Dashboard metrics and workload intelligence across all departments.
   */
  async getDashboard(user) {
    this._requireAuthorityOfficer(user);

    let homeDepartment = null;
    if (user.departmentId) {
      homeDepartment = await authorityRepository.findDepartmentById(user.departmentId);
    }

    const { metrics, workload } = await authorityRepository.getDashboardMetrics();

    return {
      success: true,
      homeDepartment: homeDepartment
        ? {
            id: homeDepartment.id,
            code: homeDepartment.code,
            name: homeDepartment.name,
          }
        : null,
      metrics,
      workload,
    };
  }

  /**
   * Get filter options (all active departments, scholarships, and colleges).
   */
  async getFilterOptions(user) {
    this._requireAuthorityOfficer(user);
    const options = await authorityRepository.getFilterOptions();

    return {
      success: true,
      ...options,
    };
  }

  /**
   * Get filtered, sorted, paginated applications across all departments.
   */
  async getApplications(user, query = {}) {
    this._requireAuthorityOfficer(user);

    const result = await authorityRepository.getApplications(query);

    // Decorate each application with human-readable status metadata
    const decoratedApplications = result.applications.map((app) => {
      const meta = STATUS_METADATA[app.status] || {
        label: app.status,
        badgeVariant: 'slate',
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
   * Get detailed application payload for the Authority review desk across any department.
   */
  async getApplicationDetails(user, applicationId) {
    this._requireAuthorityOfficer(user);

    const app = await authorityRepository.getApplicationDetails(applicationId);
    if (!app) {
      const error = new Error('Application not found.');
      error.statusCode = 404;
      throw error;
    }

    const statusMeta = STATUS_METADATA[app.status] || {
      label: app.status,
      badgeVariant: 'slate',
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
              previewUrl: `/api/authority/applications/${app.id}/documents/${ds.documentVersionId}/preview`,
              downloadUrl: `/api/authority/applications/${app.id}/documents/${ds.documentVersionId}/download`,
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

    // 4. Resolve latest College verification review record
    const collegeReview = (app.reviews || []).find((r) => r.reviewerRole === 'COLLEGE') || null;

    // 5. Derive allowed reviewer actions for Authority
    const allowedActions = [];
    if (app.status === 'FORWARDED_TO_AUTHORITY') {
      allowedActions.push('START_REVIEW');
    } else if (app.status === 'UNDER_AUTHORITY_REVIEW') {
      allowedActions.push('APPROVE');
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
        department: app.scholarship?.department || null,
      },
      currentSnapshot: activeSnapshot?.snapshotDataJson || null,
      documentSnapshots: currentDocSnaps,
      collegeReview,
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
   * Preserves exact application snapshot attachment validation.
   */
  async resolveApplicationDocumentStream(user, applicationId, versionId) {
    this._requireAuthorityOfficer(user);

    const docVersion = await authorityRepository.findApplicationDocumentVersion(
      applicationId,
      versionId
    );

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
   * Scrutiny: Start Review (FORWARDED_TO_AUTHORITY -> UNDER_AUTHORITY_REVIEW).
   * Valid across any department.
   */
  async startReview(user, applicationId, clientIp = null) {
    this._requireAuthorityOfficer(user);

    const updated = await authorityRepository.startReview({
      applicationId,
      reviewerUserId: user.id,
      clientIp,
    });

    return {
      success: true,
      message: 'Department scrutiny initiated successfully.',
      status: updated.status,
    };
  }

  /**
   * Scrutiny: Submit Scrutiny Decision (APPROVE, SEND_BACK, REJECT).
   * Valid across any department.
   */
  async submitReviewDecision(user, applicationId, payload = {}, clientIp = null) {
    this._requireAuthorityOfficer(user);

    const { decision, checklistJson, overallRemarks, corrections } = payload;
    if (!decision || !['APPROVE', 'SEND_BACK', 'REJECT'].includes(decision)) {
      const error = new Error(
        'Valid scrutiny decision is required: APPROVE, SEND_BACK, or REJECT.'
      );
      error.statusCode = 400;
      throw error;
    }

    // Validation for SEND_BACK structured corrections
    if (decision === 'SEND_BACK') {
      if (!Array.isArray(corrections) || corrections.length === 0) {
        const error = new Error('At least one structured correction request is required to send back an application.');
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

    // Validation for REJECT
    if (decision === 'REJECT') {
      if (!overallRemarks || overallRemarks.trim().length < 10) {
        const error = new Error('A detailed reason of at least 10 characters is required to reject an application.');
        error.statusCode = 400;
        throw error;
      }
    }

    const result = await authorityRepository.submitReviewDecision({
      applicationId,
      reviewerUserId: user.id,
      decision,
      checklistJson,
      overallRemarks,
      corrections,
      clientIp,
    });

    const messages = {
      APPROVE: 'Application approved successfully.',
      SEND_BACK: 'Application sent back for correction successfully.',
      REJECT: 'Application rejected.',
    };

    return {
      success: true,
      message: messages[decision] || 'Review decision recorded successfully.',
      status: result.application.status,
      review: result.review,
    };
  }
}

module.exports = new AuthorityService();
