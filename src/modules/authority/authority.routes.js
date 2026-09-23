const { Router } = require('express');
const authorityController = require('./authority.controller');
const { requireAuth, requireRole } = require('../auth/auth.middleware');

const router = Router();

// Strict security: All Authority Panel routes require an authenticated user with the AUTHORITY role only
router.use(requireAuth, requireRole('AUTHORITY'));

// Dashboard: Real database-derived statistics and workload intelligence
router.get('/dashboard', (req, res, next) => authorityController.getDashboard(req, res, next));

// Filter options: Scholarships and Colleges under this department
router.get('/filters/options', (req, res, next) =>
  authorityController.getFilterOptions(req, res, next)
);

// Application Queue: Filtered, searchable, sorted, paginated applications
router.get('/applications', (req, res, next) =>
  authorityController.getApplications(req, res, next)
);

// Application Review Desk: Detailed review payload, frozen snapshot, rules, questionnaire
router.get('/applications/:id', (req, res, next) =>
  authorityController.getApplicationDetails(req, res, next)
);

// Frozen Document Scrutiny: Scoped inline preview and attachment download
router.get('/applications/:id/documents/:versionId/preview', (req, res, next) =>
  authorityController.previewDocument(req, res, next)
);
router.get('/applications/:id/documents/:versionId/download', (req, res, next) =>
  authorityController.downloadDocument(req, res, next)
);

// Scrutiny Workflow Actions
router.post('/applications/:id/review/start', (req, res, next) =>
  authorityController.startReview(req, res, next)
);
router.post('/applications/:id/review/decision', (req, res, next) =>
  authorityController.submitReviewDecision(req, res, next)
);

module.exports = router;
