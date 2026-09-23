const assert = require('assert');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const config = require('../src/config/env');
const { prisma } = require('../src/config/prisma');

const BASE_URL = 'http://localhost:5000/api';

function expect(val) {
  return {
    toBe(expected) {
      assert.strictEqual(val, expected, `Expected ${JSON.stringify(expected)} but received ${JSON.stringify(val)}`);
    },
    toBeTruthy() {
      assert(!!val, `Expected truthy value but received ${JSON.stringify(val)}`);
    },
    toBeFalsy() {
      assert(!val, `Expected falsy value but received ${JSON.stringify(val)}`);
    },
    toContain(substr) {
      assert(
        typeof val === 'string' && val.includes(substr),
        `Expected string to contain "${substr}" but received "${val}"`
      );
    },
  };
}

async function makeRequest(endpoint, options = {}, cookie = '') {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(cookie ? { Cookie: cookie } : {}),
    ...(options.headers || {}),
  };

  const res = await fetch(url, { ...options, headers });
  let body = null;
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    body = await res.json().catch(() => null);
  } else {
    body = await res.text().catch(() => null);
  }

  return {
    status: res.status,
    headers: res.headers,
    body,
    cookie: res.headers.get('set-cookie') ? res.headers.get('set-cookie').split(';')[0] : '',
  };
}

async function runPhase7Tests() {
  console.log('====================================================');
  console.log('STARTING PHASE 7 ACTUAL COLLEGE PANEL TEST SUITE');
  console.log('====================================================\n');

  let passedCount = 0;
  let failedCount = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log(`[PASS] ${name}`);
      passedCount++;
    } catch (err) {
      console.error(`[FAIL] ${name}`);
      console.error(`       Error: ${err.message}`);
      failedCount++;
    }
  }

  const ts = Date.now();
  const hashedPassword = await bcrypt.hash('Password@123', 10);

  // Entities to seed
  let collegeA = null;
  let collegeB = null;
  let userCollegeA = null;
  let userCollegeB = null;
  let userStudentA = null;
  let userStudentB = null;
  let userAdmin = null;

  let cookieCollegeA = '';
  let cookieCollegeB = '';
  let cookieStudentA = '';
  let cookieStudentB = '';
  let cookieAdmin = '';

  let scholarship = null;
  let appA = null;
  let appB = null;
  let appARejectionTest = null;

  let incomeDocVersion1 = null;
  let incomeDocVersion2 = null;
  let casteDocVersion1 = null;
  let marksheetDocVersion1 = null;
  let domicileDocVersion1 = null;

  try {
  // ---------------------------------------------------------------------------
  // SETUP: COLLEGES, USERS, DOCUMENTS & APPLICATIONS
  // ---------------------------------------------------------------------------
  await test('Setup: Create Distinct Colleges (College A & College B) and Active Scholarship', async () => {
    collegeA = await prisma.college.create({
      data: {
        code: `COEP_${ts}`,
        name: `College of Engineering Pune ${ts}`,
        university: 'Savitribai Phule Pune University',
        district: 'Pune',
        taluka: 'Shivajinagar',
      },
    });
    expect(collegeA).toBeTruthy();

    collegeB = await prisma.college.create({
      data: {
        code: `VJTI_${ts}`,
        name: `Veermata Jijabai Technological Institute ${ts}`,
        university: 'University of Mumbai',
        district: 'Mumbai City',
        taluka: 'Matunga',
      },
    });
    expect(collegeB).toBeTruthy();

    scholarship = await prisma.scholarship.findFirst({
      where: { code: 'SJD-SC-001', isActive: true },
      include: { department: true, requiredDocuments: true },
    });
    expect(scholarship).toBeTruthy();
  });

  await test('Setup: Create & Authenticate Users (College A, College B, Student A, Student B, Admin)', async () => {
    // 1. College Officer A
    userCollegeA = await prisma.user.create({
      data: {
        email: `officer_a_${ts}@coep.ac.in`,
        passwordHash: hashedPassword,
        role: 'COLLEGE',
        collegeId: collegeA.id,
        isActive: true,
      },
    });
    const tokenCollegeA = jwt.sign({ id: userCollegeA.id, role: 'COLLEGE' }, config.jwtSecret, { expiresIn: '2h' });
    cookieCollegeA = `token=${tokenCollegeA}`;

    // 2. College Officer B
    userCollegeB = await prisma.user.create({
      data: {
        email: `officer_b_${ts}@vjti.ac.in`,
        passwordHash: hashedPassword,
        role: 'COLLEGE',
        collegeId: collegeB.id,
        isActive: true,
      },
    });
    const tokenCollegeB = jwt.sign({ id: userCollegeB.id, role: 'COLLEGE' }, config.jwtSecret, { expiresIn: '2h' });
    cookieCollegeB = `token=${tokenCollegeB}`;

    // 3. Admin User
    userAdmin = await prisma.user.create({
      data: {
        email: `admin_${ts}@maharashtra.gov.in`,
        passwordHash: hashedPassword,
        role: 'ADMIN',
        isActive: true,
      },
    });
    const tokenAdmin = jwt.sign({ id: userAdmin.id, role: 'ADMIN' }, config.jwtSecret, { expiresIn: '2h' });
    cookieAdmin = `token=${tokenAdmin}`;

    // 4. Student A (Enrolled in College A)
    const regResA = await makeRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email: `student_a_${ts}@test.ac.in`, password: 'Password@123', confirmPassword: 'Password@123' }),
    });
    expect(regResA.status).toBe(201);
    userStudentA = regResA.body.user;

    const loginResA = await makeRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: `student_a_${ts}@test.ac.in`, password: 'Password@123' }),
    });
    expect(loginResA.status).toBe(200);
    cookieStudentA = loginResA.cookie;

    await makeRequest('/student/profile', {
      method: 'PUT',
      body: JSON.stringify({
        fullName: 'Student Alpha',
        dob: '2003-06-20',
        gender: 'MALE',
        category: 'SC',
        religion: 'HINDU',
        mobile: '9876543210',
        annualFamilyIncome: 150000,
        collegeId: collegeA.id, // College A!
        courseName: 'Bachelor of Technology in Computer Engineering',
        courseYear: 2,
        admissionYear: 2024,
        previousQualification: 'HSC',
        previousPercentage: 78.5,
        bankAccountNo: '112233445566',
        bankIfsc: 'SBIN0001234',
        bankName: 'State Bank of India',
        state: 'Maharashtra',
        district: 'Pune',
      }),
    }, cookieStudentA);

    // 5. Student B (Enrolled in College B)
    const regResB = await makeRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email: `student_b_${ts}@test.ac.in`, password: 'Password@123', confirmPassword: 'Password@123' }),
    });
    expect(regResB.status).toBe(201);
    userStudentB = regResB.body.user;

    const loginResB = await makeRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: `student_b_${ts}@test.ac.in`, password: 'Password@123' }),
    });
    expect(loginResB.status).toBe(200);
    cookieStudentB = loginResB.cookie;

    await makeRequest('/student/profile', {
      method: 'PUT',
      body: JSON.stringify({
        fullName: 'Student Beta',
        dob: '2003-08-14',
        gender: 'FEMALE',
        category: 'SC',
        religion: 'HINDU',
        mobile: '9876543211',
        annualFamilyIncome: 160000,
        collegeId: collegeB.id, // College B!
        courseName: 'Bachelor of Technology in Information Technology',
        courseYear: 2,
        admissionYear: 2024,
        previousQualification: 'HSC',
        previousPercentage: 82.0,
        bankAccountNo: '998877665544',
        bankIfsc: 'MAHB0000123',
        bankName: 'Bank of Maharashtra',
        state: 'Maharashtra',
        district: 'Mumbai City',
      }),
    }, cookieStudentB);
  });

  await test('Setup: Seed Document Vault & Submit Application A (College A) and Application B (College B)', async () => {
    // Physical dummy file for streaming tests
    const dummyPdfDir = path.resolve('storage/documents');
    await fs.promises.mkdir(dummyPdfDir, { recursive: true });
    const dummyPdfPath = path.join(dummyPdfDir, `test_cert_${ts}.pdf`);
    await fs.promises.writeFile(dummyPdfPath, '%PDF-1.4 dummy pdf content for testing stream');

    const profA = await prisma.studentProfile.findUnique({ where: { userId: userStudentA.id } });
    const profB = await prisma.studentProfile.findUnique({ where: { userId: userStudentB.id } });

    // Seed 4 mandatory documents for Student A
    const incomeDocA = await prisma.document.create({ data: { studentId: profA.id, documentType: 'INCOME_CERT' } });
    incomeDocVersion1 = await prisma.documentVersion.create({
      data: {
        documentId: incomeDocA.id,
        versionNumber: 1,
        originalFilename: 'income_cert_2024.pdf',
        storagePath: dummyPdfPath,
        fileSizeBytes: 2048,
        mimeType: 'application/pdf',
      },
    });

    const casteDocA = await prisma.document.create({ data: { studentId: profA.id, documentType: 'CASTE_CERT' } });
    casteDocVersion1 = await prisma.documentVersion.create({
      data: {
        documentId: casteDocA.id,
        versionNumber: 1,
        originalFilename: 'caste_cert_sc.pdf',
        storagePath: dummyPdfPath,
        fileSizeBytes: 2048,
        mimeType: 'application/pdf',
      },
    });

    const marksheetDocA = await prisma.document.create({ data: { studentId: profA.id, documentType: 'MARKSHEET_PREV' } });
    marksheetDocVersion1 = await prisma.documentVersion.create({
      data: {
        documentId: marksheetDocA.id,
        versionNumber: 1,
        originalFilename: 'marksheet_prev.pdf',
        storagePath: dummyPdfPath,
        fileSizeBytes: 2048,
        mimeType: 'application/pdf',
      },
    });

    const domicileDocA = await prisma.document.create({ data: { studentId: profA.id, documentType: 'DOMICILE_CERT' } });
    domicileDocVersion1 = await prisma.documentVersion.create({
      data: {
        documentId: domicileDocA.id,
        versionNumber: 1,
        originalFilename: 'domicile_maharashtra.pdf',
        storagePath: dummyPdfPath,
        fileSizeBytes: 2048,
        mimeType: 'application/pdf',
      },
    });

    // Start & Submit Application A (College A)
    const startA = await makeRequest('/applications/start', {
      method: 'POST',
      body: JSON.stringify({ scholarshipId: scholarship.id }),
    }, cookieStudentA);
    expect(startA.status).toBe(201);
    const appAId = startA.body.application.id;

    await makeRequest(`/applications/${appAId}/draft`, {
      method: 'PUT',
      body: JSON.stringify({
        questionnaire: {
          admissionReceiptNo: 'ADM-COEP-001',
          admissionDate: '2024-07-15',
          isAvailingOtherScholarship: false,
        },
        selectedDocuments: {
          INCOME_CERT: incomeDocVersion1.id,
          CASTE_CERT: casteDocVersion1.id,
          MARKSHEET_PREV: marksheetDocVersion1.id,
          DOMICILE_CERT: domicileDocVersion1.id,
        },
        declarationAccepted: true,
      }),
    }, cookieStudentA);

    const submitA = await makeRequest(`/applications/${appAId}/submit`, {
      method: 'POST',
      body: JSON.stringify({ declarationAccepted: true }),
    }, cookieStudentA);
    expect(submitA.status).toBe(200);
    appA = await prisma.application.findUnique({ where: { id: appAId } });
    expect(appA.status).toBe('SUBMITTED');

    // Seed 4 mandatory documents for Student B
    const incomeDocB = await prisma.document.create({ data: { studentId: profB.id, documentType: 'INCOME_CERT' } });
    const incomeDocVersionB = await prisma.documentVersion.create({
      data: {
        documentId: incomeDocB.id,
        versionNumber: 1,
        originalFilename: 'income_cert_b.pdf',
        storagePath: dummyPdfPath,
        fileSizeBytes: 2048,
        mimeType: 'application/pdf',
      },
    });

    const casteDocB = await prisma.document.create({ data: { studentId: profB.id, documentType: 'CASTE_CERT' } });
    const casteDocVersionB = await prisma.documentVersion.create({
      data: {
        documentId: casteDocB.id,
        versionNumber: 1,
        originalFilename: 'caste_cert_b.pdf',
        storagePath: dummyPdfPath,
        fileSizeBytes: 2048,
        mimeType: 'application/pdf',
      },
    });

    const marksheetDocB = await prisma.document.create({ data: { studentId: profB.id, documentType: 'MARKSHEET_PREV' } });
    const marksheetDocVersionB = await prisma.documentVersion.create({
      data: {
        documentId: marksheetDocB.id,
        versionNumber: 1,
        originalFilename: 'marksheet_b.pdf',
        storagePath: dummyPdfPath,
        fileSizeBytes: 2048,
        mimeType: 'application/pdf',
      },
    });

    const domicileDocB = await prisma.document.create({ data: { studentId: profB.id, documentType: 'DOMICILE_CERT' } });
    const domicileDocVersionB = await prisma.documentVersion.create({
      data: {
        documentId: domicileDocB.id,
        versionNumber: 1,
        originalFilename: 'domicile_b.pdf',
        storagePath: dummyPdfPath,
        fileSizeBytes: 2048,
        mimeType: 'application/pdf',
      },
    });

    // Start & Submit Application B (College B)
    const startB = await makeRequest('/applications/start', {
      method: 'POST',
      body: JSON.stringify({ scholarshipId: scholarship.id }),
    }, cookieStudentB);
    expect(startB.status).toBe(201);
    const appBId = startB.body.application.id;

    await makeRequest(`/applications/${appBId}/draft`, {
      method: 'PUT',
      body: JSON.stringify({
        questionnaire: {
          admissionReceiptNo: 'ADM-VJTI-002',
          admissionDate: '2024-07-18',
          isAvailingOtherScholarship: false,
        },
        selectedDocuments: {
          INCOME_CERT: incomeDocVersionB.id,
          CASTE_CERT: casteDocVersionB.id,
          MARKSHEET_PREV: marksheetDocVersionB.id,
          DOMICILE_CERT: domicileDocVersionB.id,
        },
        declarationAccepted: true,
      }),
    }, cookieStudentB);

    const submitB = await makeRequest(`/applications/${appBId}/submit`, {
      method: 'POST',
      body: JSON.stringify({ declarationAccepted: true }),
    }, cookieStudentB);
    expect(submitB.status).toBe(200);
    appB = await prisma.application.findUnique({ where: { id: appBId } });
    expect(appB.status).toBe('SUBMITTED');
  });

  // ---------------------------------------------------------------------------
  // PART 1: AUTHENTICATION & ROLE-BASED ACCESS CONTROLS
  // ---------------------------------------------------------------------------
  await test('Test 1: Unauthenticated request to /api/college/dashboard returns 401', async () => {
    const res = await makeRequest('/college/dashboard');
    expect(res.status).toBe(401);
  });

  await test('Test 2: STUDENT user accessing /api/college/dashboard returns 403 Forbidden', async () => {
    const res = await makeRequest('/college/dashboard', {}, cookieStudentA);
    expect(res.status).toBe(403);
  });

  await test('Test 3: ADMIN user accessing /api/college/dashboard returns 403 (ADMIN is not given implicit College role)', async () => {
    const res = await makeRequest('/college/dashboard', {}, cookieAdmin);
    expect(res.status).toBe(403);
  });

  await test('Test 4: College Officer A accessing /api/college/dashboard returns 200 with College A details', async () => {
    const res = await makeRequest('/college/dashboard', {}, cookieCollegeA);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.college.code).toBe(collegeA.code);
    expect(res.body.college.name).toBe(collegeA.name);
    expect(res.body.metrics.totalApplications).toBe(1);
    expect(res.body.metrics.submittedCount).toBe(1);
  });

  // ---------------------------------------------------------------------------
  // PART 2: STRICT MULTI-TENANT ISOLATION & IDOR DEFENSE
  // ---------------------------------------------------------------------------
  await test('Test 5: College A Queue returns Application A, but NEVER Application B', async () => {
    const res = await makeRequest('/college/applications', {}, cookieCollegeA);
    expect(res.status).toBe(200);
    const appIds = res.body.applications.map((a) => a.id);
    expect(appIds.includes(appA.id)).toBe(true);
    expect(appIds.includes(appB.id)).toBe(false);
  });

  await test('Test 6: College B Queue returns Application B, but NEVER Application A', async () => {
    const res = await makeRequest('/college/applications', {}, cookieCollegeB);
    expect(res.status).toBe(200);
    const appIds = res.body.applications.map((a) => a.id);
    expect(appIds.includes(appB.id)).toBe(true);
    expect(appIds.includes(appA.id)).toBe(false);
  });

  await test('Test 7: IDOR Defense 1: College A querying Application B details returns 404', async () => {
    const res = await makeRequest(`/college/applications/${appB.id}`, {}, cookieCollegeA);
    expect(res.status).toBe(404);
  });

  await test('Test 8: IDOR Defense 2: College A attempting to start review on Application B returns 404', async () => {
    const res = await makeRequest(`/college/applications/${appB.id}/review/start`, { method: 'POST' }, cookieCollegeA);
    expect(res.status).toBe(404);
  });

  await test('Test 9: IDOR Defense 3: College A attempting to submit review decision on Application B returns 404', async () => {
    const res = await makeRequest(
      `/college/applications/${appB.id}/review/decision`,
      {
        method: 'POST',
        body: JSON.stringify({ decision: 'REJECT', overallRemarks: 'Malicious cross-tenant attempt' }),
      },
      cookieCollegeA
    );
    expect(res.status).toBe(404);
  });

  await test('Test 10: IDOR Defense 4: College A attempting to preview Application B document returns 404', async () => {
    const appBRecord = await prisma.application.findUnique({
      where: { id: appB.id },
      include: { documentSnapshots: true },
    });
    const versionIdB = appBRecord.documentSnapshots[0].documentVersionId;

    const res = await makeRequest(`/college/applications/${appB.id}/documents/${versionIdB}/preview`, {}, cookieCollegeA);
    expect(res.status).toBe(404);
  });

  await test('Test 11: IDOR Defense 5: College A attempting to download Application B document returns 404', async () => {
    const appBRecord = await prisma.application.findUnique({
      where: { id: appB.id },
      include: { documentSnapshots: true },
    });
    const versionIdB = appBRecord.documentSnapshots[0].documentVersionId;

    const res = await makeRequest(`/college/applications/${appB.id}/documents/${versionIdB}/download`, {}, cookieCollegeA);
    expect(res.status).toBe(404);
  });

  // ---------------------------------------------------------------------------
  // PART 3: DASHBOARD INTELLIGENCE & QUEUE FILTERING
  // ---------------------------------------------------------------------------
  await test('Test 12: Dashboard metrics accurately reflect awaitingAction count and status distribution', async () => {
    const res = await makeRequest('/college/dashboard', {}, cookieCollegeA);
    expect(res.body.metrics.awaitingAction).toBe(1);
    expect(res.body.metrics.underReviewCount).toBe(0);
    expect(res.body.metrics.sentBackCount).toBe(0);
    expect(res.body.metrics.forwardedCount).toBe(0);
    expect(res.body.metrics.rejectedCount).toBe(0);
  });

  await test('Test 13: Workload aging intelligence calculates fresh, moderate, and overdue applications', async () => {
    const res = await makeRequest('/college/dashboard', {}, cookieCollegeA);
    const aging = res.body.workload.aging;
    expect(typeof aging.freshUnder3Days).toBe('number');
    expect(typeof aging.moderate3To7Days).toBe('number');
    expect(typeof aging.overdueOver7Days).toBe('number');
    expect(aging.freshUnder3Days >= 1).toBe(true);
  });

  await test('Test 14: Immediate action list contains submitted Application A with daysPending', async () => {
    const res = await makeRequest('/college/dashboard', {}, cookieCollegeA);
    const items = res.body.workload.immediateActionRequired;
    expect(items.length >= 1).toBe(true);
    expect(items[0].id).toBe(appA.id);
    expect(items[0].applicationNumber).toBe(appA.applicationNumber);
    expect(typeof items[0].daysPending).toBe('number');
  });

  await test('Test 15: Application Queue: Search by ARN returns exact application', async () => {
    const res = await makeRequest(`/college/applications?search=${appA.applicationNumber}`, {}, cookieCollegeA);
    expect(res.status).toBe(200);
    expect(res.body.applications.length).toBe(1);
    expect(res.body.applications[0].id).toBe(appA.id);
  });

  await test('Test 16: Application Queue: Search by student full name returns application', async () => {
    const res = await makeRequest('/college/applications?search=Student Alpha', {}, cookieCollegeA);
    expect(res.status).toBe(200);
    expect(res.body.applications.length >= 1).toBe(true);
    expect(res.body.applications[0].student.fullName).toBe('Student Alpha');
  });

  await test('Test 17: Application Queue: Filter by status AWAITING_ACTION returns pending applications', async () => {
    const res = await makeRequest('/college/applications?status=AWAITING_ACTION', {}, cookieCollegeA);
    expect(res.status).toBe(200);
    expect(res.body.applications.some((a) => a.id === appA.id)).toBe(true);
  });

  await test('Test 18: Application Queue: Pagination metadata correctly returns page, limit, total, and totalPages', async () => {
    const res = await makeRequest('/college/applications?limit=5&page=1', {}, cookieCollegeA);
    expect(res.status).toBe(200);
    expect(res.body.pagination.page).toBe(1);
    expect(res.body.pagination.limit).toBe(5);
    expect(res.body.pagination.total >= 1).toBe(true);
    expect(res.body.pagination.totalPages >= 1).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // PART 4: APPLICATION REVIEW DESK & DOCUMENT STREAMING
  // ---------------------------------------------------------------------------
  await test('Test 19: Review desk GET /college/applications/:id returns frozen snapshot and evaluation rules', async () => {
    const res = await makeRequest(`/college/applications/${appA.id}`, {}, cookieCollegeA);
    expect(res.status).toBe(200);
    expect(res.body.application.id).toBe(appA.id);
    expect(res.body.currentSnapshot.student.personal.fullName).toBe('Student Alpha');
    expect(res.body.currentSnapshot.student.academic.courseName).toContain('Computer');
    expect(res.body.currentSnapshot.eligibilityEvaluation.isEligible).toBe(true);
    expect(res.body.allowedActions.includes('START_REVIEW')).toBe(true);
  });

  await test('Test 20: Attached document snapshots are returned with secure previewUrl and downloadUrl', async () => {
    const res = await makeRequest(`/college/applications/${appA.id}`, {}, cookieCollegeA);
    const docs = res.body.documentSnapshots;
    expect(docs.length).toBe(4);
    const incomeDoc = docs.find((d) => d.documentType === 'INCOME_CERT');
    expect(incomeDoc).toBeTruthy();
    expect(incomeDoc.documentVersion.previewUrl).toContain(`/api/college/applications/${appA.id}/documents/`);
    expect(incomeDoc.documentVersion.downloadUrl).toContain('/download');
  });

  await test('Test 21: Scoped Document Preview endpoint streams PDF inline with correct Content-Type', async () => {
    const res = await makeRequest(`/college/applications/${appA.id}/documents/${incomeDocVersion1.id}/preview`, {}, cookieCollegeA);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('application/pdf');
    expect(res.headers.get('content-disposition')).toContain('inline');
  });

  await test('Test 22: Scoped Document Download endpoint streams file with attachment Content-Disposition', async () => {
    const res = await makeRequest(`/college/applications/${appA.id}/documents/${incomeDocVersion1.id}/download`, {}, cookieCollegeA);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-disposition')).toContain('attachment');
  });

  await test('Test 23: Document version ID not attached to application returns 404', async () => {
    const res = await makeRequest(`/college/applications/${appA.id}/documents/invalid-non-attached-id/preview`, {}, cookieCollegeA);
    expect(res.status).toBe(404);
  });

  // ---------------------------------------------------------------------------
  // PART 5: SCRUTINY WORKFLOW: START REVIEW, SEND BACK, RESUBMIT, FORWARD
  // ---------------------------------------------------------------------------
  await test('Test 24: College A starts scrutiny: Status transitions to UNDER_COLLEGE_REVIEW', async () => {
    const res = await makeRequest(`/college/applications/${appA.id}/review/start`, { method: 'POST' }, cookieCollegeA);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('UNDER_COLLEGE_REVIEW');

    const app = await prisma.application.findUnique({ where: { id: appA.id } });
    expect(app.status).toBe('UNDER_COLLEGE_REVIEW');

    const audit = await prisma.applicationAuditLog.findFirst({
      where: { applicationId: appA.id, action: 'REVIEW_UNDER_COLLEGE' },
    });
    expect(audit).toBeTruthy();
    expect(audit.actorRole).toBe('COLLEGE');
  });

  await test('Test 25: Starting review again on UNDER_COLLEGE_REVIEW application fails with 400', async () => {
    const res = await makeRequest(`/college/applications/${appA.id}/review/start`, { method: 'POST' }, cookieCollegeA);
    expect(res.status).toBe(400);
  });

  await test('Test 26: Send Back validation: Returning without corrections or with vague reason (< 10 chars) fails with 400', async () => {
    // Attempt with empty corrections
    const res1 = await makeRequest(
      `/college/applications/${appA.id}/review/decision`,
      {
        method: 'POST',
        body: JSON.stringify({ decision: 'SEND_BACK', corrections: [] }),
      },
      cookieCollegeA
    );
    expect(res1.status).toBe(400);

    // Attempt with vague 4-character reason
    const res2 = await makeRequest(
      `/college/applications/${appA.id}/review/decision`,
      {
        method: 'POST',
        body: JSON.stringify({
          decision: 'SEND_BACK',
          corrections: [
            {
              affectedSection: 'DOCUMENT',
              affectedDocumentType: 'INCOME_CERT',
              rejectionCategory: 'EXPIRED_DOCUMENT',
              reasonText: 'Fix',
              actionRequiredText: 'Now',
            },
          ],
        }),
      },
      cookieCollegeA
    );
    expect(res2.status).toBe(400);
    expect(res2.body.message).toContain('at least 10 characters');
  });

  await test('Test 27: Send Back with 2 structured corrections (Document + Field) transitions to COLLEGE_SENT_BACK', async () => {
    const res = await makeRequest(
      `/college/applications/${appA.id}/review/decision`,
      {
        method: 'POST',
        body: JSON.stringify({
          decision: 'SEND_BACK',
          overallRemarks: 'Please rectify the Income Certificate and Previous Percentage.',
          corrections: [
            {
              affectedSection: 'DOCUMENT',
              affectedDocumentType: 'INCOME_CERT',
              rejectionCategory: 'EXPIRED_DOCUMENT',
              reasonText: 'The uploaded income certificate is expired. Please upload a valid current income certificate.',
              actionRequiredText: 'Upload a valid current Income Certificate in Document Vault.',
            },
            {
              affectedSection: 'ACADEMIC',
              affectedField: 'previousPercentage',
              rejectionCategory: 'ACADEMIC_INCORRECT',
              reasonText: 'The previous percentage entered in the application does not match the submitted academic record.',
              actionRequiredText: 'Correct the previous percentage according to the submitted academic record.',
            },
          ],
        }),
      },
      cookieCollegeA
    );

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('COLLEGE_SENT_BACK');

    const app = await prisma.application.findUnique({ where: { id: appA.id } });
    expect(app.status).toBe('COLLEGE_SENT_BACK');

    // In-app notification created for student
    const notification = await prisma.notification.findFirst({
      where: { userId: userStudentA.id, category: 'ACTION_REQUIRED' },
    });
    expect(notification).toBeTruthy();
    expect(notification.title).toContain('Action Required');
  });

  await test('Test 28: Precondition check: Attempting to forward an application while open corrections exist fails with 400', async () => {
    // Put appA in UNDER_COLLEGE_REVIEW to test the open corrections blocker
    await prisma.application.update({
      where: { id: appA.id },
      data: { status: 'UNDER_COLLEGE_REVIEW' },
    });

    try {
      // Attempt to forward while 2 corrections are OPEN
      const res = await makeRequest(
        `/college/applications/${appA.id}/review/decision`,
        {
          method: 'POST',
          body: JSON.stringify({ decision: 'VERIFY_FORWARD', overallRemarks: 'Trying to bypass corrections' }),
        },
        cookieCollegeA
      );
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('remain unresolved');
    } finally {
      // Restore to COLLEGE_SENT_BACK so student can resolve in Test 29
      await prisma.application.update({
        where: { id: appA.id },
        data: { status: 'COLLEGE_SENT_BACK' },
      });
    }
  });

  await test('Test 29: Student A resolves both corrections and resubmits -> Transitions to RESUBMITTED_TO_COLLEGE', async () => {
    // 1. Upload new Income Certificate (v2)
    const incomeDoc = await prisma.document.findFirst({
      where: { student: { userId: userStudentA.id }, documentType: 'INCOME_CERT' },
    });
    const dummyPdfPath = path.resolve(`storage/documents/test_cert_${ts}.pdf`);
    incomeDocVersion2 = await prisma.documentVersion.create({
      data: {
        documentId: incomeDoc.id,
        versionNumber: 2,
        originalFilename: 'income_cert_2024_v2.pdf',
        storagePath: dummyPdfPath,
        fileSizeBytes: 2048,
        mimeType: 'application/pdf',
      },
    });

    const corrections = await prisma.applicationCorrectionRequest.findMany({
      where: { applicationId: appA.id, status: 'OPEN' },
    });
    expect(corrections.length).toBe(2);

    const docCorr = corrections.find((c) => c.affectedSection === 'DOCUMENT');
    const fieldCorr = corrections.find((c) => c.affectedSection === 'ACADEMIC');

    // Resolve Document Correction
    const resDoc = await makeRequest(
      `/applications/${appA.id}/corrections/${docCorr.id}/resolve`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          resolvedDocumentVersionId: incomeDocVersion2.id,
          studentResponseText: 'Uploaded new current Income Certificate v2.',
        }),
      },
      cookieStudentA
    );
    expect(resDoc.status).toBe(200);

    // Resolve Field Correction
    const resField = await makeRequest(
      `/applications/${appA.id}/corrections/${fieldCorr.id}/resolve`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          fieldValue: 80.0,
          studentResponseText: 'Corrected previous percentage to 80.0% matching HSC marksheet.',
        }),
      },
      cookieStudentA
    );
    expect(resField.status).toBe(200);

    // Student Resubmits Application
    const resubmitRes = await makeRequest(
      `/applications/${appA.id}/resubmit`,
      {
        method: 'POST',
        body: JSON.stringify({ confirmationAccepted: true }),
      },
      cookieStudentA
    );
    expect(resubmitRes.status).toBe(200);
    expect(resubmitRes.body.status).toBe('RESUBMITTED_TO_COLLEGE');

    const app = await prisma.application.findUnique({
      where: { id: appA.id },
      include: { snapshots: true },
    });
    expect(app.status).toBe('RESUBMITTED_TO_COLLEGE');
    expect(app.snapshots.length).toBe(2); // Cycle 2 snapshot created!
  });

  await test('Test 30: College A starts re-scrutiny on RESUBMITTED_TO_COLLEGE application -> Status moves to UNDER_COLLEGE_REVIEW', async () => {
    const res = await makeRequest(`/college/applications/${appA.id}/review/start`, { method: 'POST' }, cookieCollegeA);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('UNDER_COLLEGE_REVIEW');
  });

  await test('Test 31: College A accepts resubmitted corrections and forwards to Authority -> Transitions to FORWARDED_TO_AUTHORITY', async () => {
    const corrections = await prisma.applicationCorrectionRequest.findMany({
      where: { applicationId: appA.id },
    });

    // Accept each resolved correction item
    for (const corr of corrections) {
      const reviewItemRes = await makeRequest(
        `/college/applications/${appA.id}/corrections/${corr.id}/review`,
        {
          method: 'PATCH',
          body: JSON.stringify({ decision: 'ACCEPT', remarks: 'Verified and satisfactory.' }),
        },
        cookieCollegeA
      );
      expect(reviewItemRes.status).toBe(200);
    }

    // Now forward application to Department Authority
    const forwardRes = await makeRequest(
      `/college/applications/${appA.id}/review/decision`,
      {
        method: 'POST',
        body: JSON.stringify({
          decision: 'VERIFY_FORWARD',
          checklistJson: {
            institutionalRecordsVerified: true,
            documentsInspected: true,
            noUnresolvedDiscrepancies: true,
          },
          overallRemarks: 'Applicant profile, academic credentials, and replacement income certificate verified. Forwarded to Department Authority.',
        }),
      },
      cookieCollegeA
    );

    expect(forwardRes.status).toBe(200);
    expect(forwardRes.body.status).toBe('FORWARDED_TO_AUTHORITY');

    const updatedApp = await prisma.application.findUnique({ where: { id: appA.id } });
    expect(updatedApp.status).toBe('FORWARDED_TO_AUTHORITY');

    // Audit log recorded
    const auditLog = await prisma.applicationAuditLog.findFirst({
      where: { applicationId: appA.id, action: 'COLLEGE_FORWARDED' },
    });
    expect(auditLog).toBeTruthy();
    expect(auditLog.newStatus).toBe('FORWARDED_TO_AUTHORITY');

    // Notification created for student
    const notif = await prisma.notification.findFirst({
      where: { userId: userStudentA.id, title: 'Application Verified by College' },
    });
    expect(notif).toBeTruthy();
  });

  // ---------------------------------------------------------------------------
  // PART 6: COLLEGE REJECTION WORKFLOW
  // ---------------------------------------------------------------------------
  await test('Test 32: Submit decision REJECT with category and justification transitions application to COLLEGE_REJECTED', async () => {
    // Put Application B in UNDER_COLLEGE_REVIEW for College B
    await makeRequest(`/college/applications/${appB.id}/review/start`, { method: 'POST' }, cookieCollegeB);

    const res = await makeRequest(
      `/college/applications/${appB.id}/review/decision`,
      {
        method: 'POST',
        body: JSON.stringify({
          decision: 'REJECT',
          checklistJson: { rejectionCategory: 'ELIGIBILITY_NOT_MET' },
          overallRemarks: 'Student admission does not meet minimum qualifying eligibility for this scheme.',
        }),
      },
      cookieCollegeB
    );

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('COLLEGE_REJECTED');

    const app = await prisma.application.findUnique({ where: { id: appB.id } });
    expect(app.status).toBe('COLLEGE_REJECTED');

    // Audit log
    const audit = await prisma.applicationAuditLog.findFirst({
      where: { applicationId: appB.id, action: 'COLLEGE_REJECTED' },
    });
    expect(audit).toBeTruthy();

    // Student notification
    const notif = await prisma.notification.findFirst({
      where: { userId: userStudentB.id, title: 'Application Rejected by College' },
    });
    expect(notif).toBeTruthy();
  });

  await test('Test 33: Action on already-forwarded application fails with HTTP 400', async () => {
    // Attempt to start scrutiny on Application A which is now FORWARDED_TO_AUTHORITY
    const res = await makeRequest(`/college/applications/${appA.id}/review/start`, { method: 'POST' }, cookieCollegeA);
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Cannot initiate scrutiny from status');
  });

  } finally {
    console.log('\n[CLEANUP] Cleaning up Phase 7 ephemeral test records...');
    try {
      const appIds = [appA?.id, appB?.id, appARejectionTest?.id].filter(Boolean);
      if (appIds.length > 0) {
        await prisma.applicationAuditLog.deleteMany({ where: { applicationId: { in: appIds } } });
        await prisma.applicationCorrectionRequest.deleteMany({ where: { applicationId: { in: appIds } } });
        await prisma.applicationReview.deleteMany({ where: { applicationId: { in: appIds } } });
        await prisma.applicationDocumentSnapshot.deleteMany({ where: { applicationId: { in: appIds } } });
        await prisma.applicationSnapshot.deleteMany({ where: { applicationId: { in: appIds } } });
        await prisma.application.deleteMany({ where: { id: { in: appIds } } });
      }

      const userIds = [userCollegeA?.id, userCollegeB?.id, userStudentA?.id, userStudentB?.id, userAdmin?.id].filter(Boolean);
      if (userIds.length > 0) {
        await prisma.notification.deleteMany({ where: { userId: { in: userIds } } });
        await prisma.documentVersion.deleteMany({ where: { document: { student: { userId: { in: userIds } } } } });
        await prisma.document.deleteMany({ where: { student: { userId: { in: userIds } } } });
        await prisma.studentProfile.deleteMany({ where: { userId: { in: userIds } } });
        await prisma.user.deleteMany({ where: { id: { in: userIds } } });
      }

      const collegeIds = [collegeA?.id, collegeB?.id].filter(Boolean);
      if (collegeIds.length > 0) {
        await prisma.college.deleteMany({ where: { id: { in: collegeIds } } });
      }
      console.log('[CLEANUP] Phase 7 test records cleaned up cleanly.');
    } catch (cleanErr) {
      console.error('[CLEANUP ERROR in Phase 7]', cleanErr);
    }
  }

  // ---------------------------------------------------------------------------
  // SUMMARY
  // ---------------------------------------------------------------------------
  console.log('\n====================================================');
  console.log(`PHASE 7 TEST SUITE COMPLETE: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('====================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runPhase7Tests()
  .catch((err) => {
    console.error('Fatal error during Phase 7 test run:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
