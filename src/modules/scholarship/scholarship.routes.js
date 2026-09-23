const { Router } = require('express');
const scholarshipController = require('./scholarship.controller');
const { requireAuth, optionalAuth, requireRole } = require('../auth/auth.middleware');

const router = Router();

// 1. Catalog discovery with optional personalization
router.get('/', optionalAuth, (req, res, next) => scholarshipController.listScholarships(req, res, next));

// 2. Department filter list (Registered BEFORE /:id to prevent collision)
router.get('/departments', (req, res, next) => scholarshipController.listDepartments(req, res, next));

// 3. Batch evaluation for student (Registered BEFORE /:id to prevent collision)
router.get(
  '/evaluate-all',
  requireAuth,
  requireRole('STUDENT'),
  (req, res, next) => scholarshipController.evaluateAll(req, res, next)
);

// 4. Specific scholarship evaluation
router.get(
  '/:id/evaluate',
  requireAuth,
  requireRole('STUDENT'),
  (req, res, next) => scholarshipController.evaluateEligibility(req, res, next)
);

// 5. Specific scholarship detail (Registered AFTER static routes)
router.get('/:id', optionalAuth, (req, res, next) => scholarshipController.getScholarship(req, res, next));

module.exports = router;
