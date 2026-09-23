const { prisma } = require('../src/config/prisma');
const bcrypt = require('bcryptjs');

const BASE_URL = 'http://localhost:5000/api';

async function makeRequest(endpoint, options = {}, cookie = null) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (cookie) {
    headers['Cookie'] = cookie;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const responseCookie = response.headers.get('set-cookie');
  let body = null;
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    body = await response.json();
  } else {
    body = await response.text();
  }

  return {
    status: response.status,
    headers: response.headers,
    cookie: responseCookie ? responseCookie.split(';')[0] : cookie,
    body,
  };
}

function expect(actual) {
  return {
    toBe(expected) {
      if (actual !== expected) {
        throw new Error(`Expected ${JSON.stringify(expected)} but received ${JSON.stringify(actual)}`);
      }
    },
    toBeGreaterThanOrEqual(expected) {
      if (actual < expected) {
        throw new Error(`Expected >= ${expected} but received ${actual}`);
      }
    },
    toBeTruthy() {
      if (!actual) {
        throw new Error(`Expected truthy value but received ${JSON.stringify(actual)}`);
      }
    },
    toBeFalsy() {
      if (actual) {
        throw new Error(`Expected falsy value but received ${JSON.stringify(actual)}`);
      }
    },
    toContain(expected) {
      if (typeof actual === 'string' && !actual.includes(expected)) {
        throw new Error(`Expected string to contain "${expected}", got: "${actual}"`);
      }
      if (Array.isArray(actual) && !actual.includes(expected)) {
        throw new Error(`Expected array to contain ${JSON.stringify(expected)}`);
      }
    },
  };
}

async function runTests() {
  console.log('================================================================');
  console.log('STARTING PHASE 9 ADMINISTRATIVE PAYMENT SIMULATION TEST SUITE');
  console.log('================================================================\n');

  let passedCount = 0;
  let failedCount = 0;

  async function test(name, fn) {
    try {
      await fn();
      passedCount++;
      console.log(`[PASS] ${name}`);
    } catch (err) {
      failedCount++;
      console.error(`[FAIL] ${name}: ${err.message}`);
      if (err.stack) console.error(err.stack);
    }
  }

  const ts = Date.now();

  // Test Entities
  let dept;
  let college;
  let sch;
  let adminUser, adminCookie;
  let studentUserA, studentCookieA, studentProfileA, appA;
  let studentUserB, studentCookieB, studentProfileB, appB;
  let studentUserC, studentCookieC, studentProfileC, appC;
  let studentUserD, studentCookieD, studentProfileD, appD; // For single-batch test
  let authorityUser, authorityCookie;
  let collegeUser, collegeCookie;
  let batch1, batch2;

  try {
    // 0. Setup test department, college, scholarship, and users
    console.log('[SETUP] Provisioning isolated test fixtures...');
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('Password@123', salt);

    dept = await prisma.department.create({
      data: {
        code: `TEST_DEPT_${ts.toString().slice(-4)}`,
        name: `Test Higher Edu Dept ${ts}`,
      },
    });

    college = await prisma.college.create({
      data: {
        code: `TEST_COL_${ts.toString().slice(-4)}`,
        name: `Test Polytechnic Institute ${ts}`,
        university: 'Test Pune University',
        district: 'Pune',
        taluka: 'Haveli',
      },
    });

    sch = await prisma.scholarship.create({
      data: {
        departmentId: dept.id,
        code: `TEST_SCH_${ts.toString().slice(-4)}`,
        name: `Test Post-Matric Tech Scholarship ${ts}`,
        description: 'Test scholarship description',
        benefitAmount: 25000.0,
        applicationStartDate: new Date('2024-01-01'),
        applicationEndDate: new Date('2026-12-31'),
        academicYear: '2024-2025',
        isActive: true,
      },
    });

    // Admin user
    adminUser = await prisma.user.create({
      data: {
        email: `test.admin.${ts}@test.ac.in`,
        passwordHash,
        role: 'ADMIN',
        isActive: true,
      },
    });

    // Authority user
    authorityUser = await prisma.user.create({
      data: {
        email: `test.auth.${ts}@test.ac.in`,
        passwordHash,
        role: 'AUTHORITY',
        departmentId: dept.id,
        isActive: true,
      },
    });

    // College user
    collegeUser = await prisma.user.create({
      data: {
        email: `test.clg.${ts}@test.ac.in`,
        passwordHash,
        role: 'COLLEGE',
        collegeId: college.id,
        isActive: true,
      },
    });

    // Student A
    studentUserA = await prisma.user.create({
      data: {
        email: `test.student.a.${ts}@test.ac.in`,
        passwordHash,
        role: 'STUDENT',
        isActive: true,
        studentProfile: {
          create: {
            fullName: `Student A Test ${ts}`,
            category: 'OPEN',
            annualFamilyIncome: 120000,
            collegeId: college.id,
            completionPercentage: 100,
          },
        },
      },
      include: { studentProfile: true },
    });
    studentProfileA = studentUserA.studentProfile;
    appA = await prisma.application.create({
      data: {
        applicationNumber: `APP-A-${ts.toString().slice(-6)}`,
        studentId: studentProfileA.id,
        scholarshipId: sch.id,
        academicYear: '2024-2025',
        status: 'APPROVED',
        submittedAt: new Date(),
      },
    });

    // Student B
    studentUserB = await prisma.user.create({
      data: {
        email: `test.student.b.${ts}@test.ac.in`,
        passwordHash,
        role: 'STUDENT',
        isActive: true,
        studentProfile: {
          create: {
            fullName: `Student B Test ${ts}`,
            category: 'OPEN',
            annualFamilyIncome: 130000,
            collegeId: college.id,
            completionPercentage: 100,
          },
        },
      },
      include: { studentProfile: true },
    });
    studentProfileB = studentUserB.studentProfile;
    appB = await prisma.application.create({
      data: {
        applicationNumber: `APP-B-${ts.toString().slice(-6)}`,
        studentId: studentProfileB.id,
        scholarshipId: sch.id,
        academicYear: '2024-2025',
        status: 'APPROVED',
        submittedAt: new Date(),
      },
    });

    // Student C
    studentUserC = await prisma.user.create({
      data: {
        email: `test.student.c.${ts}@test.ac.in`,
        passwordHash,
        role: 'STUDENT',
        isActive: true,
        studentProfile: {
          create: {
            fullName: `Student C Test ${ts}`,
            category: 'OPEN',
            annualFamilyIncome: 140000,
            collegeId: college.id,
            completionPercentage: 100,
          },
        },
      },
      include: { studentProfile: true },
    });
    studentProfileC = studentUserC.studentProfile;
    appC = await prisma.application.create({
      data: {
        applicationNumber: `APP-C-${ts.toString().slice(-6)}`,
        studentId: studentProfileC.id,
        scholarshipId: sch.id,
        academicYear: '2024-2025',
        status: 'APPROVED',
        submittedAt: new Date(),
      },
    });

    // Student D (Single batch test)
    studentUserD = await prisma.user.create({
      data: {
        email: `test.student.d.${ts}@test.ac.in`,
        passwordHash,
        role: 'STUDENT',
        isActive: true,
        studentProfile: {
          create: {
            fullName: `Student D Test ${ts}`,
            category: 'OPEN',
            annualFamilyIncome: 150000,
            collegeId: college.id,
            completionPercentage: 100,
          },
        },
      },
      include: { studentProfile: true },
    });
    studentProfileD = studentUserD.studentProfile;
    appD = await prisma.application.create({
      data: {
        applicationNumber: `APP-D-${ts.toString().slice(-6)}`,
        studentId: studentProfileD.id,
        scholarshipId: sch.id,
        academicYear: '2024-2025',
        status: 'APPROVED',
        submittedAt: new Date(),
      },
    });

    // Log in users to obtain session cookies
    console.log('[LOGIN] Logging in test users...');
    const adminRes = await makeRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: adminUser.email, password: 'Password@123' }),
    });
    adminCookie = adminRes.cookie;

    const studentARes = await makeRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: studentUserA.email, password: 'Password@123' }),
    });
    studentCookieA = studentARes.cookie;

    const studentBRes = await makeRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: studentUserB.email, password: 'Password@123' }),
    });
    studentCookieB = studentBRes.cookie;

    const authRes = await makeRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: authorityUser.email, password: 'Password@123' }),
    });
    authorityCookie = authRes.cookie;

    const clgRes = await makeRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: collegeUser.email, password: 'Password@123' }),
    });
    collegeCookie = clgRes.cookie;

    console.log('[LOGIN] All session cookies obtained successfully.\n');

    // -------------------------------------------------------------------------
    // TEST 1: Unauthenticated & Non-Admin Access Control
    // -------------------------------------------------------------------------
    await test('Security: Unauthenticated requests to /api/admin/payments/* return 401', async () => {
      const res = await makeRequest('/admin/payments/approved-applications');
      expect(res.status).toBe(401);
    });

    await test('Security: STUDENT role accessing /api/admin/payments/* returns 403', async () => {
      const res = await makeRequest('/admin/payments/approved-applications', {}, studentCookieA);
      expect(res.status).toBe(403);
    });

    await test('Security: COLLEGE role accessing /api/admin/payments/* returns 403', async () => {
      const res = await makeRequest('/admin/payments/approved-applications', {}, collegeCookie);
      expect(res.status).toBe(403);
    });

    await test('Security: AUTHORITY role accessing /api/admin/payments/* returns 403', async () => {
      const res = await makeRequest('/admin/payments/approved-applications', {}, authorityCookie);
      expect(res.status).toBe(403);
    });

    // -------------------------------------------------------------------------
    // TEST 2: ADMIN Access & Approved Applications Query
    // -------------------------------------------------------------------------
    await test('ADMIN can query approved applications awaiting batching (200 OK)', async () => {
      const res = await makeRequest('/admin/payments/approved-applications?departmentId=' + dept.id, {}, adminCookie);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.applications)).toBe(true);

      const foundAppIds = res.body.applications.map((a) => a.id);
      expect(foundAppIds.includes(appA.id)).toBe(true);
      expect(foundAppIds.includes(appB.id)).toBe(true);
      expect(foundAppIds.includes(appC.id)).toBe(true);
      expect(foundAppIds.includes(appD.id)).toBe(true);
    });

    // -------------------------------------------------------------------------
    // TEST 3: Precondition Validation when Creating Batches
    // -------------------------------------------------------------------------
    await test('Validation: Rejects batch creation missing departmentId or applicationIds (400)', async () => {
      const res1 = await makeRequest('/admin/payments/batches', {
        method: 'POST',
        body: JSON.stringify({ academicYear: '2024-2025', applicationIds: [appA.id] }),
      }, adminCookie);
      expect(res1.status).toBe(400);

      const res2 = await makeRequest('/admin/payments/batches', {
        method: 'POST',
        body: JSON.stringify({ departmentId: dept.id, academicYear: '2024-2025', applicationIds: [] }),
      }, adminCookie);
      expect(res2.status).toBe(400);
    });

    await test('Validation: Rejects unapproved application from entering payment batch (400)', async () => {
      // Create an application with status SUBMITTED
      const unapprovedApp = await prisma.application.create({
        data: {
          applicationNumber: `APP-UNAPP-${ts.toString().slice(-6)}`,
          studentId: studentProfileA.id,
          scholarshipId: sch.id,
          academicYear: '2023-2024',
          status: 'SUBMITTED',
          submittedAt: new Date(),
        },
      });

      try {
        const res = await makeRequest('/admin/payments/batches', {
          method: 'POST',
          body: JSON.stringify({
            departmentId: dept.id,
            academicYear: '2024-2025',
            applicationIds: [unapprovedApp.id],
          }),
        }, adminCookie);
        expect(res.status).toBe(400);
        expect(res.body.error).toContain('Only APPROVED applications can enter payment simulation');
      } finally {
        await prisma.application.delete({ where: { id: unapprovedApp.id } });
      }
    });

    // -------------------------------------------------------------------------
    // TEST 4: Batch Creation (3 Applications)
    // -------------------------------------------------------------------------
    await test('ADMIN creates batch with 3 approved applications (transitions to PAYMENT_PROCESSING)', async () => {
      const res = await makeRequest('/admin/payments/batches', {
        method: 'POST',
        body: JSON.stringify({
          departmentId: dept.id,
          academicYear: '2024-2025',
          applicationIds: [appA.id, appB.id, appC.id],
        }),
      }, adminCookie);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.batch).toBeTruthy();
      expect(res.body.batch.status).toBe('PROCESSING');
      expect(res.body.batch.totalApplications).toBe(3);
      expect(Number(res.body.batch.totalAmount)).toBe(75000); // 3 * 25000
      expect(res.body.batch.batchNumber.startsWith('BATCH-')).toBe(true);

      batch1 = res.body.batch;

      // Verify applications transitioned in DB
      const updatedApps = await prisma.application.findMany({
        where: { id: { in: [appA.id, appB.id, appC.id] } },
      });
      for (const a of updatedApps) {
        expect(a.status).toBe('PAYMENT_PROCESSING');
      }

      // Verify payment records created in DB
      const records = await prisma.paymentRecord.findMany({
        where: { batchId: batch1.id },
      });
      expect(records.length).toBe(3);
      for (const r of records) {
        expect(r.status).toBe('PROCESSING');
        expect(Number(r.amount)).toBe(25000);
      }

      // Verify audit logs created
      const auditLogs = await prisma.applicationAuditLog.findMany({
        where: { applicationId: { in: [appA.id, appB.id, appC.id] } },
      });
      expect(auditLogs.length).toBe(3);
      for (const log of auditLogs) {
        expect(log.action).toBe('PAYMENT_PROCESSING_STARTED');
        expect(log.actorRole).toBe('ADMIN');
      }

      // Verify student notifications created
      const notifs = await prisma.notification.findMany({
        where: { userId: { in: [studentUserA.id, studentUserB.id, studentUserC.id] } },
      });
      expect(notifs.length).toBe(3);
      for (const n of notifs) {
        expect(n.category).toBe('PAYMENT');
        expect(n.title).toBe('Scholarship Payment Batch Prepared');
      }
    });

    await test('Validation: Cannot re-batch an already batched application (400 or 409)', async () => {
      const res = await makeRequest('/admin/payments/batches', {
        method: 'POST',
        body: JSON.stringify({
          departmentId: dept.id,
          academicYear: '2024-2025',
          applicationIds: [appA.id],
        }),
      }, adminCookie);
      expect([400, 409].includes(res.status)).toBe(true);
    });

    // -------------------------------------------------------------------------
    // TEST 5: Batch Details & Pagination Query
    // -------------------------------------------------------------------------
    await test('ADMIN queries batch list and batch details by ID', async () => {
      const listRes = await makeRequest('/admin/payments/batches?departmentId=' + dept.id, {}, adminCookie);
      expect(listRes.status).toBe(200);
      expect(listRes.body.batches.some((b) => b.id === batch1.id)).toBe(true);

      const detailRes = await makeRequest(`/admin/payments/batches/${batch1.id}`, {}, adminCookie);
      expect(detailRes.status).toBe(200);
      expect(detailRes.body.batch.id).toBe(batch1.id);
      expect(detailRes.body.batch.records.length).toBe(3);
    });

    // -------------------------------------------------------------------------
    // TEST 6: Payment Simulation Initiation
    // -------------------------------------------------------------------------
    await test('ADMIN initiates payment simulation for batch (generates references, status PAYMENT_INITIATED)', async () => {
      const res = await makeRequest(`/admin/payments/batches/${batch1.id}/initiate`, {
        method: 'POST',
      }, adminCookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify PaymentRecords have simulation references and status INITIATED
      const records = await prisma.paymentRecord.findMany({
        where: { batchId: batch1.id },
      });
      for (const r of records) {
        expect(r.status).toBe('INITIATED');
        expect(r.simulationReference.startsWith('SIM-')).toBe(true);
      }

      // Verify applications transitioned to PAYMENT_INITIATED
      const apps = await prisma.application.findMany({
        where: { id: { in: [appA.id, appB.id, appC.id] } },
      });
      for (const a of apps) {
        expect(a.status).toBe('PAYMENT_INITIATED');
      }

      // Verify audit logs for initiation
      const auditLogs = await prisma.applicationAuditLog.findMany({
        where: {
          applicationId: { in: [appA.id, appB.id, appC.id] },
          action: 'PAYMENT_SIMULATION_INITIATED',
        },
      });
      expect(auditLogs.length).toBe(3);
    });

    // -------------------------------------------------------------------------
    // TEST 7: Simulated Exception Handling (Student B fails with neutral reason)
    // -------------------------------------------------------------------------
    await test('ADMIN records simulated exception for Student B record (User Correction #2 & #3)', async () => {
      // Find Student B's payment record
      const recordB = await prisma.paymentRecord.findFirst({
        where: { applicationId: appB.id },
      });
      expect(recordB).toBeTruthy();

      // Test with neutral simulation reason
      const failRes = await makeRequest(`/admin/payments/records/${recordB.id}/fail`, {
        method: 'POST',
        body: JSON.stringify({
          failureReason: 'Simulated disbursement exception',
        }),
      }, adminCookie);

      expect(failRes.status).toBe(200);
      expect(failRes.body.success).toBe(true);
      expect(failRes.body.record.status).toBe('UNDISBURSED');
      expect(failRes.body.record.failureReason).toBe('Simulated disbursement exception');

      // Verify Application B is UNDISBURSED
      const dbAppB = await prisma.application.findUnique({ where: { id: appB.id } });
      expect(dbAppB.status).toBe('UNDISBURSED');

      // Verify ApplicationAuditLog
      const logB = await prisma.applicationAuditLog.findFirst({
        where: { applicationId: appB.id, action: 'PAYMENT_UNDISBURSED' },
      });
      expect(logB).toBeTruthy();
      expect(logB.remarks).toContain('Simulated disbursement exception');

      // Verify Batch status remains PROCESSING (did not blindly become DISBURSED or FAILED)
      const dbBatch = await prisma.paymentBatch.findUnique({ where: { id: batch1.id } });
      expect(dbBatch.status).toBe('PROCESSING');
    });

    // -------------------------------------------------------------------------
    // TEST 8: Batch Disbursement Simulation with Mixed Outcome
    // -------------------------------------------------------------------------
    await test('ADMIN disburses batch: Student A & C disburse, Student B stays UNDISBURSED, Batch NOT marked DISBURSED', async () => {
      const disburseRes = await makeRequest(`/admin/payments/batches/${batch1.id}/disburse`, {
        method: 'POST',
      }, adminCookie);

      expect(disburseRes.status).toBe(200);
      expect(disburseRes.body.success).toBe(true);

      // Student A & C should be DISBURSED
      const dbAppA = await prisma.application.findUnique({ where: { id: appA.id } });
      const dbAppC = await prisma.application.findUnique({ where: { id: appC.id } });
      expect(dbAppA.status).toBe('DISBURSED');
      expect(dbAppC.status).toBe('DISBURSED');

      // Student B should remain UNDISBURSED
      const dbAppB = await prisma.application.findUnique({ where: { id: appB.id } });
      expect(dbAppB.status).toBe('UNDISBURSED');

      // PaymentRecords
      const recA = await prisma.paymentRecord.findFirst({ where: { applicationId: appA.id } });
      const recB = await prisma.paymentRecord.findFirst({ where: { applicationId: appB.id } });
      const recC = await prisma.paymentRecord.findFirst({ where: { applicationId: appC.id } });
      expect(recA.status).toBe('DISBURSED');
      expect(recA.disbursedAt).toBeTruthy();
      expect(recC.status).toBe('DISBURSED');
      expect(recC.disbursedAt).toBeTruthy();
      expect(recB.status).toBe('UNDISBURSED');

      // CRITICAL CORRECTION #3: Batch must NOT be blindly marked DISBURSED when a record failed!
      const dbBatch = await prisma.paymentBatch.findUnique({ where: { id: batch1.id } });
      expect(dbBatch.status).toBe('PROCESSING');
    });

    // -------------------------------------------------------------------------
    // TEST 9: Batch where 100% of records are DISBURSED -> Batch becomes DISBURSED
    // -------------------------------------------------------------------------
    await test('Clean batch where 100% of records are disbursed marks batch DISBURSED', async () => {
      // Create batch with Student D
      const createRes = await makeRequest('/admin/payments/batches', {
        method: 'POST',
        body: JSON.stringify({
          departmentId: dept.id,
          academicYear: '2024-2025',
          applicationIds: [appD.id],
        }),
      }, adminCookie);
      expect(createRes.status).toBe(201);
      batch2 = createRes.body.batch;

      // Initiate
      const initRes = await makeRequest(`/admin/payments/batches/${batch2.id}/initiate`, {
        method: 'POST',
      }, adminCookie);
      expect(initRes.status).toBe(200);

      // Disburse
      const disbRes = await makeRequest(`/admin/payments/batches/${batch2.id}/disburse`, {
        method: 'POST',
      }, adminCookie);
      expect(disbRes.status).toBe(200);

      // Since all records in batch2 succeeded, batch2 status must be DISBURSED
      const dbBatch2 = await prisma.paymentBatch.findUnique({ where: { id: batch2.id } });
      expect(dbBatch2.status).toBe('DISBURSED');
      expect(dbBatch2.disbursedAt).toBeTruthy();
    });

    // -------------------------------------------------------------------------
    // TEST 10: Student Tracking & Zero Bank Account Disclosure (User Correction #1)
    // -------------------------------------------------------------------------
    await test('Student A tracking returns payment details with ZERO bank-account info (User Correction #1)', async () => {
      const trackRes = await makeRequest(`/applications/${appA.id}/tracking`, {}, studentCookieA);
      expect(trackRes.status).toBe(200);
      expect(trackRes.body.tracking.status).toBe('DISBURSED');

      const payment = trackRes.body.tracking.payment;
      expect(payment).toBeTruthy();
      expect(payment.status).toBe('DISBURSED');
      expect(payment.amount).toBe(25000);
      expect(payment.simulationReference.startsWith('SIM-')).toBe(true);
      expect(payment.batchNumber.startsWith('BATCH-')).toBe(true);
      expect(payment.disbursedAt).toBeTruthy();
      expect(payment.failureReason).toBeFalsy();

      // Zero bank account info
      expect(payment.accountNumber).toBeFalsy();
      expect(payment.bankAccount).toBeFalsy();
      expect(payment.beneficiaryAccount).toBeFalsy();
      expect(payment.ifsc).toBeFalsy();
      expect(payment.bankName).toBeFalsy();
    });

    await test('Student B tracking shows UNDISBURSED status and neutral simulated exception reason', async () => {
      const trackRes = await makeRequest(`/applications/${appB.id}/tracking`, {}, studentCookieB);
      expect(trackRes.status).toBe(200);
      expect(trackRes.body.tracking.status).toBe('UNDISBURSED');

      const payment = trackRes.body.tracking.payment;
      expect(payment).toBeTruthy();
      expect(payment.status).toBe('UNDISBURSED');
      expect(payment.failureReason).toBe('Simulated disbursement exception');
      expect(payment.accountNumber).toBeFalsy();
      expect(payment.beneficiaryAccount).toBeFalsy();
    });

    // -------------------------------------------------------------------------
    // TEST 11: IDOR Protection on Student Tracking
    // -------------------------------------------------------------------------
    await test('Security / IDOR: Student B cannot inspect Student A application tracking (403 or 404)', async () => {
      const res = await makeRequest(`/applications/${appA.id}/tracking`, {}, studentCookieB);
      expect([403, 404].includes(res.status)).toBe(true);
    });

    // -------------------------------------------------------------------------
    // TEST 12: Audit Log Trail Integrity
    // -------------------------------------------------------------------------
    await test('Audit trail for Student A reflects complete immutable history backed by ApplicationAuditLog', async () => {
      const historyRes = await makeRequest(`/applications/${appA.id}/history`, {}, studentCookieA);
      expect(historyRes.status).toBe(200);
      expect(Array.isArray(historyRes.body.timeline)).toBe(true);

      const actions = historyRes.body.timeline.map((h) => h.action);
      expect(actions.includes('PAYMENT_PROCESSING_STARTED')).toBe(true);
      expect(actions.includes('PAYMENT_SIMULATION_INITIATED')).toBe(true);
      expect(actions.includes('PAYMENT_DISBURSED')).toBe(true);
    });

  } finally {
    // -------------------------------------------------------------------------
    // CLEANUP: 100% Self-Cleaning Isolated Teardown
    // -------------------------------------------------------------------------
    console.log('\n[CLEANUP] Tearing down isolated test fixtures...');
    try {
      const testAppIds = [appA?.id, appB?.id, appC?.id, appD?.id].filter(Boolean);
      const testBatchIds = [batch1?.id, batch2?.id].filter(Boolean);
      const testUserIds = [
        adminUser?.id,
        authorityUser?.id,
        collegeUser?.id,
        studentUserA?.id,
        studentUserB?.id,
        studentUserC?.id,
        studentUserD?.id,
      ].filter(Boolean);

      if (testAppIds.length > 0) {
        await prisma.applicationAuditLog.deleteMany({ where: { applicationId: { in: testAppIds } } });
        await prisma.paymentRecord.deleteMany({ where: { applicationId: { in: testAppIds } } });
        await prisma.application.deleteMany({ where: { id: { in: testAppIds } } });
      }

      if (testBatchIds.length > 0) {
        await prisma.paymentBatch.deleteMany({ where: { id: { in: testBatchIds } } });
      }

      if (testUserIds.length > 0) {
        await prisma.notification.deleteMany({ where: { userId: { in: testUserIds } } });
        await prisma.studentProfile.deleteMany({ where: { userId: { in: testUserIds } } });
        await prisma.user.deleteMany({ where: { id: { in: testUserIds } } });
      }

      if (sch?.id) await prisma.scholarship.deleteMany({ where: { id: sch.id } });
      if (college?.id) await prisma.college.deleteMany({ where: { id: college.id } });
      if (dept?.id) await prisma.department.deleteMany({ where: { id: dept.id } });

      console.log('[CLEANUP] Isolated test fixtures removed cleanly.');
    } catch (cleanupErr) {
      console.error('[CLEANUP ERROR]', cleanupErr);
    }
    await prisma.$disconnect();
  }

  console.log('\n================================================================');
  console.log(`PHASE 9 TEST SUITE COMPLETE: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('================================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTests();
