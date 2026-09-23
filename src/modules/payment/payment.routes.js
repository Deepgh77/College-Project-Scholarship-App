const { Router } = require('express');
const paymentController = require('./payment.controller');
const { requireAuth, requireRole } = require('../auth/auth.middleware');

const router = Router();

// Strictly guard all administrative payment simulation endpoints to ADMIN role
router.use(requireAuth);
router.use(requireRole('ADMIN'));

// Query approved applications eligible for batching
router.get('/approved-applications', (req, res, next) =>
  paymentController.getApprovedApplications(req, res, next)
);

// Query batches
router.get('/batches', (req, res, next) =>
  paymentController.getBatches(req, res, next)
);

// Query single batch with records
router.get('/batches/:id', (req, res, next) =>
  paymentController.getBatchById(req, res, next)
);

// Create new payment batch
router.post('/batches', (req, res, next) =>
  paymentController.createBatch(req, res, next)
);

// Initiate payment simulation for batch
router.post('/batches/:id/initiate', (req, res, next) =>
  paymentController.initiateBatch(req, res, next)
);

// Complete disbursement simulation for batch
router.post('/batches/:id/disburse', (req, res, next) =>
  paymentController.disburseBatch(req, res, next)
);

// Record simulated failure/exception for an individual payment record
router.post('/records/:id/fail', (req, res, next) =>
  paymentController.failPaymentRecord(req, res, next)
);

module.exports = router;
