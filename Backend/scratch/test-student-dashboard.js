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
  console.log('STARTING STUDENT DASHBOARD TEST SUITE');
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

  // Test Fixture variables (isolated ephemeral data)
  let dept;
  let college;
  let scholarship;
  let studentUserA, studentCookieA, studentProfileA;
  let studentUserB, studentCookieB, studentProfileB;
  let collegeUser, collegeCookie;
  let authorityUser, authorityCookie;
  let adminUser, adminCookie;
  let appA, reviewA, correctionA, paymentBatchA, paymentRecordA;

  try {
    console.log('[SETUP] Provisioning isolated test fixtures...');
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('Test@1234', salt);

    // 1. Department
    dept = await prisma.department.create({
      data: {
        code: `TST-DASH-DPT-${ts}`,
        name: `Test Dashboard Department ${ts}`,
        description: 'Temporary department for dashboard tests',
        isActive: true,
      },
    });

    // 2. Dedicated College
    college = await prisma.college.create({
      data: {
        code: `TST-DASH-COL-${ts}`,
        name: `Test Dashboard College ${ts}`,
        university: 'Test University',
        district: 'Pune',
        taluka: 'Haveli',
        isActive: true,
      },
    });

    // 3. Scholarship
    scholarship = await prisma.scholarship.create({
      data: {
        code: `TST-SCH-${ts}`,
        departmentId: dept.id,
        name: `Test Dashboard Scholarship ${ts}`,
        description: 'Dashboard test scheme',
        academicYear: '2024-2025',
        benefitAmount: 20000.0,
        applicationStartDate: new Date(Date.now() - 86400000),
        applicationEndDate: new Date(Date.now() + 86400000 * 30),
        isActive: true,
        isFreshAllowed: true,
        isRenewalAllowed: true,
      },
    });

    // 4. Student A (Has profile, application, correction, payment)
    studentUserA = await prisma.user.create({
      data: {
        email: `student.a.${ts}@dashboard.test`,
        passwordHash,
        role: 'STUDENT',
        isActive: true,
      },
    });

    studentProfileA = await prisma.studentProfile.create({
      data: {
        userId: studentUserA.id,
        fullName: `Student Alpha ${ts}`,
        dob: new Date('2002-05-15'),
        gender: 'MALE',
        category: 'OBC',
        mobile: '9876543210',
        address: '123 Test Street',
        state: 'Maharashtra',
        district: 'Pune',
        taluka: 'Haveli',
        cityVillage: 'Pune',
        pincode: '411001',
        collegeId: college.id,
        courseName: 'Computer Engineering',
        courseYear: 2,
        admissionYear: 2023,
        previousQualification: 'HSC',
        previousPercentage: 85.5,
        guardianName: 'Guardian Alpha',
        annualFamilyIncome: 180000,
        bankAccountNo: '123456789012',
        bankIfsc: 'SBIN0001234',
        bankName: 'State Bank of India',
        completionPercentage: 100,
      },
    });

    // Create a document for Student A
    const docA = await prisma.document.create({
      data: {
        studentId: studentProfileA.id,
        documentType: 'INCOME_CERT',
        status: 'AVAILABLE',
        versions: {
          create: {
            versionNumber: 1,
            originalFilename: 'income_certificate.pdf',
            storagePath: `storage/test/income_${ts}.pdf`,
            fileSizeBytes: 50000,
            mimeType: 'application/pdf',
            isCompressed: false,
          },
        },
      },
    });

    // 5. Student B (Brand new student: No profile, no apps, no docs, no activity)
    studentUserB = await prisma.user.create({
      data: {
        email: `student.b.${ts}@dashboard.test`,
        passwordHash,
        role: 'STUDENT',
        isActive: true,
      },
    });

    // 6. Non-student roles
    collegeUser = await prisma.user.create({
      data: {
        email: `college.${ts}@dashboard.test`,
        passwordHash,
        role: 'COLLEGE',
        collegeId: college.id,
        isActive: true,
      },
    });

    authorityUser = await prisma.user.create({
      data: {
        email: `authority.${ts}@dashboard.test`,
        passwordHash,
        role: 'AUTHORITY',
        departmentId: dept.id,
        isActive: true,
      },
    });

    adminUser = await prisma.user.create({
      data: {
        email: `admin.${ts}@dashboard.test`,
        passwordHash,
        role: 'ADMIN',
        isActive: true,
      },
    });

    // Create Application for Student A in COLLEGE_SENT_BACK state
    appA = await prisma.application.create({
      data: {
        studentId: studentProfileA.id,
        scholarshipId: scholarship.id,
        academicYear: '2024-2025',
        applicationNumber: `MHA-20242025-${String(ts).slice(-6)}`,
        status: 'COLLEGE_SENT_BACK',
        submittedAt: new Date(Date.now() - 3600000),
      },
    });

    // Create Review on appA
    reviewA = await prisma.applicationReview.create({
      data: {
        applicationId: appA.id,
        cycleNumber: 1,
        reviewerUserId: collegeUser.id,
        reviewerRole: 'COLLEGE',
        decision: 'SEND_BACK',
        checklistJson: {},
        overallRemarks: 'Income certificate is blurred, please re-upload clear copy.',
      },
    });

    // Create correction request on appA
    correctionA = await prisma.applicationCorrectionRequest.create({
      data: {
        applicationId: appA.id,
        reviewId: reviewA.id,
        cycleNumber: 1,
        reviewerRole: 'COLLEGE',
        affectedSection: 'DOCUMENT',
        affectedDocumentType: 'INCOME_CERT',
        rejectionCategory: 'UNREADABLE_DOCUMENT',
        reasonText: 'Income certificate is blurred, please re-upload clear copy.',
        actionRequiredText: 'Upload a legible income certificate.',
        status: 'OPEN',
      },
    });

    // Create Audit Log on appA
    await prisma.applicationAuditLog.create({
      data: {
        applicationId: appA.id,
        actorUserId: studentUserA.id,
        actorRole: 'STUDENT',
        action: 'APPLICATION_SUBMITTED',
        previousStatus: 'DRAFT',
        newStatus: 'SUBMITTED',
        remarks: 'Application submitted by student',
      },
    });
    await prisma.applicationAuditLog.create({
      data: {
        applicationId: appA.id,
        actorUserId: studentUserA.id,
        actorRole: 'COLLEGE',
        action: 'COLLEGE_SENT_BACK',
        previousStatus: 'UNDER_COLLEGE_REVIEW',
        newStatus: 'COLLEGE_SENT_BACK',
        remarks: 'Income certificate needs clear scan',
      },
    });

    // Payment simulation record on appA
    paymentBatchA = await prisma.paymentBatch.create({
      data: {
        departmentId: dept.id,
        academicYear: '2024-2025',
        batchNumber: `BATCH-DASH-${ts}`,
        status: 'PROCESSING',
      },
    });

    paymentRecordA = await prisma.paymentRecord.create({
      data: {
        batchId: paymentBatchA.id,
        applicationId: appA.id,
        studentId: studentProfileA.id,
        amount: 20000.0,
        status: 'PROCESSING',
        simulationReference: `SIM-20242025-${String(ts).slice(-4)}`,
      },
    });

    // Login users
    console.log('[LOGIN] Authenticating test users...');
    const resLoginA = await makeRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: studentUserA.email, password: 'Test@1234' }),
    });
    studentCookieA = resLoginA.cookie;

    const resLoginB = await makeRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: studentUserB.email, password: 'Test@1234' }),
    });
    studentCookieB = resLoginB.cookie;

    const resLoginCol = await makeRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: collegeUser.email, password: 'Test@1234' }),
    });
    collegeCookie = resLoginCol.cookie;

    const resLoginAuth = await makeRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: authorityUser.email, password: 'Test@1234' }),
    });
    authorityCookie = resLoginAuth.cookie;

    const resLoginAdm = await makeRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: adminUser.email, password: 'Test@1234' }),
    });
    adminCookie = resLoginAdm.cookie;

    console.log('[LOGIN] All session cookies obtained successfully.\n');

    // =========================================================================
    // TEST CASES
    // =========================================================================

    // Test 1: Authenticated student can load dashboard
    await test('1. Authenticated student can load dashboard (200 OK)', async () => {
      const res = await makeRequest('/student/dashboard', {}, studentCookieA);
      if (res.status !== 200) {
        console.error('[DEBUG 500 ERROR]', res.status, JSON.stringify(res.body, null, 2));
      }
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.student).toBeTruthy();
    });

    // Test 2: Unauthenticated user cannot access dashboard
    await test('2. Unauthenticated request to /api/student/dashboard returns 401', async () => {
      const res = await makeRequest('/student/dashboard', {});
      expect(res.status).toBe(401);
    });

    // Test 3: Student sees their own profile completion
    await test('3. Student A sees their own profile completion percentage (100%)', async () => {
      const res = await makeRequest('/student/dashboard', {}, studentCookieA);
      expect(res.status).toBe(200);
      expect(res.body.profile.completionPercentage).toBe(100);
      expect(res.body.profile.sections.personal).toBe(20);
      expect(res.body.profile.sections.academic).toBe(20);
    });

    // Test 4: Student sees their own application overview
    await test('4. Student sees their own active application (ARN, scheme, status)', async () => {
      const res = await makeRequest('/student/dashboard', {}, studentCookieA);
      expect(res.status).toBe(200);
      expect(res.body.activeApplication).toBeTruthy();
      expect(res.body.activeApplication.applicationNumber).toBe(appA.applicationNumber);
      expect(res.body.activeApplication.status).toBe('COLLEGE_SENT_BACK');
      expect(res.body.activeApplication.statusMeta).toBeTruthy();
      expect(res.body.activeApplication.statusMeta.stage).toBe('College Scrutiny');
    });

    // Test 5: Student sees open correction/action-required data
    await test('5. Student sees open action-required correction requests', async () => {
      const res = await makeRequest('/student/dashboard', {}, studentCookieA);
      expect(res.status).toBe(200);
      expect(res.body.actionRequired.count).toBe(1);
      expect(res.body.actionRequired.items.length).toBe(1);
      expect(res.body.actionRequired.items[0].reasonText).toContain('Income certificate is blurred');
      expect(res.body.actionRequired.items[0].applicationNumber).toBe(appA.applicationNumber);
    });

    // Test 6: Student with no application gets correct empty state
    await test('6. Student B (no applications) gets activeApplication: null and count: 0', async () => {
      const res = await makeRequest('/student/dashboard', {}, studentCookieB);
      expect(res.status).toBe(200);
      expect(res.body.activeApplication).toBe(null);
      expect(res.body.totalApplicationsCount).toBe(0);
    });

    // Test 7: Student with no corrections gets correct empty state
    await test('7. Student B gets actionRequired count: 0 and items: []', async () => {
      const res = await makeRequest('/student/dashboard', {}, studentCookieB);
      expect(res.status).toBe(200);
      expect(res.body.actionRequired.count).toBe(0);
      expect(res.body.actionRequired.items.length).toBe(0);
    });

    // Test 8: Student with no documents gets correct empty state
    await test('8. Student B gets documents uploadedCount: 0', async () => {
      const res = await makeRequest('/student/dashboard', {}, studentCookieB);
      expect(res.status).toBe(200);
      expect(res.body.documents.uploadedCount).toBe(0);
    });

    // Test 9: Recent activity comes only from persisted data
    await test('9. Recent activity comes strictly from persisted ApplicationAuditLog', async () => {
      const res = await makeRequest('/student/dashboard', {}, studentCookieA);
      expect(res.status).toBe(200);
      expect(res.body.recentActivity.length).toBe(2);
      expect(res.body.recentActivity[0].newStatus).toBe('COLLEGE_SENT_BACK');
      expect(res.body.recentActivity[1].newStatus).toBe('SUBMITTED');

      // Student B has 0 activity events
      const resB = await makeRequest('/student/dashboard', {}, studentCookieB);
      expect(resB.body.recentActivity.length).toBe(0);
    });

    // Test 10: Payment summary uses existing simulation data
    await test('10. Payment summary reflects simulated payment record (with zero bank claims)', async () => {
      const res = await makeRequest('/student/dashboard', {}, studentCookieA);
      expect(res.status).toBe(200);
      expect(res.body.payment).toBeTruthy();
      expect(res.body.payment.status).toBe('PROCESSING');
      expect(res.body.payment.simulationReference).toContain('SIM-20242025-');
      expect(res.body.payment.batchNumber).toBe(paymentBatchA.batchNumber);
      // Zero bank account numbers exposed in payment summary
      expect(res.body.payment.bankAccountNo).toBeFalsy();
    });

    // Test 11: IDOR Defense — Another student's data cannot appear
    await test('11. IDOR Defense: Student B cannot see Student A application, documents or corrections', async () => {
      const resB = await makeRequest('/student/dashboard', {}, studentCookieB);
      expect(resB.status).toBe(200);
      expect(resB.body.activeApplication).toBe(null);
      expect(resB.body.actionRequired.count).toBe(0);
      expect(resB.body.documents.uploadedCount).toBe(0);
      expect(resB.body.recentActivity.length).toBe(0);
    });

    // Test 12: College cannot access Student dashboard endpoint
    await test('12. COLLEGE role accessing /api/student/dashboard returns 403 Forbidden', async () => {
      const res = await makeRequest('/student/dashboard', {}, collegeCookie);
      expect(res.status).toBe(403);
    });

    // Test 13: Authority cannot access Student dashboard endpoint
    await test('13. AUTHORITY role accessing /api/student/dashboard returns 403 Forbidden', async () => {
      const res = await makeRequest('/student/dashboard', {}, authorityCookie);
      expect(res.status).toBe(403);
    });

    // Test 14: Admin cannot access Student dashboard endpoint
    await test('14. ADMIN role accessing /api/student/dashboard returns 403 Forbidden', async () => {
      const res = await makeRequest('/student/dashboard', {}, adminCookie);
      expect(res.status).toBe(403);
    });

    // Test 15: Existing Student workflows still work
    await test('15. Existing Student endpoints (/profile, /scholarships, /documents) continue working seamlessly', async () => {
      const resProfile = await makeRequest('/student/profile', {}, studentCookieA);
      expect(resProfile.status).toBe(200);
      expect(resProfile.body.profile.fullName).toBe(`Student Alpha ${ts}`);

      const resDocs = await makeRequest('/documents', {}, studentCookieA);
      expect(resDocs.status).toBe(200);
      expect(resDocs.body.documents.length).toBe(1);

      const resApps = await makeRequest('/applications', {}, studentCookieA);
      expect(resApps.status).toBe(200);
      expect(resApps.body.applications.length).toBe(1);
    });

  } finally {
    console.log('\n[CLEANUP] Tearing down isolated test fixtures...');
    try {
      if (paymentRecordA) {
        await prisma.paymentRecord.deleteMany({ where: { id: paymentRecordA.id } });
      }
      if (paymentBatchA) {
        await prisma.paymentBatch.deleteMany({ where: { id: paymentBatchA.id } });
      }
      if (correctionA) {
        await prisma.applicationCorrectionRequest.deleteMany({ where: { id: correctionA.id } });
      }
      if (reviewA) {
        await prisma.applicationReview.deleteMany({ where: { id: reviewA.id } });
      }
      if (appA) {
        await prisma.applicationAuditLog.deleteMany({ where: { applicationId: appA.id } });
        await prisma.application.deleteMany({ where: { id: appA.id } });
      }
      if (studentProfileA) {
        await prisma.documentVersion.deleteMany({ where: { document: { studentId: studentProfileA.id } } });
        await prisma.document.deleteMany({ where: { studentId: studentProfileA.id } });
        await prisma.studentProfile.deleteMany({ where: { id: studentProfileA.id } });
      }
      if (studentProfileB) {
        await prisma.studentProfile.deleteMany({ where: { id: studentProfileB.id } });
      }
      if (studentUserA) {
        await prisma.user.deleteMany({ where: { id: studentUserA.id } });
      }
      if (studentUserB) {
        await prisma.user.deleteMany({ where: { id: studentUserB.id } });
      }
      if (collegeUser) {
        await prisma.user.deleteMany({ where: { id: collegeUser.id } });
      }
      if (authorityUser) {
        await prisma.user.deleteMany({ where: { id: authorityUser.id } });
      }
      if (adminUser) {
        await prisma.user.deleteMany({ where: { id: adminUser.id } });
      }
      if (scholarship) {
        await prisma.scholarship.deleteMany({ where: { id: scholarship.id } });
      }
      if (college) {
        await prisma.college.deleteMany({ where: { id: college.id } });
      }
      if (dept) {
        await prisma.department.deleteMany({ where: { id: dept.id } });
      }
      console.log('[CLEANUP] Isolated test fixtures removed cleanly.');
    } catch (cleanupErr) {
      console.warn('[WARN] Cleanup error:', cleanupErr.message);
    }
  }

  console.log('\n================================================================');
  console.log(`STUDENT DASHBOARD TEST SUITE COMPLETE: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('================================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTests()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
