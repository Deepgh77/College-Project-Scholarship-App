const { prisma } = require('../../config/prisma');

class PaymentRepository {
  /**
   * Retrieves sanctioned/approved applications eligible for batching.
   */
  async findApprovedApplications({ departmentId, academicYear, page = 1, limit = 20 }) {
    const where = {
      status: 'APPROVED',
      // Exclude applications that already have an active/completed payment record
      OR: [
        { paymentRecord: null },
        { paymentRecord: { status: { in: ['PENDING'] } } },
      ],
      ...(departmentId ? { scholarship: { departmentId } } : {}),
      ...(academicYear ? { academicYear } : {}),
    };

    const skip = (page - 1) * limit;

    const [total, applications] = await Promise.all([
      prisma.application.count({ where }),
      prisma.application.findMany({
        where,
        skip,
        take: limit,
        orderBy: { submittedAt: 'desc' },
        include: {
          student: {
            include: {
              user: { select: { id: true, email: true } },
              college: { select: { id: true, name: true, code: true } },
            },
          },
          scholarship: {
            include: {
              department: { select: { id: true, name: true, code: true } },
            },
          },
          paymentRecord: true,
        },
      }),
    ]);

    return { total, applications, page, limit, totalPages: Math.ceil(total / limit) || 1 };
  }

  /**
   * Queries payment batches with pagination and filters.
   */
  async findBatches({ departmentId, academicYear, status, page = 1, limit = 20 }) {
    const where = {
      ...(departmentId ? { departmentId } : {}),
      ...(academicYear ? { academicYear } : {}),
      ...(status && status !== 'ALL' ? { status } : {}),
    };

    const skip = (page - 1) * limit;

    const [total, batches] = await Promise.all([
      prisma.paymentBatch.count({ where }),
      prisma.paymentBatch.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          department: { select: { id: true, name: true, code: true } },
          _count: { select: { records: true } },
        },
      }),
    ]);

    return { total, batches, page, limit, totalPages: Math.ceil(total / limit) || 1 };
  }

  /**
   * Finds a single batch with department and detailed payment records.
   */
  async findBatchById(batchId) {
    return prisma.paymentBatch.findUnique({
      where: { id: batchId },
      include: {
        department: { select: { id: true, name: true, code: true } },
        records: {
          orderBy: { createdAt: 'asc' },
          include: {
            student: {
              include: {
                user: { select: { id: true, email: true } },
                college: { select: { id: true, name: true, code: true } },
              },
            },
            application: {
              include: {
                scholarship: { select: { id: true, name: true, code: true } },
              },
            },
          },
        },
      },
    });
  }

  /**
   * Finds a payment record by ID.
   */
  async findRecordById(recordId) {
    return prisma.paymentRecord.findUnique({
      where: { id: recordId },
      include: {
        application: {
          include: {
            student: { include: { user: true } },
            scholarship: { include: { department: true } },
          },
        },
        batch: true,
      },
    });
  }

  /**
   * Finds a payment record by Application ID.
   */
  async findPaymentRecordByApplicationId(applicationId) {
    return prisma.paymentRecord.findUnique({
      where: { applicationId },
      include: {
        batch: {
          include: {
            department: { select: { id: true, name: true, code: true } },
          },
        },
      },
    });
  }

  /**
   * Transactionally creates a PaymentBatch, creates PaymentRecord for each application,
   * transitions applications to PAYMENT_PROCESSING, and records audit logs.
   */
  async createPaymentBatchWithRecords({
    batchNumber,
    departmentId,
    academicYear,
    applicationIds,
    actorUserId,
  }) {
    return prisma.$transaction(async (tx) => {
      // 1. Fetch and validate applications
      const apps = await tx.application.findMany({
        where: {
          id: { in: applicationIds },
        },
        include: {
          scholarship: { include: { department: true } },
          student: { include: { user: true } },
          paymentRecord: true,
        },
      });

      if (apps.length !== applicationIds.length) {
        const foundIds = apps.map((a) => a.id);
        const missing = applicationIds.filter((id) => !foundIds.includes(id));
        const err = new Error(`Applications not found: ${missing.join(', ')}`);
        err.statusCode = 404;
        throw err;
      }

      // Validate all applications are APPROVED and belong to target department
      for (const app of apps) {
        if (app.status !== 'APPROVED') {
          const err = new Error(
            `Application ${app.applicationNumber || app.id} cannot be batched from status: ${app.status}. Only APPROVED applications can enter payment simulation.`
          );
          err.statusCode = 400;
          throw err;
        }

        if (app.scholarship.departmentId !== departmentId) {
          const err = new Error(
            `Application ${app.applicationNumber || app.id} belongs to department ${app.scholarship.department?.code}, not batch department.`
          );
          err.statusCode = 400;
          throw err;
        }

        if (
          app.paymentRecord &&
          ['PROCESSING', 'INITIATED', 'DISBURSED'].includes(app.paymentRecord.status)
        ) {
          const err = new Error(
            `Application ${app.applicationNumber || app.id} already has an active or completed payment record.`
          );
          err.statusCode = 409;
          throw err;
        }
      }

      // Calculate total amount
      const totalAmount = apps.reduce((sum, a) => sum + Number(a.scholarship.benefitAmount || 0), 0);

      // 2. Create the PaymentBatch
      const batch = await tx.paymentBatch.create({
        data: {
          batchNumber,
          departmentId,
          academicYear,
          status: 'PROCESSING',
          totalApplications: apps.length,
          totalAmount,
        },
      });

      // 3. For each application, create/upsert PaymentRecord, update Application status, record audit log
      for (const app of apps) {
        const benefitAmount = Number(app.scholarship.benefitAmount || 0);

        if (app.paymentRecord) {
          await tx.paymentRecord.update({
            where: { id: app.paymentRecord.id },
            data: {
              batchId: batch.id,
              amount: benefitAmount,
              status: 'PROCESSING',
              failureReason: null,
            },
          });
        } else {
          await tx.paymentRecord.create({
            data: {
              applicationId: app.id,
              studentId: app.studentId,
              batchId: batch.id,
              amount: benefitAmount,
              status: 'PROCESSING',
            },
          });
        }

        // Update application status to PAYMENT_PROCESSING
        await tx.application.update({
          where: { id: app.id },
          data: { status: 'PAYMENT_PROCESSING' },
        });

        // Record ApplicationAuditLog
        await tx.applicationAuditLog.create({
          data: {
            applicationId: app.id,
            actorUserId,
            actorRole: 'ADMIN',
            action: 'PAYMENT_PROCESSING_STARTED',
            previousStatus: 'APPROVED',
            newStatus: 'PAYMENT_PROCESSING',
            remarks: `Application included in Administrative Payment Simulation batch ${batchNumber} for sanctioned benefit of ₹${benefitAmount.toLocaleString('en-IN')}.`,
          },
        });

        // Send Student Notification
        if (app.student?.user?.id) {
          await tx.notification.create({
            data: {
              userId: app.student.user.id,
              title: 'Scholarship Payment Batch Prepared',
              message: `Your application has been included in administrative payment simulation batch: ${batchNumber}.`,
              category: 'PAYMENT',
              actionUrl: `/applications/${app.id}/tracking`,
            },
          });
        }
      }

      return batch;
    });
  }

  /**
   * Transactionally initiates the payment simulation for all records in a batch,
   * generates unique simulation references, transitions applications to PAYMENT_INITIATED,
   * and records audit logs.
   */
  async initiateBatchSimulation(batchId, actorUserId) {
    return prisma.$transaction(async (tx) => {
      const batch = await tx.paymentBatch.findUnique({
        where: { id: batchId },
        include: {
          records: {
            include: {
              application: {
                include: {
                  student: { include: { user: true } },
                },
              },
            },
          },
        },
      });

      if (!batch) {
        const err = new Error('Payment batch not found.');
        err.statusCode = 404;
        throw err;
      }

      const eligibleRecords = batch.records.filter(
        (r) => r.status === 'PROCESSING' || r.status === 'PENDING'
      );

      if (eligibleRecords.length === 0) {
        const err = new Error('Batch has no records eligible for initiation.');
        err.statusCode = 400;
        throw err;
      }

      const now = new Date();

      for (const record of eligibleRecords) {
        const simRef = `SIM-${batch.academicYear.replace('-', '')}-${Date.now().toString().slice(-4)}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

        await tx.paymentRecord.update({
          where: { id: record.id },
          data: {
            status: 'INITIATED',
            simulationReference: simRef,
          },
        });

        await tx.application.update({
          where: { id: record.applicationId },
          data: { status: 'PAYMENT_INITIATED' },
        });

        await tx.applicationAuditLog.create({
          data: {
            applicationId: record.applicationId,
            actorUserId,
            actorRole: 'ADMIN',
            action: 'PAYMENT_SIMULATION_INITIATED',
            previousStatus: 'PAYMENT_PROCESSING',
            newStatus: 'PAYMENT_INITIATED',
            remarks: `Administrative payment simulation initiated with Simulation Reference: ${simRef}.`,
          },
        });

        if (record.application?.student?.user?.id) {
          await tx.notification.create({
            data: {
              userId: record.application.student.user.id,
              title: 'Scholarship Payment Processing Initiated',
              message: `Your scholarship payment simulation has been initiated. Simulation Reference: ${simRef}.`,
              category: 'PAYMENT',
              actionUrl: `/applications/${record.applicationId}/tracking`,
            },
          });
        }
      }

      // Update batch initiated timestamp
      return tx.paymentBatch.update({
        where: { id: batchId },
        data: {
          status: 'PROCESSING',
          initiatedAt: batch.initiatedAt || now,
        },
        include: {
          department: true,
          records: true,
        },
      });
    });
  }

  /**
   * Transactionally marks eligible records in a batch as DISBURSED,
   * updates applications to DISBURSED, and derives batch status consistently.
   */
  async disburseBatchSimulation(batchId, actorUserId) {
    return prisma.$transaction(async (tx) => {
      const batch = await tx.paymentBatch.findUnique({
        where: { id: batchId },
        include: {
          records: {
            include: {
              application: {
                include: {
                  student: { include: { user: true } },
                },
              },
            },
          },
        },
      });

      if (!batch) {
        const err = new Error('Payment batch not found.');
        err.statusCode = 404;
        throw err;
      }

      const eligibleRecords = batch.records.filter(
        (r) => r.status === 'INITIATED' || r.status === 'PROCESSING'
      );

      if (eligibleRecords.length === 0) {
        const err = new Error('Batch has no records eligible for disbursement.');
        err.statusCode = 400;
        throw err;
      }

      const now = new Date();

      for (const record of eligibleRecords) {
        await tx.paymentRecord.update({
          where: { id: record.id },
          data: {
            status: 'DISBURSED',
            disbursedAt: now,
          },
        });

        const prevAppStatus = record.application.status;
        await tx.application.update({
          where: { id: record.applicationId },
          data: { status: 'DISBURSED' },
        });

        await tx.applicationAuditLog.create({
          data: {
            applicationId: record.applicationId,
            actorUserId,
            actorRole: 'ADMIN',
            action: 'PAYMENT_DISBURSED',
            previousStatus: prevAppStatus,
            newStatus: 'DISBURSED',
            remarks: `Scholarship benefit recorded as disbursed in administrative payment simulation. Reference: ${record.simulationReference || 'N/A'}.`,
          },
        });

        if (record.application?.student?.user?.id) {
          await tx.notification.create({
            data: {
              userId: record.application.student.user.id,
              title: 'Scholarship Benefit Disbursed (Simulated)',
              message: `Your scholarship benefit has been recorded as disbursed (Simulated). Reference: ${record.simulationReference || 'N/A'}.`,
              category: 'PAYMENT',
              actionUrl: `/applications/${record.applicationId}/tracking`,
            },
          });
        }
      }

      // Re-query all records of the batch to evaluate batch status consistently
      const allRecords = await tx.paymentRecord.findMany({
        where: { batchId },
        select: { status: true },
      });

      const total = allRecords.length;
      const disbursedCount = allRecords.filter((r) => r.status === 'DISBURSED').length;
      const undisbursedCount = allRecords.filter((r) => r.status === 'UNDISBURSED').length;

      let newBatchStatus = 'PROCESSING';
      let disbursedAt = null;

      if (disbursedCount === total && total > 0) {
        newBatchStatus = 'DISBURSED';
        disbursedAt = now;
      } else if (undisbursedCount === total && total > 0) {
        newBatchStatus = 'FAILED';
      }

      return tx.paymentBatch.update({
        where: { id: batchId },
        data: {
          status: newBatchStatus,
          disbursedAt: disbursedAt || batch.disbursedAt,
        },
        include: {
          department: true,
          records: true,
        },
      });
    });
  }

  /**
   * Transactionally marks an individual payment record as UNDISBURSED with a neutral
   * simulated exception reason, updates application to UNDISBURSED, records audit log,
   * and derives batch status consistently without blindly marking the batch disbursed.
   */
  async failPaymentRecordSimulation(recordId, failureReason, actorUserId) {
    return prisma.$transaction(async (tx) => {
      const record = await tx.paymentRecord.findUnique({
        where: { id: recordId },
        include: {
          application: {
            include: {
              student: { include: { user: true } },
            },
          },
          batch: true,
        },
      });

      if (!record) {
        const err = new Error('Payment record not found.');
        err.statusCode = 404;
        throw err;
      }

      if (!['PROCESSING', 'INITIATED'].includes(record.status)) {
        const err = new Error(
          `Record cannot be marked undisbursed from status: ${record.status}. Only PROCESSING or INITIATED records can encounter exceptions.`
        );
        err.statusCode = 400;
        throw err;
      }

      const prevAppStatus = record.application.status;

      // 1. Update PaymentRecord
      const updatedRecord = await tx.paymentRecord.update({
        where: { id: recordId },
        data: {
          status: 'UNDISBURSED',
          failureReason,
        },
      });

      // 2. Update Application status
      await tx.application.update({
        where: { id: record.applicationId },
        data: { status: 'UNDISBURSED' },
      });

      // 3. Write ApplicationAuditLog
      await tx.applicationAuditLog.create({
        data: {
          applicationId: record.applicationId,
          actorUserId,
          actorRole: 'ADMIN',
          action: 'PAYMENT_UNDISBURSED',
          previousStatus: prevAppStatus,
          newStatus: 'UNDISBURSED',
          remarks: `Administrative payment simulation exception: ${failureReason}.`,
        },
      });

      // 4. Send Student Notification
      if (record.application?.student?.user?.id) {
        await tx.notification.create({
          data: {
            userId: record.application.student.user.id,
            title: 'Action Required: Simulated Disbursement Exception',
            message: `Simulated disbursement could not be completed: ${failureReason}.`,
            category: 'PAYMENT',
            actionUrl: `/applications/${record.applicationId}/tracking`,
          },
        });
      }

      // 5. Update batch state consistently if record belongs to a batch
      if (record.batchId) {
        const allRecords = await tx.paymentRecord.findMany({
          where: { batchId: record.batchId },
          select: { status: true },
        });

        const total = allRecords.length;
        const disbursedCount = allRecords.filter((r) => r.status === 'DISBURSED').length;
        const undisbursedCount = allRecords.filter((r) => r.status === 'UNDISBURSED').length;

        let newBatchStatus = 'PROCESSING';
        if (disbursedCount === total && total > 0) {
          newBatchStatus = 'DISBURSED';
        } else if (undisbursedCount === total && total > 0) {
          newBatchStatus = 'FAILED';
        }

        await tx.paymentBatch.update({
          where: { id: record.batchId },
          data: { status: newBatchStatus },
        });
      }

      return updatedRecord;
    });
  }
}

module.exports = new PaymentRepository();
