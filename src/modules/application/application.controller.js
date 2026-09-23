const applicationService = require('./application.service');

class ApplicationController {
  /**
   * POST /api/applications/start
   * Starts a new application draft or resumes existing draft.
   */
  async startOrResumeApplication(req, res, next) {
    try {
      const { scholarshipId } = req.body;
      if (!scholarshipId) {
        return res.status(400).json({
          success: false,
          message: 'scholarshipId is required.',
        });
      }

      const result = await applicationService.startOrResumeApplication(
        req.user.id,
        scholarshipId
      );

      res.status(result.isResumed ? 200 : 201).json({
        success: true,
        isResumed: result.isResumed,
        message: result.message,
        application: result.application,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/applications
   * Lists all applications (drafts and submitted) for the authenticated student.
   */
  async getMyApplications(req, res, next) {
    try {
      const applications = await applicationService.getMyApplications(req.user.id);
      res.json({
        success: true,
        count: applications.length,
        applications,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/applications/:id
   * Retrieves full application details by ID.
   */
  async getApplicationById(req, res, next) {
    try {
      const application = await applicationService.getApplicationById(
        req.user.id,
        req.params.id
      );
      res.json({
        success: true,
        application,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PUT /api/applications/:id/draft
   * Saves partial questionnaire responses and document selections.
   */
  async saveApplicationDraft(req, res, next) {
    try {
      const result = await applicationService.saveApplicationDraft(
        req.user.id,
        req.params.id,
        req.body
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/applications/:id/readiness
   * Evaluates readiness criteria and returns blockers.
   */
  async checkApplicationReadiness(req, res, next) {
    try {
      const readiness = await applicationService.checkApplicationReadiness(
        req.user.id,
        req.params.id
      );
      res.json({
        success: true,
        ...readiness,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/applications/:id/preview
   * Returns aggregated preview summary.
   */
  async getApplicationPreview(req, res, next) {
    try {
      const preview = await applicationService.getApplicationPreview(
        req.user.id,
        req.params.id
      );
      res.json({
        success: true,
        preview,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/applications/:id/submit
   * Executes atomic submission transaction.
   */
  async submitApplication(req, res, next) {
    try {
      const clientIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || null;
      const result = await applicationService.submitApplication(
        req.user.id,
        req.params.id,
        req.body,
        clientIp
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/applications/:id/preview/pdf
   * Streams pre-submission application PDF preview inline.
   */
  async previewApplicationPdf(req, res, next) {
    try {
      const result = await applicationService.generatePreSubmissionPdf(
        req.user.id,
        req.params.id
      );

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `inline; filename="${encodeURIComponent(result.filename)}"`
      );
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');

      res.send(result.pdfBuffer);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/applications/:id/pdf
   * Streams or downloads the frozen submitted application PDF.
   */
  async downloadSubmittedApplicationPdf(req, res, next) {
    try {
      const isDownload = req.query.download === 'true';
      const cycle = req.query.cycle || null;
      const result = await applicationService.getSubmittedApplicationPdf(
        req.user.id,
        req.params.id,
        isDownload,
        cycle
      );

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `${isDownload ? 'attachment' : 'inline'}; filename="${encodeURIComponent(result.filename)}"`
      );
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');

      res.send(result.pdfBuffer);
    } catch (err) {
      next(err);
    }
  }

  // ===========================================================================
  // PHASE 6: APPLICATION TRACKING & CORRECTIONS
  // ===========================================================================

  /**
   * GET /api/applications/:id/tracking
   * Retrieves full tracking summary, active review, corrections, and timeline.
   */
  async getApplicationTracking(req, res, next) {
    try {
      const tracking = await applicationService.getApplicationTracking(
        req.user.id,
        req.params.id
      );
      res.json({
        success: true,
        tracking,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/applications/:id/history
   * Retrieves chronological audit log timeline.
   */
  async getApplicationHistory(req, res, next) {
    try {
      const history = await applicationService.getApplicationHistory(
        req.user.id,
        req.params.id
      );
      res.json(history);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/applications/:id/corrections
   * Retrieves structured correction requests for the application.
   */
  async getApplicationCorrections(req, res, next) {
    try {
      const result = await applicationService.getApplicationCorrections(
        req.user.id,
        req.params.id
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/applications/:id/corrections/:correctionId/resolve
   * Resolves a flagged correction item (document or field) by the student.
   */
  async resolveCorrection(req, res, next) {
    try {
      const result = await applicationService.resolveCorrection(
        req.user.id,
        req.params.id,
        req.params.correctionId,
        req.body
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/applications/:id/resubmit
   * Resubmits an application after resolving all required corrections.
   */
  async resubmitApplication(req, res, next) {
    try {
      const clientIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || null;
      const result = await applicationService.resubmitApplication(
        req.user.id,
        req.params.id,
        req.body,
        clientIp
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/applications/:id/cancel
   * Formally withdraws/cancels an active pre-approval application.
   */
  async cancelApplication(req, res, next) {
    try {
      const clientIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || null;
      const result = await applicationService.cancelApplication(
        req.user.id,
        req.params.id,
        req.body,
        clientIp
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/applications/:id/right-to-give-up
   * Formally surrenders scholarship benefit under statutory Right to Give Up.
   */
  async exerciseRightToGiveUp(req, res, next) {
    try {
      const clientIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || null;
      const result = await applicationService.exerciseRightToGiveUp(
        req.user.id,
        req.params.id,
        req.body,
        clientIp
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/applications/:id/review/start
   * Reviewer starts scrutiny.
   */
  async startReview(req, res, next) {
    try {
      const clientIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || null;
      const result = await applicationService.startReview(
        req.user,
        req.params.id,
        clientIp
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/applications/:id/review/decision
   * Reviewer submits scrutiny decision.
   */
  async submitReviewDecision(req, res, next) {
    try {
      const clientIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || null;
      const result = await applicationService.submitReviewDecision(
        req.user,
        req.params.id,
        req.body,
        clientIp
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/applications/:id/corrections/:correctionId/review
   * Reviewer accepts or re-flags a resolved correction item.
   */
  async reviewCorrection(req, res, next) {
    try {
      const clientIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || null;
      const result = await applicationService.reviewCorrection(
        req.user,
        req.params.id,
        req.params.correctionId,
        req.body,
        clientIp
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new ApplicationController();
