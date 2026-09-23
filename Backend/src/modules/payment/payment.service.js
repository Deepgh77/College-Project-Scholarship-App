const paymentRepository = require('./payment.repository');
const { prisma } = require('../../config/prisma');

const PERMITTED_SIMULATION_REASONS = [
  'Simulated disbursement exception',
  'Simulation processing could not be completed',
  'Simulated verification exception',
  'Administrative simulation exception',
];

class PaymentService {
  /**
   * Retrieves sanctioned/approved applications eligible for payment simulation batching.
   */
  async getApprovedApplications({ departmentId, academicYear, page, limit }) {
    const p = Math.max(1, parseInt(page, 10) || 1);
    const l = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

    return paymentRepository.findApprovedApplications({
      departmentId: departmentId || undefined,
      academicYear: academicYear || undefined,
      page: p,
      limit: l,
    });
  }

  /**
   * Retrieves list of payment batches.
   */
  async getBatches({ departmentId, academicYear, status, page, limit }) {
    const p = Math.max(1, parseInt(page, 10) || 1);
    const l = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

    return paymentRepository.findBatches({
      departmentId: departmentId || undefined,
      academicYear: academicYear || undefined,
      status: status || undefined,
      page: p,
      limit: l,
    });
  }

  /**
   * Retrieves a single batch by ID with payment records.
   */
  async getBatchById(batchId) {
    const batch = await paymentRepository.findBatchById(batchId);
    if (!batch) {
      const err = new Error('Payment batch not found.');
      err.statusCode = 404;
      throw err;
    }
    return batch;
  }

  /**
   * Creates a new administrative payment simulation batch for approved applications.
   */
  async createBatch(user, { departmentId, academicYear, applicationIds }) {
    if (!departmentId) {
      const err = new Error('Department ID is required to create a payment batch.');
      err.statusCode = 400;
      throw err;
    }

    if (!academicYear) {
      const err = new Error('Academic year is required to create a payment batch.');
      err.statusCode = 400;
      throw err;
    }

    if (!Array.isArray(applicationIds) || applicationIds.length === 0) {
      const err = new Error('At least one approved application ID must be provided.');
      err.statusCode = 400;
      throw err;
    }

    // Verify department exists
    const dept = await prisma.department.findUnique({
      where: { id: departmentId },
      select: { id: true, code: true, name: true },
    });

    if (!dept) {
      const err = new Error('Target department not found.');
      err.statusCode = 404;
      throw err;
    }

    // Standardized neutral batch number
    const batchNumber = `BATCH-${dept.code}-${academicYear.replace('-', '')}-${Date.now().toString().slice(-6)}`;

    return paymentRepository.createPaymentBatchWithRecords({
      batchNumber,
      departmentId,
      academicYear,
      applicationIds,
      actorUserId: user.id,
    });
  }

  /**
   * Initiates payment simulation for records in a batch.
   */
  async initiateBatch(user, batchId) {
    return paymentRepository.initiateBatchSimulation(batchId, user.id);
  }

  /**
   * Marks eligible records in a batch as disbursed in the simulation.
   */
  async disburseBatch(user, batchId) {
    return paymentRepository.disburseBatchSimulation(batchId, user.id);
  }

  /**
   * Marks an individual payment record as undisbursed with a neutral simulated exception reason.
   */
  async failPaymentRecord(user, recordId, { failureReason }) {
    let reason = (failureReason || '').trim();

    if (!reason) {
      reason = 'Simulated disbursement exception';
    } else if (!PERMITTED_SIMULATION_REASONS.includes(reason) && reason.length < 5) {
      const err = new Error(
        'Failure reason must be at least 5 characters or one of the standard neutral simulation reasons.'
      );
      err.statusCode = 400;
      throw err;
    }

    return paymentRepository.failPaymentRecordSimulation(recordId, reason, user.id);
  }
}

module.exports = new PaymentService();
