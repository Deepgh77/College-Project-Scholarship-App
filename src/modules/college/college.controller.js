const collegeService = require('./college.service');

/**
 * College Controller
 * Handles HTTP requests for the College Processing Portal.
 */
class CollegeController {
  /**
   * GET /api/college/dashboard
   */
  async getDashboard(req, res, next) {
    try {
      const result = await collegeService.getDashboard(req.user);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/college/applications
   */
  async getApplications(req, res, next) {
    try {
      const result = await collegeService.getApplications(req.user, req.query);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/college/applications/:id
   */
  async getApplicationDetails(req, res, next) {
    try {
      const result = await collegeService.getApplicationDetails(req.user, req.params.id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/college/applications/:id/documents/:versionId/preview
   * Streams a document version inline for browser viewing with strict college scoping.
   */
  async previewDocument(req, res, next) {
    try {
      const fileInfo = await collegeService.resolveApplicationDocumentStream(
        req.user,
        req.params.id,
        req.params.versionId
      );

      res.setHeader('Content-Type', fileInfo.mimeType);
      res.setHeader(
        'Content-Disposition',
        `inline; filename="${encodeURIComponent(fileInfo.originalFilename)}"`
      );
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');

      res.sendFile(fileInfo.filePath);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/college/applications/:id/documents/:versionId/download
   * Streams a document version as a download attachment with strict college scoping.
   */
  async downloadDocument(req, res, next) {
    try {
      const fileInfo = await collegeService.resolveApplicationDocumentStream(
        req.user,
        req.params.id,
        req.params.versionId
      );

      res.setHeader('Content-Type', fileInfo.mimeType);
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${encodeURIComponent(fileInfo.originalFilename)}"`
      );
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');

      res.sendFile(fileInfo.filePath);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/college/applications/:id/review/start
   */
  async startReview(req, res, next) {
    try {
      const clientIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || null;
      const result = await collegeService.startReview(req.user, req.params.id, clientIp);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/college/applications/:id/review/decision
   */
  async submitReviewDecision(req, res, next) {
    try {
      const clientIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || null;
      const result = await collegeService.submitReviewDecision(
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
   * PATCH /api/college/applications/:id/corrections/:correctionId/review
   */
  async reviewCorrection(req, res, next) {
    try {
      const clientIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || null;
      const result = await collegeService.reviewCorrection(
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

module.exports = new CollegeController();
