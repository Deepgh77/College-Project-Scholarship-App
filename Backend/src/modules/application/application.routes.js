const { Router } = require('express');
const applicationController = require('./application.controller');
const { requireAuth, requireRole } = require('../auth/auth.middleware');

const router = Router();

// All application routes require an authenticated user
router.use(requireAuth);

// =============================================================================
// STUDENT ENDPOINTS
// =============================================================================

router.post('/start', requireRole('STUDENT'), (req, res, next) =>
  applicationController.startOrResumeApplication(req, res, next)
);
router.get('/', requireRole('STUDENT'), (req, res, next) =>
  applicationController.getMyApplications(req, res, next)
);

// Tracking, corrections & lifecycle
router.get('/:id/tracking', requireRole('STUDENT'), (req, res, next) =>
  applicationController.getApplicationTracking(req, res, next)
);
router.get('/:id/history', requireRole('STUDENT'), (req, res, next) =>
  applicationController.getApplicationHistory(req, res, next)
);
router.get('/:id/corrections', requireRole('STUDENT'), (req, res, next) =>
  applicationController.getApplicationCorrections(req, res, next)
);
router.patch('/:id/corrections/:correctionId/resolve', requireRole('STUDENT'), (req, res, next) =>
  applicationController.resolveCorrection(req, res, next)
);
router.post('/:id/resubmit', requireRole('STUDENT'), (req, res, next) =>
  applicationController.resubmitApplication(req, res, next)
);
router.post('/:id/cancel', requireRole('STUDENT'), (req, res, next) =>
  applicationController.cancelApplication(req, res, next)
);
router.post('/:id/right-to-give-up', requireRole('STUDENT'), (req, res, next) =>
  applicationController.exerciseRightToGiveUp(req, res, next)
);

// Application creation & preview endpoints
router.get('/:id/readiness', requireRole('STUDENT'), (req, res, next) =>
  applicationController.checkApplicationReadiness(req, res, next)
);
router.get('/:id/preview/pdf', requireRole('STUDENT'), (req, res, next) =>
  applicationController.previewApplicationPdf(req, res, next)
);
router.get('/:id/preview', requireRole('STUDENT'), (req, res, next) =>
  applicationController.getApplicationPreview(req, res, next)
);
router.get('/:id/pdf', requireRole('STUDENT'), (req, res, next) =>
  applicationController.downloadSubmittedApplicationPdf(req, res, next)
);
router.put('/:id/draft', requireRole('STUDENT'), (req, res, next) =>
  applicationController.saveApplicationDraft(req, res, next)
);
router.post('/:id/submit', requireRole('STUDENT'), (req, res, next) =>
  applicationController.submitApplication(req, res, next)
);
router.get('/:id', requireRole('STUDENT'), (req, res, next) =>
  applicationController.getApplicationById(req, res, next)
);

// =============================================================================
// REVIEWER SCRUTINY ENDPOINTS (COLLEGE / AUTHORITY / ADMIN)
// =============================================================================

router.post(
  '/:id/review/start',
  requireRole('COLLEGE', 'AUTHORITY', 'ADMIN'),
  (req, res, next) => applicationController.startReview(req, res, next)
);
router.post(
  '/:id/review/decision',
  requireRole('COLLEGE', 'AUTHORITY', 'ADMIN'),
  (req, res, next) => applicationController.submitReviewDecision(req, res, next)
);
router.patch(
  '/:id/corrections/:correctionId/review',
  requireRole('COLLEGE', 'AUTHORITY', 'ADMIN'),
  (req, res, next) => applicationController.reviewCorrection(req, res, next)
);

module.exports = router;

