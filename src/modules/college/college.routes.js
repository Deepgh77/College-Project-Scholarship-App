const { Router } = require('express');
const collegeController = require('./college.controller');
const { requireAuth, requireRole } = require('../auth/auth.middleware');

const router = Router();

// Strict security: All College Panel routes require an authenticated user with the COLLEGE role only
router.use(requireAuth, requireRole('COLLEGE'));

// Dashboard: Real database-derived statistics and workload intelligence
router.get('/dashboard', (req, res, next) => collegeController.getDashboard(req, res, next));

// Application Queue: Filtered, searchable, sorted, paginated applications
router.get('/applications', (req, res, next) => collegeController.getApplications(req, res, next));

// Application Review Desk: Detailed review payload, frozen snapshot, rules, questionnaire
router.get('/applications/:id', (req, res, next) =>
  collegeController.getApplicationDetails(req, res, next)
);

// Frozen Document Scrutiny: Scoped inline preview and attachment download
router.get('/applications/:id/documents/:versionId/preview', (req, res, next) =>
  collegeController.previewDocument(req, res, next)
);
router.get('/applications/:id/documents/:versionId/download', (req, res, next) =>
  collegeController.downloadDocument(req, res, next)
);

// Scrutiny Workflow Actions
router.post('/applications/:id/review/start', (req, res, next) =>
  collegeController.startReview(req, res, next)
);
router.post('/applications/:id/review/decision', (req, res, next) =>
  collegeController.submitReviewDecision(req, res, next)
);
router.patch('/applications/:id/corrections/:correctionId/review', (req, res, next) =>
  collegeController.reviewCorrection(req, res, next)
);

module.exports = router;
