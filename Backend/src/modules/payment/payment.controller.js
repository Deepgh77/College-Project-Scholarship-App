const paymentService = require('./payment.service');

class PaymentController {
  async getApprovedApplications(req, res, next) {
    try {
      const data = await paymentService.getApprovedApplications(req.query);
      res.status(200).json({
        success: true,
        ...data,
      });
    } catch (err) {
      next(err);
    }
  }

  async getBatches(req, res, next) {
    try {
      const data = await paymentService.getBatches(req.query);
      res.status(200).json({
        success: true,
        ...data,
      });
    } catch (err) {
      next(err);
    }
  }

  async getBatchById(req, res, next) {
    try {
      const batch = await paymentService.getBatchById(req.params.id);
      res.status(200).json({
        success: true,
        batch,
      });
    } catch (err) {
      next(err);
    }
  }

  async createBatch(req, res, next) {
    try {
      const batch = await paymentService.createBatch(req.user, req.body);
      res.status(201).json({
        success: true,
        message: `Administrative payment batch ${batch.batchNumber} created with ${batch.totalApplications} applications.`,
        batch,
      });
    } catch (err) {
      next(err);
    }
  }

  async initiateBatch(req, res, next) {
    try {
      const batch = await paymentService.initiateBatch(req.user, req.params.id);
      res.status(200).json({
        success: true,
        message: `Payment simulation initiated for batch ${batch.batchNumber}.`,
        batch,
      });
    } catch (err) {
      next(err);
    }
  }

  async disburseBatch(req, res, next) {
    try {
      const batch = await paymentService.disburseBatch(req.user, req.params.id);
      res.status(200).json({
        success: true,
        message: `Disbursement simulated successfully for batch ${batch.batchNumber}.`,
        batch,
      });
    } catch (err) {
      next(err);
    }
  }

  async failPaymentRecord(req, res, next) {
    try {
      const record = await paymentService.failPaymentRecord(
        req.user,
        req.params.id,
        req.body
      );
      res.status(200).json({
        success: true,
        message: `Payment record marked undisbursed with simulated exception.`,
        record,
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new PaymentController();
