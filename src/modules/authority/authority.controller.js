const authorityService = require('./authority.service');

/**
 * Authority Controller
 * Handles HTTP requests for the Department Verification Portal.
 */
class AuthorityController {
  /**
   * GET /api/authority/dashboard
   */
  async getDashboard(req, res, next) {
    try {
      const result = await authorityService.getDashboard(req.user);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/authority/filters/options
   */
  async getFilterOptions(req, res, next) {
    try {
      const result = await authorityService.getFilterOptions(req.user);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/authority/applications
   */
  async getApplications(req, res, next) {
    try {
      const result = await authorityService.getApplications(req.user, req.query);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/authority/applications/:id
   */
  async getApplicationDetails(req, res, next) {
    try {
      const result = await authorityService.getApplicationDetails(req.user, req.params.id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/authority/applications/:id/documents/:versionId/preview
   * Streams an attached document version inline for browser viewing with strict department scoping.
   */
  async previewDocument(req, res, next) {
    try {
      const fileInfo = await authorityService.resolveApplicationDocumentStream(
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
   * GET /api/authority/applications/:id/documents/:versionId/download
   * Streams an attached document version as a download attachment with strict department scoping.
   */
  async downloadDocument(req, res, next) {
    try {
      const fileInfo = await authorityService.resolveApplicationDocumentStream(
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
   * POST /api/authority/applications/:id/review/start
   */
  async startReview(req, res, next) {
    try {
      const clientIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || null;
      const result = await authorityService.startReview(req.user, req.params.id, clientIp);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/authority/applications/:id/review/decision
   */
  async submitReviewDecision(req, res, next) {
    try {
      const clientIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || null;
      const result = await authorityService.submitReviewDecision(
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
}

module.exports = new AuthorityController();
