const fs = require('fs');
const applicationRepository = require('./application.repository');
const { evaluateScholarshipEligibility } = require('../scholarship/eligibility.engine');
const { getQuestionnaireForScholarship } = require('./scholarship-questionnaire.registry');
const {
  validateQuestionnaire,
  generateApplicationNumber,
  buildSnapshotDataJson,
  calculateDraftHealthScore,
} = require('./application-validation.service');
const {
  generateApplicationPdfBuffer,
  getApplicationPdfPath,
  hasSubmittedPdf,
  saveSubmittedPdf,
} = require('./application-pdf.service');
const {
  getStatusMetadata,
  formatTimelineEvent,
  PERMITTED_CANCEL_STATUSES,
  PERMITTED_GIVE_UP_STATUSES,
} = require('./application-tracking.service');

function formatBytes(bytes) {
  if (!bytes || isNaN(bytes)) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

class ApplicationService {
  /**
   * Resolves StudentProfile from authenticated User ID.
   */
  async _resolveStudentProfile(userId) {
    const profile = await applicationRepository.findStudentProfileByUserId(userId);
    if (!profile) {
      const error = new Error(
        'Student profile not found. Please complete your profile before starting a scholarship application.'
      );
      error.statusCode = 404;
      throw error;
    }
    return profile;
  }

  /**
   * Evaluates application window open/closed status.
   */
  _computeWindowStatus(startDate, endDate, now = new Date()) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (now < start) {
      return {
        isWindowOpen: false,
        windowStatus: 'UPCOMING',
        message: `Applications open on ${start.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}.`,
      };
    }
    if (now > end) {
      return {
        isWindowOpen: false,
        windowStatus: 'CLOSED',
        message: `Applications closed on ${end.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}.`,
      };
    }
    return {
      isWindowOpen: true,
      windowStatus: 'OPEN',
      message: `Applications open until ${end.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}.`,
    };
  }

  /**
   * Formats application record for API response.
   */
  _formatApplicationResponse(app, studentProfile, vaultDocuments = []) {
    const scholarship = app.scholarship;
    const now = new Date();
    const windowInfo = this._computeWindowStatus(
      scholarship.applicationStartDate,
      scholarship.applicationEndDate,
      now
    );

    const draftData = app.draftDataJson || {};
    const selectedDocuments = draftData.selectedDocuments || {};
    const questionnaire = draftData.questionnaire || {};
    const questionnaireSchema = getQuestionnaireForScholarship(scholarship.code);

    // Build Vault Lookup map: DocumentType -> { doc, version }
    const vaultMap = {};
    for (const doc of vaultDocuments) {
      if (doc.versions && doc.versions.length > 0) {
        vaultMap[doc.documentType] = {
          doc,
          version: doc.versions[0],
        };
      }
    }

    // Build Submitted Document Snapshot map if application already submitted
    const docSnapMap = {};
    for (const ds of app.documentSnapshots || []) {
      docSnapMap[ds.documentType] = ds;
    }

    // Map scholarship required documents with attachment status
    const documentsChecklist = (scholarship.requiredDocuments || []).map((reqDoc) => {
      const isMandatory = reqDoc.isMandatory;

      // Handle Submitted Application: Read from frozen snapshots
      if (app.status === 'SUBMITTED') {
        const ds = docSnapMap[reqDoc.documentType];
        if (ds) {
          const attachedInfo = {
            id: ds.documentVersionId,
            documentId: ds.documentVersion?.documentId || null,
            versionNumber: ds.documentVersion?.versionNumber || 1,
            originalFilename: ds.documentVersion?.originalFilename || 'Uploaded Document',
            fileSizeBytes: ds.documentVersion?.fileSizeBytes || 0,
            fileSizeFormatted: formatBytes(ds.documentVersion?.fileSizeBytes || 0),
            mimeType: ds.documentVersion?.mimeType || 'application/pdf',
            isCompressed: Boolean(ds.documentVersion?.isCompressed),
          };
          return {
            id: reqDoc.id,
            documentId: ds.documentVersion?.documentId || null,
            documentType: reqDoc.documentType,
            isMandatory,
            helpTitle: reqDoc.helpTitle,
            helpTextSimple: reqDoc.helpTextSimple,
            status: 'ATTACHED',
            hasInVault: true,
            vaultCurrentVersion: attachedInfo,
            attachedVersionId: ds.documentVersionId,
            attachedVersion: attachedInfo,
          };
        } else {
          return {
            id: reqDoc.id,
            documentId: null,
            documentType: reqDoc.documentType,
            isMandatory,
            helpTitle: reqDoc.helpTitle,
            helpTextSimple: reqDoc.helpTextSimple,
            status: isMandatory ? 'MISSING' : 'NOT_ATTACHED',
            hasInVault: false,
            vaultCurrentVersion: null,
            attachedVersionId: null,
            attachedVersion: null,
          };
        }
      }

      // Handle Draft Application: Auto-resolve from vault where available
      const vaultEntry = vaultMap[reqDoc.documentType];
      const vaultVersion = vaultEntry ? vaultEntry.version : null;
      const vaultDoc = vaultEntry ? vaultEntry.doc : null;
      const attachedVersionId = selectedDocuments[reqDoc.documentType];

      // For mandatory documents, automatically resolve from vault if not yet explicitly saved
      const resolvedVersionId = isMandatory
        ? attachedVersionId || (vaultVersion ? vaultVersion.id : null)
        : attachedVersionId || null;

      let status = 'NOT_ATTACHED';
      let attachedInfo = null;

      if (resolvedVersionId) {
        status = 'ATTACHED';
        if (vaultVersion && vaultVersion.id === resolvedVersionId) {
          attachedInfo = {
            id: vaultVersion.id,
            documentId: vaultDoc ? vaultDoc.id : null,
            versionNumber: vaultVersion.versionNumber,
            originalFilename: vaultVersion.originalFilename,
            fileSizeBytes: vaultVersion.fileSizeBytes,
            fileSizeFormatted: formatBytes(vaultVersion.fileSizeBytes),
            mimeType: vaultVersion.mimeType,
            isCompressed: vaultVersion.isCompressed,
          };
        }
      } else if (isMandatory) {
        status = 'MISSING';
      }

      return {
        id: reqDoc.id,
        documentId: vaultDoc ? vaultDoc.id : null,
        documentType: reqDoc.documentType,
        isMandatory,
        helpTitle: reqDoc.helpTitle,
        helpTextSimple: reqDoc.helpTextSimple,
        status,
        hasInVault: Boolean(vaultVersion),
        vaultCurrentVersion: vaultVersion
          ? {
              id: vaultVersion.id,
              documentId: vaultDoc ? vaultDoc.id : null,
              versionNumber: vaultVersion.versionNumber,
              originalFilename: vaultVersion.originalFilename,
              fileSizeFormatted: formatBytes(vaultVersion.fileSizeBytes),
            }
          : null,
        attachedVersionId: resolvedVersionId,
        attachedVersion: attachedInfo,
      };
    });

    // Evaluate current live eligibility
    const eligibilityEvaluation = evaluateScholarshipEligibility(
      scholarship.rules || [],
      studentProfile,
      now
    );

    return {
      id: app.id,
      applicationNumber: app.applicationNumber,
      status: app.status,
      academicYear: app.academicYear,
      healthScore: app.healthScore,
      submittedAt: app.submittedAt,
      createdAt: app.createdAt,
      updatedAt: app.updatedAt,
      scholarship: {
        id: scholarship.id,
        code: scholarship.code,
        name: scholarship.name,
        description: scholarship.description,
        benefitAmount: Number(scholarship.benefitAmount),
        academicYear: scholarship.academicYear,
        applicationStartDate: scholarship.applicationStartDate,
        applicationEndDate: scholarship.applicationEndDate,
        ...windowInfo,
        department: scholarship.department,
      },
      studentSummary: {
        fullName: studentProfile.fullName,
        category: studentProfile.category,
        annualFamilyIncome: studentProfile.annualFamilyIncome
          ? Number(studentProfile.annualFamilyIncome)
          : null,
        collegeName: studentProfile.college?.name || 'Not Specified',
        courseName: studentProfile.courseName,
        bankAccountNo: studentProfile.bankAccountNo
          ? `XXXXXX${studentProfile.bankAccountNo.slice(-4)}`
          : null,
        bankIfsc: studentProfile.bankIfsc,
        completionPercentage: studentProfile.completionPercentage,
      },
      questionnaireSchema,
      questionnaireResponses: questionnaire,
      documentsChecklist,
      declarationAccepted: Boolean(draftData.declarationAccepted),
      eligibilityEvaluation: {
        status: eligibilityEvaluation.status,
        isEligible: eligibilityEvaluation.isEligible,
        summary: eligibilityEvaluation.summary,
        missingFields: eligibilityEvaluation.missingFields,
        failedReasons: eligibilityEvaluation.failedReasons,
      },
      snapshotsCount: app.snapshots ? app.snapshots.length : 0,
    };
  }

  /**
   * Starts a new application draft or resumes an existing draft.
   * Strictly enforces scholarship OPEN window and eligibility.
   */
  async startOrResumeApplication(userId, scholarshipId) {
    const profile = await this._resolveStudentProfile(userId);
    const scholarship = await applicationRepository.findScholarshipById(scholarshipId);

    if (!scholarship) {
      const error = new Error('Scholarship not found.');
      error.statusCode = 404;
      throw error;
    }

    const now = new Date();

    // 1. Explicitly enforce scholarship OPEN window
    if (!scholarship.isActive) {
      const error = new Error('This scholarship scheme is currently inactive and cannot accept applications.');
      error.statusCode = 400;
      throw error;
    }

    if (now < scholarship.applicationStartDate) {
      const formatted = new Date(scholarship.applicationStartDate).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
      const error = new Error(
        `Application window for "${scholarship.name}" has not opened yet. Applications will open on ${formatted}.`
      );
      error.statusCode = 400;
      throw error;
    }

    if (now > scholarship.applicationEndDate) {
      const formatted = new Date(scholarship.applicationEndDate).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
      const error = new Error(
        `Application window for "${scholarship.name}" closed on ${formatted}. Applications are no longer accepted for academic year ${scholarship.academicYear}.`
      );
      error.statusCode = 400;
      throw error;
    }

    // 2. Evaluate eligibility gate
    const evalResult = evaluateScholarshipEligibility(scholarship.rules || [], profile, now);
    if (evalResult.status === 'NOT_ELIGIBLE') {
      const reasons = evalResult.failedReasons.join('; ');
      const error = new Error(
        `You do not satisfy the eligibility criteria for this scholarship: ${reasons}`
      );
      error.statusCode = 403;
      throw error;
    }

    // 3. Check for existing application for (studentId, scholarshipId, academicYear)
    const existing = await applicationRepository.findApplicationByStudentAndScholarship(
      profile.id,
      scholarship.id,
      scholarship.academicYear
    );

    const vaultDocs = await applicationRepository.findStudentVaultDocuments(profile.id);

    if (existing) {
      if (existing.status === 'DRAFT') {
        return {
          isResumed: true,
          message: 'Existing draft application resumed.',
          application: this._formatApplicationResponse(existing, profile, vaultDocs),
        };
      }

      // Already submitted or under review
      const error = new Error(
        `You have already submitted an application for "${scholarship.name}" in academic year ${scholarship.academicYear} (Application No: ${existing.applicationNumber || 'Under Review'}).`
      );
      error.statusCode = 409;
      throw error;
    }

    // 4. Create new DRAFT application
    // Automatically resolve student's current vault versions for MANDATORY documents
    const initialSelectedDocuments = {};
    for (const reqDoc of scholarship.requiredDocuments || []) {
      if (reqDoc.isMandatory) {
        const matchingDoc = vaultDocs.find((d) => d.documentType === reqDoc.documentType);
        if (matchingDoc && matchingDoc.versions && matchingDoc.versions.length > 0) {
          initialSelectedDocuments[reqDoc.documentType] = matchingDoc.versions[0].id;
        }
      }
      // Optional documents remain unattached by default unless explicitly chosen
    }

    const initialDraftData = {
      questionnaire: {},
      selectedDocuments: initialSelectedDocuments,
      declarationAccepted: false,
    };

    const initialHealthScore = calculateDraftHealthScore({
      profile,
      scholarship,
      draftData: initialDraftData,
    });

    const newApp = await applicationRepository.createDraftApplication({
      studentId: profile.id,
      scholarshipId: scholarship.id,
      academicYear: scholarship.academicYear,
      draftDataJson: initialDraftData,
      healthScore: initialHealthScore,
    });

    return {
      isResumed: false,
      message: 'Draft application initialized successfully.',
      application: this._formatApplicationResponse(newApp, profile, vaultDocs),
    };
  }

  /**
   * Retrieves an application by ID with complete metadata.
   */
  async getApplicationById(userId, applicationId) {
    const profile = await this._resolveStudentProfile(userId);
    const app = await applicationRepository.findApplicationByIdAndStudentId(
      applicationId,
      profile.id
    );

    if (!app) {
      const error = new Error('Application not found or access denied.');
      error.statusCode = 404;
      throw error;
    }

    const vaultDocs = await applicationRepository.findStudentVaultDocuments(profile.id);
    return this._formatApplicationResponse(app, profile, vaultDocs);
  }

  /**
   * Lists all applications (drafts and submitted) for the authenticated student.
   */
  async getMyApplications(userId) {
    const profile = await this._resolveStudentProfile(userId);
    const applications = await applicationRepository.findStudentApplications(profile.id);

    return applications.map((app) => ({
      id: app.id,
      applicationNumber: app.applicationNumber,
      status: app.status,
      statusMeta: getStatusMetadata(app.status),
      academicYear: app.academicYear,
      healthScore: app.healthScore,
      submittedAt: app.submittedAt,
      createdAt: app.createdAt,
      scholarship: {
        id: app.scholarship.id,
        code: app.scholarship.code,
        name: app.scholarship.name,
        benefitAmount: Number(app.scholarship.benefitAmount),
        department: app.scholarship.department,
      },
      documentsCount: app.documentSnapshots.length,
    }));
  }

  /**
   * Saves partial questionnaire responses and document attachments for a draft.
   */
  async saveApplicationDraft(userId, applicationId, payload) {
    const profile = await this._resolveStudentProfile(userId);
    const app = await applicationRepository.findApplicationByIdAndStudentId(
      applicationId,
      profile.id
    );

    if (!app) {
      const error = new Error('Application not found or access denied.');
      error.statusCode = 404;
      throw error;
    }

    if (app.status !== 'DRAFT') {
      const error = new Error('Submitted applications cannot be modified.');
      error.statusCode = 403;
      throw error;
    }

    const currentDraft = app.draftDataJson || {};
    const questionnaire = payload.questionnaire !== undefined ? payload.questionnaire : currentDraft.questionnaire || {};
    const selectedDocuments = payload.selectedDocuments !== undefined ? payload.selectedDocuments : currentDraft.selectedDocuments || {};
    const declarationAccepted = payload.declarationAccepted !== undefined ? Boolean(payload.declarationAccepted) : Boolean(currentDraft.declarationAccepted);

    // Verify ownership of any selected document version IDs
    const versionIds = Object.values(selectedDocuments).filter(Boolean);
    if (versionIds.length > 0) {
      const verified = await applicationRepository.findVerifiedDocumentVersions(
        versionIds,
        profile.id
      );
      if (verified.length !== versionIds.length) {
        const error = new Error('One or more selected documents do not exist in your vault.');
        error.statusCode = 403;
        throw error;
      }
    }

    const updatedDraftData = {
      questionnaire,
      selectedDocuments,
      declarationAccepted,
    };

    const healthScore = calculateDraftHealthScore({
      profile,
      scholarship: app.scholarship,
      draftData: updatedDraftData,
    });

    const updatedApp = await applicationRepository.updateDraftApplication(app.id, {
      draftDataJson: updatedDraftData,
      healthScore,
    });

    const vaultDocs = await applicationRepository.findStudentVaultDocuments(profile.id);
    return {
      success: true,
      message: 'Draft application saved successfully.',
      healthScore,
      application: this._formatApplicationResponse(updatedApp, profile, vaultDocs),
    };
  }

  /**
   * Deterministic readiness check evaluating all submission criteria.
   */
  async checkApplicationReadiness(userId, applicationId) {
    const profile = await this._resolveStudentProfile(userId);
    const app = await applicationRepository.findApplicationByIdAndStudentId(
      applicationId,
      profile.id
    );

    if (!app) {
      const error = new Error('Application not found or access denied.');
      error.statusCode = 404;
      throw error;
    }

    const scholarship = app.scholarship;
    const now = new Date();
    const blockers = [];

    // 1. Application Window Check
    if (!scholarship.isActive) {
      blockers.push({
        code: 'SCHOLARSHIP_INACTIVE',
        category: 'WINDOW',
        message: 'This scholarship is currently inactive.',
      });
    } else if (now < scholarship.applicationStartDate || now > scholarship.applicationEndDate) {
      blockers.push({
        code: 'WINDOW_CLOSED',
        category: 'WINDOW',
        message: 'The application window for this scholarship is closed.',
      });
    }

    // 2. Profile Completeness Check
    const essentialProfileFields = [
      { key: 'fullName', label: 'Full Name' },
      { key: 'category', label: 'Caste Category' },
      { key: 'annualFamilyIncome', label: 'Annual Family Income' },
      { key: 'collegeId', label: 'Enrolled College' },
      { key: 'courseName', label: 'Course Name' },
      { key: 'bankAccountNo', label: 'Bank Account Number' },
      { key: 'bankIfsc', label: 'Bank IFSC Code' },
    ];

    for (const field of essentialProfileFields) {
      if (!profile[field.key]) {
        blockers.push({
          code: 'PROFILE_INCOMPLETE',
          category: 'PROFILE',
          message: `Your profile is missing "${field.label}". Please update your profile.`,
          actionUrl: '/profile',
        });
      }
    }

    // 3. Eligibility Engine Check
    const evalResult = evaluateScholarshipEligibility(scholarship.rules || [], profile, now);
    if (!evalResult.isEligible) {
      if (evalResult.status === 'INCOMPLETE') {
        blockers.push({
          code: 'ELIGIBILITY_INCOMPLETE',
          category: 'ELIGIBILITY',
          message: `Eligibility evaluation is incomplete. Missing profile facts: ${evalResult.missingFields.join(', ')}.`,
          actionUrl: '/profile',
        });
      } else {
        blockers.push({
          code: 'ELIGIBILITY_FAILED',
          category: 'ELIGIBILITY',
          message: `You do not meet the scheme eligibility rules: ${evalResult.failedReasons.join('; ')}.`,
        });
      }
    }

    // 4. Required Mandatory Documents Check
    const draftData = app.draftDataJson || {};
    const selectedDocs = draftData.selectedDocuments || {};
    const mandatoryDocs = (scholarship.requiredDocuments || []).filter((d) => d.isMandatory);

    for (const doc of mandatoryDocs) {
      const versionId = selectedDocs[doc.documentType];
      if (!versionId) {
        blockers.push({
          code: 'MISSING_MANDATORY_DOCUMENT',
          category: 'DOCUMENT',
          documentType: doc.documentType,
          message: `Mandatory document "${doc.helpTitle || doc.documentType}" has not been attached from your vault.`,
          actionUrl: '/documents',
        });
      }
    }

    // 5. Questionnaire Check
    const schema = getQuestionnaireForScholarship(scholarship.code);
    const qValidation = validateQuestionnaire(schema, draftData.questionnaire || {});
    if (!qValidation.isValid) {
      for (const err of qValidation.errors) {
        blockers.push({
          code: 'QUESTIONNAIRE_INCOMPLETE',
          category: 'QUESTIONNAIRE',
          message: err,
        });
      }
    }

    // 6. Declaration Check
    if (!draftData.declarationAccepted) {
      blockers.push({
        code: 'DECLARATION_REQUIRED',
        category: 'DECLARATION',
        message: 'You must review and accept the statutory legal declaration before submitting.',
      });
    }

    const isReady = blockers.length === 0;
    const readinessScore = isReady ? 100 : Math.max(10, 100 - blockers.length * 20);

    return {
      isReady,
      readinessScore,
      blockerCount: blockers.length,
      blockers,
    };
  }

  /**
   * Final Comprehensive Preview payload before submission.
   */
  async getApplicationPreview(userId, applicationId) {
    const profile = await this._resolveStudentProfile(userId);
    const app = await applicationRepository.findApplicationByIdAndStudentId(
      applicationId,
      profile.id
    );

    if (!app) {
      const error = new Error('Application not found or access denied.');
      error.statusCode = 404;
      throw error;
    }

    const vaultDocs = await applicationRepository.findStudentVaultDocuments(profile.id);
    const formatted = this._formatApplicationResponse(app, profile, vaultDocs);
    const readiness = await this.checkApplicationReadiness(userId, applicationId);

    return {
      ...formatted,
      readiness,
    };
  }

  /**
   * Genuine concurrency-safe atomic submission transaction.
   */
  async submitApplication(userId, applicationId, payload = {}, clientIp = null) {
    const profile = await this._resolveStudentProfile(userId);
    const app = await applicationRepository.findApplicationByIdAndStudentId(
      applicationId,
      profile.id
    );

    if (!app) {
      const error = new Error('Application not found or access denied.');
      error.statusCode = 404;
      throw error;
    }

    if (app.status !== 'DRAFT') {
      const error = new Error('This application has already been submitted and cannot be resubmitted.');
      error.statusCode = 400;
      throw error;
    }

    // 1. Authoritative readiness re-validation
    const readiness = await this.checkApplicationReadiness(userId, applicationId);
    if (!readiness.isReady) {
      const blockerMsgs = readiness.blockers.map((b) => b.message).join(' ');
      const error = new Error(`Application is not ready for submission: ${blockerMsgs}`);
      error.statusCode = 400;
      error.blockers = readiness.blockers;
      throw error;
    }

    // 2. Verify student declaration acceptance
    const draftData = app.draftDataJson || {};
    const declarationAccepted = payload.declarationAccepted !== undefined
      ? Boolean(payload.declarationAccepted)
      : Boolean(draftData.declarationAccepted);

    if (!declarationAccepted) {
      const error = new Error('Statutory declaration must be acknowledged and accepted before submission.');
      error.statusCode = 400;
      throw error;
    }

    const scholarship = app.scholarship;
    const now = new Date();

    // 3. Re-verify application window inside submission
    if (now < scholarship.applicationStartDate || now > scholarship.applicationEndDate) {
      const error = new Error('Scholarship application window has closed.');
      error.statusCode = 400;
      throw error;
    }

    // 4. Re-evaluate eligibility
    const evalResult = evaluateScholarshipEligibility(scholarship.rules || [], profile, now);
    if (!evalResult.isEligible) {
      const error = new Error(`Eligibility criteria failed: ${evalResult.failedReasons.join('; ')}`);
      error.statusCode = 422;
      throw error;
    }

    // 5. Verify all selected document versions and resolve metadata
    const selectedDocuments = draftData.selectedDocuments || {};
    const versionIds = Object.values(selectedDocuments).filter(Boolean);

    const verifiedVersions = await applicationRepository.findVerifiedDocumentVersions(
      versionIds,
      profile.id
    );

    if (verifiedVersions.length !== versionIds.length) {
      const error = new Error('Document verification failed. Attached documents must belong to the applicant.');
      error.statusCode = 403;
      throw error;
    }

    // Map verified versions: DocumentType -> VersionId
    const attachedVersionMap = {};
    for (const v of verifiedVersions) {
      attachedVersionMap[v.document.documentType] = v.id;
    }

    // 6. Generate human-readable Application Reference Number (ARN)
    const applicationNumber = generateApplicationNumber(scholarship.academicYear);

    // 7. Build complete immutable snapshotDataJson
    const snapshotDataJson = buildSnapshotDataJson({
      studentProfile: profile,
      scholarship,
      eligibilityEvaluation: evalResult,
      questionnaireResponses: draftData.questionnaire || {},
      verifiedDocumentVersions: verifiedVersions,
    });

    // 8. Execute atomic submission transaction with concurrency protection
    const submittedApplication = await applicationRepository.executeAtomicSubmission({
      applicationId: app.id,
      studentId: profile.id,
      userId,
      applicationNumber,
      now,
      snapshotDataJson,
      attachedDocumentVersionMap: attachedVersionMap,
      clientIp,
    });

    return {
      success: true,
      message: `Application submitted successfully! Official Reference Number: ${applicationNumber}.`,
      applicationNumber,
      submittedAt: now,
      applicationId: submittedApplication.id,
    };
  }

  /**
   * Generates a pre-submission dynamic PDF preview without freezing/mutating draft state.
   */
  async generatePreSubmissionPdf(userId, applicationId) {
    const profile = await this._resolveStudentProfile(userId);
    const app = await applicationRepository.findApplicationByIdAndStudentId(
      applicationId,
      profile.id
    );

    if (!app) {
      const error = new Error('Application not found or access denied.');
      error.statusCode = 404;
      throw error;
    }

    if (app.status !== 'DRAFT') {
      // If already submitted, return the submitted PDF instead
      return this.getSubmittedApplicationPdf(userId, applicationId);
    }

    const vaultDocs = await applicationRepository.findStudentVaultDocuments(profile.id);
    const formatted = this._formatApplicationResponse(app, profile, vaultDocs);

    const pdfBuffer = await generateApplicationPdfBuffer({
      applicationNumber: 'DRAFT-PREVIEW',
      status: 'DRAFT',
      submittedAt: null,
      student: formatted.studentSummary,
      scholarship: formatted.scholarship,
      questionnaireResponses: formatted.questionnaireResponses,
      questionnaireSchema: formatted.questionnaireSchema,
      documentsChecklist: formatted.documentsChecklist,
      isDraftPreview: true,
    });

    return {
      pdfBuffer,
      filename: `Application-Draft-Preview-${applicationId.slice(0, 8)}.pdf`,
    };
  }

  /**
   * Generates or retrieves the immutable submitted application PDF from frozen snapshot data.
   * Supports any post-submission lifecycle status and handles multi-cycle snapshots.
   */
  async getSubmittedApplicationPdf(userId, applicationId, isDownload = false, cycle = null) {
    const profile = await this._resolveStudentProfile(userId);
    const app = await applicationRepository.findApplicationByIdAndStudentId(
      applicationId,
      profile.id
    );

    if (!app) {
      const error = new Error('Application not found or access denied.');
      error.statusCode = 404;
      throw error;
    }

    // Only unsubmitted draft applications cannot access the submitted PDF
    if (app.status === 'DRAFT' || !app.submittedAt) {
      const error = new Error(
        'Application has not yet been submitted. Use preview endpoint for draft applications.'
      );
      error.statusCode = 400;
      throw error;
    }

    // Resolve snapshot cycle: specific requested cycle or latest cycle (snapshots are ordered cycleNumber: 'desc')
    let snapshot = null;
    const requestedCycle = cycle ? parseInt(cycle, 10) : null;
    if (requestedCycle && app.snapshots && app.snapshots.length > 0) {
      snapshot = app.snapshots.find((s) => s.cycleNumber === requestedCycle) || null;
    }
    if (!snapshot && app.snapshots && app.snapshots.length > 0) {
      snapshot = app.snapshots[0];
    }

    const cycleNumber = snapshot?.cycleNumber || 1;

    // Check if cached on disk for this exact cycle
    if (await hasSubmittedPdf(app.id, cycleNumber)) {
      const filePath = getApplicationPdfPath(app.id, cycleNumber);
      const pdfBuffer = await fs.promises.readFile(filePath);
      return {
        pdfBuffer,
        filename: `${app.applicationNumber}${cycleNumber > 1 ? `-Cycle${cycleNumber}` : ''}.pdf`,
      };
    }

    // Backward compatibility: check legacy unversioned path for cycle 1
    if (cycleNumber === 1 && (await hasSubmittedPdf(app.id))) {
      const filePath = getApplicationPdfPath(app.id);
      const pdfBuffer = await fs.promises.readFile(filePath);
      return {
        pdfBuffer,
        filename: `${app.applicationNumber}.pdf`,
      };
    }

    // Generate deterministically from frozen snapshot data
    const snapData = snapshot?.snapshotDataJson || {};
    const questionnaireSchema = getQuestionnaireForScholarship(app.scholarship.code);

    // Filter document snapshots for this exact cycle to avoid duplicate entries
    const cycleDocSnapshots = (app.documentSnapshots || []).filter(
      (ds) => ds.cycleNumber === cycleNumber
    );
    const docsToUse = cycleDocSnapshots.length > 0 ? cycleDocSnapshots : app.documentSnapshots || [];

    const docsChecklist = docsToUse.map((ds) => ({
      documentType: ds.documentType,
      originalFilename: ds.documentVersion?.originalFilename || 'Uploaded Document',
      versionNumber: ds.documentVersion?.versionNumber || 1,
      fileSizeBytes: ds.documentVersion?.fileSizeBytes || 0,
      isMandatory: (app.scholarship.requiredDocuments || []).some(
        (rd) => rd.documentType === ds.documentType && rd.isMandatory
      ),
      status: 'ATTACHED',
    }));

    const pdfBuffer = await generateApplicationPdfBuffer({
      applicationNumber: app.applicationNumber,
      status: app.status,
      submittedAt: snapshot?.submittedAt || app.submittedAt,
      student: snapData.student || profile,
      scholarship: snapData.scholarshipConfig || app.scholarship,
      questionnaireResponses: snapData.questionnaireResponses || {},
      questionnaireSchema,
      documentsChecklist: docsChecklist,
      isDraftPreview: false,
    });

    // Cache to disk for this cycle
    await saveSubmittedPdf(app.id, pdfBuffer, cycleNumber).catch((err) =>
      console.error('[ApplicationService] Failed to cache PDF to disk:', err)
    );

    return {
      pdfBuffer,
      filename: `${app.applicationNumber}${cycleNumber > 1 ? `-Cycle${cycleNumber}` : ''}.pdf`,
    };
  }

    // =========================================================================
    // PHASE 6: APPLICATION TRACKING & CORRECTIONS
    // =========================================================================

    /**
     * Retrieves complete student tracking details for an application.
     */
    async getApplicationTracking(userId, applicationId) {
      const profile = await this._resolveStudentProfile(userId);
      const app = await applicationRepository.findApplicationTrackingDetails(
        applicationId,
        profile.id
      );

      if (!app) {
        const error = new Error('Application not found or access denied.');
        error.statusCode = 404;
        throw error;
      }

      const statusMeta = getStatusMetadata(app.status);
      const timeline = (app.auditLogs || []).map(formatTimelineEvent);

      // Extract latest review & structured correction requests
      const latestReview = app.reviews && app.reviews.length > 0 ? app.reviews[0] : null;
      const correctionRequests = (app.correctionRequests || []).map((c) => ({
        id: c.id,
        cycleNumber: c.cycleNumber,
        reviewerRole: c.reviewerRole,
        affectedSection: c.affectedSection,
        affectedField: c.affectedField,
        affectedDocumentType: c.affectedDocumentType,
        rejectionCategory: c.rejectionCategory,
        reasonText: c.reasonText,
        actionRequiredText: c.actionRequiredText,
        status: c.status,
        studentResponseText: c.studentResponseText,
        resolvedDocumentVersionId: c.resolvedDocumentVersionId,
        resolvedDocumentVersion: c.resolvedDocumentVersion
          ? {
              id: c.resolvedDocumentVersion.id,
              originalFilename: c.resolvedDocumentVersion.originalFilename,
              versionNumber: c.resolvedDocumentVersion.versionNumber,
              fileSizeBytes: c.resolvedDocumentVersion.fileSizeBytes,
              fileSizeFormatted: formatBytes(c.resolvedDocumentVersion.fileSizeBytes),
            }
          : null,
        createdAt: c.createdAt,
        resolvedAt: c.resolvedAt,
        reviewedAt: c.reviewedAt,
      }));

      const openCorrections = correctionRequests.filter(
        (c) => c.status === 'OPEN' || c.status === 'RE_FLAGGED'
      );
      const hasActionRequired = statusMeta.isActionRequired || openCorrections.length > 0;

      // Staged corrections in draftDataJson (if any)
      const stagedCorrections = app.draftDataJson?.corrections || {};

      return {
        id: app.id,
        applicationNumber: app.applicationNumber,
        status: app.status,
        academicYear: app.academicYear,
        submittedAt: app.submittedAt,
        createdAt: app.createdAt,
        updatedAt: app.updatedAt,
        scholarship: {
          id: app.scholarship.id,
          code: app.scholarship.code,
          name: app.scholarship.name,
          benefitAmount: Number(app.scholarship.benefitAmount),
          academicYear: app.scholarship.academicYear,
          department: app.scholarship.department,
        },
        statusMeta,
        hasActionRequired,
        openCorrectionsCount: openCorrections.length,
        activeReview: latestReview
          ? {
              id: latestReview.id,
              cycleNumber: latestReview.cycleNumber,
              reviewerRole: latestReview.reviewerRole,
              decision: latestReview.decision,
              overallRemarks: latestReview.overallRemarks,
              reviewedAt: latestReview.reviewedAt,
            }
          : null,
        correctionRequests,
        stagedCorrections,
        timeline,
        payment: app.paymentRecord
          ? {
              id: app.paymentRecord.id,
              amount: Number(app.paymentRecord.amount),
              status: app.paymentRecord.status,
              simulationReference: app.paymentRecord.simulationReference,
              batchNumber: app.paymentRecord.batch?.batchNumber || null,
              disbursedAt: app.paymentRecord.disbursedAt,
              failureReason: app.paymentRecord.failureReason,
              updatedAt: app.paymentRecord.updatedAt,
            }
          : null,
        canCancel: PERMITTED_CANCEL_STATUSES.includes(app.status),
        canGiveUp: PERMITTED_GIVE_UP_STATUSES.includes(app.status),
      };
    }

    /**
     * Retrieves application audit log history for timeline display.
     */
    async getApplicationHistory(userId, applicationId) {
      const profile = await this._resolveStudentProfile(userId);
      const auditLogs = await applicationRepository.findApplicationAuditLogs(
        applicationId,
        profile.id
      );

      if (!auditLogs) {
        const error = new Error('Application not found or access denied.');
        error.statusCode = 404;
        throw error;
      }

      const timeline = auditLogs.map(formatTimelineEvent);

      return {
        success: true,
        count: timeline.length,
        timeline,
      };
    }

    /**
     * Retrieves structured correction requests for an application.
     */
    async getApplicationCorrections(userId, applicationId) {
      const profile = await this._resolveStudentProfile(userId);
      const app = await applicationRepository.findApplicationByIdAndStudentId(
        applicationId,
        profile.id
      );

      if (!app) {
        const error = new Error('Application not found or access denied.');
        error.statusCode = 404;
        throw error;
      }

      const tracking = await applicationRepository.findApplicationTrackingDetails(
        applicationId,
        profile.id
      );

      return {
        success: true,
        count: tracking.correctionRequests.length,
        corrections: tracking.correctionRequests,
      };
    }

    /**
     * Resolves a correction request (document replacement or field update) by the student.
     */
    async resolveCorrection(userId, applicationId, correctionId, payload = {}) {
      const profile = await this._resolveStudentProfile(userId);
      const app = await applicationRepository.findApplicationByIdAndStudentId(
        applicationId,
        profile.id
      );

      if (!app) {
        const error = new Error('Application not found or access denied.');
        error.statusCode = 404;
        throw error;
      }

      const correction = await applicationRepository.findCorrectionRequestById(
        correctionId,
        profile.id
      );

      if (!correction || correction.applicationId !== applicationId) {
        const error = new Error('Correction request not found or access denied.');
        error.statusCode = 404;
        throw error;
      }

      let verifiedVersionId = null;
      if (payload.resolvedDocumentVersionId) {
        const verified = await applicationRepository.findVerifiedDocumentVersions(
          [payload.resolvedDocumentVersionId],
          profile.id
        );
        if (verified.length === 0) {
          const error = new Error(
            'Selected document version does not belong to your Document Vault.'
          );
          error.statusCode = 403;
          throw error;
        }
        verifiedVersionId = verified[0].id;
      }

      let fieldCorrection = null;
      if (payload.fieldValue !== undefined && correction.affectedField) {
        fieldCorrection = {
          field: correction.affectedField,
          value: payload.fieldValue,
        };
      }

      const updatedCorrection = await applicationRepository.resolveCorrectionRequest({
        correctionId,
        studentId: profile.id,
        studentResponseText: payload.studentResponseText || null,
        resolvedDocumentVersionId: verifiedVersionId,
        fieldCorrection,
      });

      return {
        success: true,
        message: 'Correction item marked as resolved.',
        correction: updatedCorrection,
      };
    }

    /**
     * Resubmits an application after resolving all required corrections.
     */
    async resubmitApplication(userId, applicationId, payload = {}, clientIp = null) {
      const profile = await this._resolveStudentProfile(userId);
      const app = await applicationRepository.findApplicationByIdAndStudentId(
        applicationId,
        profile.id
      );

      if (!app) {
        const error = new Error('Application not found or access denied.');
        error.statusCode = 404;
        throw error;
      }

      if (app.status !== 'COLLEGE_SENT_BACK' && app.status !== 'AUTHORITY_SENT_BACK') {
        const error = new Error(
          `Cannot resubmit application. Only applications sent back for correction can be resubmitted (Current status: ${app.status}).`
        );
        error.statusCode = 400;
        throw error;
      }

      // Academic-system confirmation check (Neutral wording)
      if (!payload.confirmationAccepted) {
        const error = new Error(
          'You must confirm that you have resolved the listed corrections and the information provided is accurate.'
        );
        error.statusCode = 400;
        throw error;
      }

      const updatedApp = await applicationRepository.executeAtomicResubmission({
        applicationId,
        studentId: profile.id,
        userId,
        now: new Date(),
        clientIp,
      });

      return {
        success: true,
        message: 'Application resubmitted successfully to your college for re-verification.',
        status: updatedApp.status,
        applicationId: updatedApp.id,
        applicationNumber: updatedApp.applicationNumber,
      };
    }

    /**
     * Formally withdraws/cancels an active pre-approval application.
     */
    async cancelApplication(userId, applicationId, payload = {}, clientIp = null) {
      const profile = await this._resolveStudentProfile(userId);
      const app = await applicationRepository.findApplicationByIdAndStudentId(
        applicationId,
        profile.id
      );

      if (!app) {
        const error = new Error('Application not found or access denied.');
        error.statusCode = 404;
        throw error;
      }

      const updated = await applicationRepository.executeCancelApplication({
        applicationId,
        studentId: profile.id,
        userId,
        reason: payload.reason,
        clientIp,
      });

      return {
        success: true,
        message: 'Application has been successfully cancelled.',
        status: updated.status,
      };
    }

    /**
     * Formally exercises statutory Right to Give Up scholarship benefit.
     */
    async exerciseRightToGiveUp(userId, applicationId, payload = {}, clientIp = null) {
      const profile = await this._resolveStudentProfile(userId);
      const app = await applicationRepository.findApplicationByIdAndStudentId(
        applicationId,
        profile.id
      );

      if (!app) {
        const error = new Error('Application not found or access denied.');
        error.statusCode = 404;
        throw error;
      }

      const updated = await applicationRepository.executeRightToGiveUp({
        applicationId,
        studentId: profile.id,
        userId,
        reason: payload.reason,
        clientIp,
      });

      return {
        success: true,
        message: 'You have formally exercised the Right to Give Up scholarship benefit.',
        status: updated.status,
      };
    }

    /**
     * Reviewer Scrutiny: Start Review.
     */
    async startReview(reviewerUser, applicationId, clientIp = null) {
      const targetStatus =
        reviewerUser.role === 'COLLEGE'
          ? 'UNDER_COLLEGE_REVIEW'
          : 'UNDER_AUTHORITY_REVIEW';

      const updated = await applicationRepository.startApplicationReview({
        applicationId,
        reviewerUserId: reviewerUser.id,
        reviewerRole: reviewerUser.role,
        targetStatus,
        clientIp,
      });

      return {
        success: true,
        message: `Application scrutiny initiated by ${reviewerUser.role}.`,
        status: updated.status,
      };
    }

    /**
     * Reviewer Scrutiny: Submit Decision.
     */
    async submitReviewDecision(reviewerUser, applicationId, payload = {}, clientIp = null) {
      const { decision, checklistJson, overallRemarks, corrections } = payload;
      if (!decision) {
        const error = new Error('decision is required.');
        error.statusCode = 400;
        throw error;
      }

      const result = await applicationRepository.submitReviewDecision({
        applicationId,
        reviewerUserId: reviewerUser.id,
        reviewerRole: reviewerUser.role,
        decision,
        checklistJson,
        overallRemarks,
        corrections,
        clientIp,
      });

      return {
        success: true,
        message: `Review decision "${decision}" recorded successfully.`,
        status: result.application.status,
        review: result.review,
      };
    }

    /**
     * Reviewer Scrutiny: Review Correction Item.
     */
    async reviewCorrection(
      reviewerUser,
      applicationId,
      correctionId,
      payload = {},
      clientIp = null
    ) {
      const { decision, remarks } = payload;
      if (!decision || !['ACCEPT', 'RE_FLAG'].includes(decision)) {
        const error = new Error("decision must be either 'ACCEPT' or 'RE_FLAG'.");
        error.statusCode = 400;
        throw error;
      }

      const updated = await applicationRepository.reviewCorrectionItem({
        correctionId,
        reviewerUserId: reviewerUser.id,
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

module.exports = new ApplicationService();
