/**
 * Comprehensive Automated Test Suite for Phase 6: Application Tracking & Corrections
 *
 * Covers:
 * Part 1: Tracking & Human-Readable Mapping (Timeline zero-fabrication, IDOR, metadata)
 * Part 2: College Review & Send-Back (Structured reasons, Action Required Center)
 * Part 3: Correction Resolution Lifecycle (Document & Field corrections, IDOR, cross-student defense)
 * Part 4: Multi-Cycle Atomic Resubmission & Immutability (Cycle 1 vs Cycle 2 snapshots, audit trail)
 * Part 5: Authority Send-Back Routing (Strictly through College Desk RESUBMITTED_TO_COLLEGE)
 * Part 6: Reviewer Re-Scrutiny & Re-Flagging (ACCEPTED vs RE_FLAGGED)
 * Part 7: Cancellation & Right to Give Up (Strict allowlists, terminal states)
 */

const { prisma } = require('../src/config/prisma');

const BASE_URL = 'http://localhost:5000/api';

// Helper for HTTP requests with cookies
async function makeRequest(endpoint, options = {}, cookie = '') {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(cookie ? { Cookie: cookie } : {}),
    ...options.headers,
  };

  const res = await fetch(url, {
    ...options,
    headers,
  });

  const rawCookie = res.headers.get('set-cookie');
  const setCookie = rawCookie ? rawCookie.split(';')[0] : cookie;
  let body = null;
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    body = await res.json();
  } else {
    body = await res.text();
  }

  return {
    status: res.status,
    headers: res.headers,
    body,
    cookie: setCookie,
  };
}

function expect(actual) {
  return {
    toBe(expected) {
      if (actual !== expected) {
        throw new Error(`Expected ${JSON.stringify(expected)} but received ${JSON.stringify(actual)}`);
      }
    },
    toEqual(expected) {
      if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)} but received ${JSON.stringify(actual)}`);
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
  console.log('====================================================');
  console.log('STARTING PHASE 6 APPLICATION TRACKING & CORRECTIONS SUITE');
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

  // Common IDs and cookies
  let studentACookie = '';
  let studentBCookie = '';
  let collegeCookie = '';
  let authorityCookie = '';

  let studentAUser = null;
  let studentBUser = null;
  let collegeUser = null;
  let authorityUser = null;

  let scholarship = null;
  let collegeRecord = null;
  let departmentRecord = null;
  let applicationId = null;

  let incomeDocVersion1 = null;
  let incomeDocVersion2 = null;
  let casteDocVersion1 = null;
  let marksheetDocVersion1 = null;
  let domicileDocVersion1 = null;

  try {
  // ---------------------------------------------------------------------------
  // SETUP
  // ---------------------------------------------------------------------------
  await test('Setup: Retrieve active scholarship, college, and department', async () => {
    scholarship = await prisma.scholarship.findFirst({
      where: { code: 'SJD-SC-001', isActive: true },
      include: { department: true, requiredDocuments: true },
    });
    expect(scholarship).toBeTruthy();

    departmentRecord = scholarship.department;
    // Create dedicated ephemeral test college (isolated from master COEP)
    collegeRecord = await prisma.college.create({
      data: {
        code: `TEST_COLLEGE_P6_${Date.now()}`,
        name: `Test Ephemeral College P6 ${Date.now()}`,
        university: 'Test University Pune',
        district: 'Pune',
        taluka: 'Haveli',
        isActive: true,
      },
    });
    expect(collegeRecord).toBeTruthy();
  });

  await test('Setup: Create & Authenticate Users (Student A, Student B, College Officer, Authority Officer)', async () => {
    const ts = Date.now();
    const jwt = require('jsonwebtoken');
    const bcrypt = require('bcryptjs');
    const config = require('../src/config/env');
    const hashedPassword = await bcrypt.hash('Password@123', 10);

    // 1. Student A
    const emailA = `track_student_a_${ts}@test.ac.in`;
    const regResA = await makeRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email: emailA, password: 'Password@123', confirmPassword: 'Password@123' }),
    });
    expect(regResA.status).toBe(201);
    studentAUser = regResA.body.user;

    const loginResA = await makeRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: emailA, password: 'Password@123' }),
    });
    expect(loginResA.status).toBe(200);
    studentACookie = loginResA.cookie;

    // Initialize Student A Profile
    const profResA = await makeRequest('/student/profile', {
      method: 'PUT',
      body: JSON.stringify({
        fullName: 'Tracking Student Alpha',
        dob: '2003-05-15',
        gender: 'MALE',
        category: 'SC',
        religion: 'HINDU',
        mobile: '9876543210',
        annualFamilyIncome: 180000,
        collegeId: collegeRecord.id,
        courseName: 'Bachelor of Computer Applications',
        courseYear: 2,
        admissionYear: 2024,
        previousQualification: 'HSC',
        previousPercentage: 68.0,
        bankAccountNo: '998877665544',
        bankIfsc: 'SBIN0001234',
        bankName: 'State Bank of India',
        state: 'Maharashtra',
        district: 'Pune',
      }),
    }, studentACookie);
    expect(profResA.status).toBe(200);

    // 2. Student B
    const emailB = `track_student_b_${ts}@test.ac.in`;
    const regResB = await makeRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email: emailB, password: 'Password@123', confirmPassword: 'Password@123' }),
    });
    expect(regResB.status).toBe(201);
    studentBUser = regResB.body.user;

    const loginResB = await makeRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: emailB, password: 'Password@123' }),
    });
    expect(loginResB.status).toBe(200);
    studentBCookie = loginResB.cookie;

    // 3. College User
    const emailCollege = `college_officer_${ts}@college.ac.in`;
    collegeUser = await prisma.user.create({
      data: {
        email: emailCollege,
        passwordHash: hashedPassword,
        role: 'COLLEGE',
        collegeId: collegeRecord.id,
        isActive: true,
      },
    });
    const collegeToken = jwt.sign({ id: collegeUser.id, role: 'COLLEGE' }, config.jwtSecret, { expiresIn: '1h' });
    collegeCookie = `token=${collegeToken}`;

    // 4. Authority User
    const emailAuth = `authority_officer_${ts}@maharashtra.gov.in`;
    authorityUser = await prisma.user.create({
      data: {
        email: emailAuth,
        passwordHash: hashedPassword,
        role: 'AUTHORITY',
        departmentId: departmentRecord.id,
        isActive: true,
      },
    });
    const authorityToken = jwt.sign({ id: authorityUser.id, role: 'AUTHORITY' }, config.jwtSecret, { expiresIn: '1h' });
    authorityCookie = `token=${authorityToken}`;
  });

  await test('Setup: Seed Document Vault for Student A & Submit Initial Application', async () => {
    const studentProfileA = await prisma.studentProfile.findUnique({ where: { userId: studentAUser.id } });

    // Seed Income Cert (v1)
    const incomeDoc = await prisma.document.create({
      data: {
        studentId: studentProfileA.id,
        documentType: 'INCOME_CERT',
      },
    });
    incomeDocVersion1 = await prisma.documentVersion.create({
      data: {
        documentId: incomeDoc.id,
        versionNumber: 1,
        originalFilename: 'income_cert_2024.pdf',
        storagePath: 'storage/documents/test_income_v1.pdf',
        fileSizeBytes: 204800,
        mimeType: 'application/pdf',
      },
    });

    // Seed Caste Cert (v1)
    const casteDoc = await prisma.document.create({
      data: {
        studentId: studentProfileA.id,
        documentType: 'CASTE_CERT',
      },
    });
    casteDocVersion1 = await prisma.documentVersion.create({
      data: {
        documentId: casteDoc.id,
        versionNumber: 1,
        originalFilename: 'caste_cert_sc.png',
        storagePath: 'storage/documents/test_caste_v1.png',
        fileSizeBytes: 153600,
        mimeType: 'image/png',
      },
    });

    // Seed Marksheet Prev (v1)
    const marksheetDoc = await prisma.document.create({
      data: {
        studentId: studentProfileA.id,
        documentType: 'MARKSHEET_PREV',
      },
    });
    marksheetDocVersion1 = await prisma.documentVersion.create({
      data: {
        documentId: marksheetDoc.id,
        versionNumber: 1,
        originalFilename: 'marksheet_hsc.pdf',
        storagePath: 'storage/documents/test_marksheet_v1.pdf',
        fileSizeBytes: 180000,
        mimeType: 'application/pdf',
      },
    });

    // Seed Domicile Cert (v1)
    const domicileDoc = await prisma.document.create({
      data: {
        studentId: studentProfileA.id,
        documentType: 'DOMICILE_CERT',
      },
    });
    domicileDocVersion1 = await prisma.documentVersion.create({
      data: {
        documentId: domicileDoc.id,
        versionNumber: 1,
        originalFilename: 'domicile_maharashtra.pdf',
        storagePath: 'storage/documents/test_domicile_v1.pdf',
        fileSizeBytes: 160000,
        mimeType: 'application/pdf',
      },
    });

    // Start application draft
    const startRes = await makeRequest('/applications/start', {
      method: 'POST',
      body: JSON.stringify({ scholarshipId: scholarship.id }),
    }, studentACookie);
    expect(startRes.status).toBe(201);
    applicationId = startRes.body.application.id;

    // Save draft questionnaire & declaration
    await makeRequest(`/applications/${applicationId}/draft`, {
      method: 'PUT',
      body: JSON.stringify({
        questionnaire: {
          admissionReceiptNo: 'REC-2024-9988',
          admissionDate: '2024-07-20',
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
    }, studentACookie);

    // Check readiness before submit
    const readyRes = await makeRequest(`/applications/${applicationId}/readiness`, {}, studentACookie);
    if (!readyRes.body.isReady) {
      console.log('READINESS BLOCKERS:', JSON.stringify(readyRes.body.blockers, null, 2));
    }

    // Submit Application
    const submitRes = await makeRequest(`/applications/${applicationId}/submit`, {
      method: 'POST',
      body: JSON.stringify({ declarationAccepted: true }),
    }, studentACookie);
    if (submitRes.status !== 200) {
      console.log('SUBMIT ERROR BODY:', JSON.stringify(submitRes.body, null, 2));
    }
    expect(submitRes.status).toBe(200);
    expect(submitRes.body.success).toBe(true);
    expect(submitRes.body.applicationNumber).toBeTruthy();
  });

  // ---------------------------------------------------------------------------
  // PART 1: TRACKING & HUMAN-READABLE METADATA (Zero Fabrication Rule)
  // ---------------------------------------------------------------------------
  await test('Test 1: GET /api/applications/:id/tracking returns derived stage and human-readable metadata', async () => {
    const res = await makeRequest(`/applications/${applicationId}/tracking`, {}, studentACookie);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const t = res.body.tracking;
    expect(t.status).toBe('SUBMITTED');
    expect(t.statusMeta.stage).toBe('College Scrutiny');
    expect(t.statusMeta.stageNumber).toBe(2);
    expect(t.statusMeta.label).toBe('Submitted (Pending College Scrutiny)');
    expect(t.statusMeta.isActionRequired).toBe(false);
    expect(t.statusMeta.isTerminal).toBe(false);
    expect(t.canCancel).toBe(true);
    expect(t.canGiveUp).toBe(false);
  });

  await test('Test 2: Zero-Fabrication Rule: Timeline events are strictly backed 100% by ApplicationAuditLog', async () => {
    const res = await makeRequest(`/applications/${applicationId}/tracking`, {}, studentACookie);
    const t = res.body.tracking;

    const dbAuditLogs = await prisma.applicationAuditLog.findMany({
      where: { applicationId },
      orderBy: { timestamp: 'asc' },
    });

    expect(t.timeline.length).toBe(dbAuditLogs.length);
    expect(t.timeline.length).toBe(1); // Exactly 1 event: APPLICATION_SUBMITTED
    expect(t.timeline[0].action).toBe('APPLICATION_SUBMITTED');
    expect(t.timeline[0].actorRole).toBe('STUDENT');
  });

  await test('Test 3: IDOR Defense: Student B cannot view Student A application tracking (returns 404)', async () => {
    const res = await makeRequest(`/applications/${applicationId}/tracking`, {}, studentBCookie);
    expect(res.status).toBe(404);
  });

  await test('Test 4: Unauthenticated request to /tracking returns 401', async () => {
    const res = await makeRequest(`/applications/${applicationId}/tracking`);
    expect(res.status).toBe(401);
  });

  // ---------------------------------------------------------------------------
  // PART 2: COLLEGE REVIEW & SEND-BACK (Structured Reasons)
  // ---------------------------------------------------------------------------
  await test('Test 5: College starts scrutiny: Transitions to UNDER_COLLEGE_REVIEW', async () => {
    const res = await makeRequest(`/applications/${applicationId}/review/start`, {
      method: 'POST',
    }, collegeCookie);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('UNDER_COLLEGE_REVIEW');

    const app = await prisma.application.findUnique({ where: { id: applicationId } });
    expect(app.status).toBe('UNDER_COLLEGE_REVIEW');
  });

  await test('Test 6: College sends back application with 2 structured correction requests (Document + Field)', async () => {
    const res = await makeRequest(`/applications/${applicationId}/review/decision`, {
      method: 'POST',
      body: JSON.stringify({
        decision: 'SEND_BACK',
        overallRemarks: 'Please rectify the expired income certificate and correct previous percentage.',
        corrections: [
          {
            affectedSection: 'DOCUMENT',
            affectedDocumentType: 'INCOME_CERT',
            rejectionCategory: 'EXPIRED_DOCUMENT',
            reasonText: 'Uploaded income certificate expired on 31/03/2024. Current financial year certificate required.',
            actionRequiredText: 'Upload renewed Income Certificate (AY 2025-26) to Document Vault and attach it.',
          },
          {
            affectedSection: 'ACADEMIC',
            affectedField: 'previousPercentage',
            rejectionCategory: 'ACADEMIC_INCORRECT',
            reasonText: 'Marksheet indicates 72.50% but 68.00% was entered in profile.',
            actionRequiredText: 'Enter accurate percentage (72.50%) as appearing on official marksheet.',
          },
        ],
      }),
    }, collegeCookie);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('COLLEGE_SENT_BACK');

    const app = await prisma.application.findUnique({
      where: { id: applicationId },
      include: { correctionRequests: true, reviews: true },
    });
    expect(app.status).toBe('COLLEGE_SENT_BACK');
    expect(app.reviews.length).toBe(1);
    expect(app.correctionRequests.length).toBe(2);
  });

  await test('Test 7: Tracking reflects Action Required state with exact structured reasons', async () => {
    const res = await makeRequest(`/applications/${applicationId}/tracking`, {}, studentACookie);
    expect(res.status).toBe(200);
    const t = res.body.tracking;

    expect(t.status).toBe('COLLEGE_SENT_BACK');
    expect(t.hasActionRequired).toBe(true);
    expect(t.openCorrectionsCount).toBe(2);
    expect(t.correctionRequests.length).toBe(2);

    const docCorr = t.correctionRequests.find((c) => c.affectedDocumentType === 'INCOME_CERT');
    expect(docCorr).toBeTruthy();
    expect(docCorr.rejectionCategory).toBe('EXPIRED_DOCUMENT');
    expect(docCorr.reasonText).toContain('expired on 31/03/2024');
    expect(docCorr.status).toBe('OPEN');

    const fieldCorr = t.correctionRequests.find((c) => c.affectedField === 'previousPercentage');
    expect(fieldCorr).toBeTruthy();
    expect(fieldCorr.rejectionCategory).toBe('ACADEMIC_INCORRECT');
    expect(fieldCorr.status).toBe('OPEN');
  });

  await test('Test 8: In-app Notification with category ACTION_REQUIRED was generated for Student A', async () => {
    const notification = await prisma.notification.findFirst({
      where: {
        userId: studentAUser.id,
        category: 'ACTION_REQUIRED',
      },
    });
    expect(notification).toBeTruthy();
    expect(notification.title).toContain('Sent Back');
  });

  // ---------------------------------------------------------------------------
  // PART 3: CORRECTION RESOLUTION LIFECYCLE
  // ---------------------------------------------------------------------------
  await test('Test 9: Resubmission is BLOCKED when open corrections remain (returns 400)', async () => {
    const res = await makeRequest(`/applications/${applicationId}/resubmit`, {
      method: 'POST',
      body: JSON.stringify({ confirmationAccepted: true }),
    }, studentACookie);

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('All flagged corrections must be resolved first');
  });

  await test('Test 10: Student A resolves Document Correction by linking replacement version (v2)', async () => {
    const studentProfileA = await prisma.studentProfile.findUnique({ where: { userId: studentAUser.id } });
    const incomeDoc = await prisma.document.findFirst({
      where: { studentId: studentProfileA.id, documentType: 'INCOME_CERT' },
    });

    // Upload Version 2 to Document Vault
    incomeDocVersion2 = await prisma.documentVersion.create({
      data: {
        documentId: incomeDoc.id,
        versionNumber: 2,
        originalFilename: 'income_cert_2025_renewed.pdf',
        storagePath: 'storage/documents/test_income_v2.pdf',
        fileSizeBytes: 215000,
        mimeType: 'application/pdf',
      },
    });

    const trackingRes = await makeRequest(`/applications/${applicationId}/tracking`, {}, studentACookie);
    const docCorr = trackingRes.body.tracking.correctionRequests.find(
      (c) => c.affectedDocumentType === 'INCOME_CERT'
    );

    const resolveRes = await makeRequest(
      `/applications/${applicationId}/corrections/${docCorr.id}/resolve`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          resolvedDocumentVersionId: incomeDocVersion2.id,
          studentResponseText: 'Uploaded renewed income certificate valid for current AY.',
        }),
      },
      studentACookie
    );

    expect(resolveRes.status).toBe(200);
    expect(resolveRes.body.correction.status).toBe('RESOLVED_BY_STUDENT');
  });

  await test('Test 11: Student A resolves Field Correction with updated previousPercentage value', async () => {
    const trackingRes = await makeRequest(`/applications/${applicationId}/tracking`, {}, studentACookie);
    const fieldCorr = trackingRes.body.tracking.correctionRequests.find(
      (c) => c.affectedField === 'previousPercentage'
    );

    const resolveRes = await makeRequest(
      `/applications/${applicationId}/corrections/${fieldCorr.id}/resolve`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          fieldValue: 72.5,
          studentResponseText: 'Corrected percentage to 72.50% as verified against marksheet.',
        }),
      },
      studentACookie
    );

    expect(resolveRes.status).toBe(200);
    expect(resolveRes.body.correction.status).toBe('RESOLVED_BY_STUDENT');

    // Staged in draftDataJson without adding new database tables/columns
    const app = await prisma.application.findUnique({ where: { id: applicationId } });
    expect(app.draftDataJson?.corrections?.previousPercentage).toBe(72.5);
  });

  await test('Test 12: IDOR Defense: Student B cannot resolve Student A correction request (returns 404)', async () => {
    const trackingRes = await makeRequest(`/applications/${applicationId}/tracking`, {}, studentACookie);
    const corrId = trackingRes.body.tracking.correctionRequests[0].id;

    const res = await makeRequest(
      `/applications/${applicationId}/corrections/${corrId}/resolve`,
      {
        method: 'PATCH',
        body: JSON.stringify({ studentResponseText: 'Hacking attempt' }),
      },
      studentBCookie
    );
    expect(res.status).toBe(404);
  });

  // ---------------------------------------------------------------------------
  // PART 4: MULTI-CYCLE ATOMIC RESUBMISSION & IMMUTABILITY GUARANTEE
  // ---------------------------------------------------------------------------
  await test('Test 13: Resubmission requires neutral academic-system confirmation checkbox', async () => {
    const res = await makeRequest(`/applications/${applicationId}/resubmit`, {
      method: 'POST',
      body: JSON.stringify({ confirmationAccepted: false }),
    }, studentACookie);

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('You must confirm that you have resolved the listed corrections');
  });

  await test('Test 14: Atomic resubmission transitions status to RESUBMITTED_TO_COLLEGE and creates cycle 2 snapshot', async () => {
    const res = await makeRequest(`/applications/${applicationId}/resubmit`, {
      method: 'POST',
      body: JSON.stringify({ confirmationAccepted: true }),
    }, studentACookie);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('RESUBMITTED_TO_COLLEGE');

    const app = await prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        snapshots: { orderBy: { cycleNumber: 'asc' } },
        documentSnapshots: { orderBy: { cycleNumber: 'asc' } },
      },
    });

    expect(app.status).toBe('RESUBMITTED_TO_COLLEGE');
    expect(app.snapshots.length).toBe(2);

    // Verify Cycle 1 Snapshot remains completely untouched
    const snap1 = app.snapshots[0];
    expect(snap1.cycleNumber).toBe(1);
    expect(Number(snap1.snapshotDataJson.student.academic.previousPercentage)).toBe(68);

    // Verify Cycle 2 Snapshot has updated percentage
    const snap2 = app.snapshots[1];
    expect(snap2.cycleNumber).toBe(2);
    expect(Number(snap2.snapshotDataJson.student.academic.previousPercentage)).toBe(72.5);

    // Verify Cycle 1 Document Snapshots remain completely untouched
    const cycle1DocSnaps = app.documentSnapshots.filter((d) => d.cycleNumber === 1);
    const cycle1Income = cycle1DocSnaps.find((d) => d.documentType === 'INCOME_CERT');
    expect(cycle1Income.documentVersionId).toBe(incomeDocVersion1.id);

    // Verify Cycle 2 Document Snapshots link replacement version (v2) for Income and preserves v1 for Caste
    const cycle2DocSnaps = app.documentSnapshots.filter((d) => d.cycleNumber === 2);
    const cycle2Income = cycle2DocSnaps.find((d) => d.documentType === 'INCOME_CERT');
    const cycle2Caste = cycle2DocSnaps.find((d) => d.documentType === 'CASTE_CERT');
    expect(cycle2Income.documentVersionId).toBe(incomeDocVersion2.id);
    expect(cycle2Caste.documentVersionId).toBe(casteDocVersion1.id); // Caste cert was not changed; preserved!
  });

  await test('Test 15: Concurrency Safety: Duplicate resubmission attempt fails (status is not sent-back)', async () => {
    const res = await makeRequest(`/applications/${applicationId}/resubmit`, {
      method: 'POST',
      body: JSON.stringify({ confirmationAccepted: true }),
    }, studentACookie);

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Only applications sent back for correction can be resubmitted');
  });

  // ---------------------------------------------------------------------------
  // PART 5: AUTHORITY SEND-BACK ROUTING (Strictly through College Desk)
  // ---------------------------------------------------------------------------
  await test('Test 16: College accepts corrections and forwards to Authority: FORWARDED_TO_AUTHORITY', async () => {
    // Start scrutiny
    await makeRequest(`/applications/${applicationId}/review/start`, { method: 'POST' }, collegeCookie);

    // Forward
    const res = await makeRequest(`/applications/${applicationId}/review/decision`, {
      method: 'POST',
      body: JSON.stringify({
        decision: 'VERIFY_FORWARD',
        overallRemarks: 'Corrections verified against revised certificates. Forwarded to State Authority.',
      }),
    }, collegeCookie);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('FORWARDED_TO_AUTHORITY');
  });

  await test('Test 17: Authority starts scrutiny and sends back: AUTHORITY_SENT_BACK', async () => {
    // Start authority scrutiny
    await makeRequest(`/applications/${applicationId}/review/start`, { method: 'POST' }, authorityCookie);

    // Send back with correction
    const res = await makeRequest(`/applications/${applicationId}/review/decision`, {
      method: 'POST',
      body: JSON.stringify({
        decision: 'SEND_BACK',
        overallRemarks: 'Authority review: Course fee receipt missing proof of payment.',
        corrections: [
          {
            affectedSection: 'FINANCIAL',
            affectedField: 'bankAccountNo',
            rejectionCategory: 'INFORMATION_MISMATCH',
            reasonText: 'Account number check mismatch.',
            actionRequiredText: 'Confirm bank account number matches bank passbook.',
          },
        ],
      }),
    }, authorityCookie);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('AUTHORITY_SENT_BACK');
  });

  await test('Test 18: Authority send-back resubmission routes to RESUBMITTED_TO_COLLEGE (NOT directly to authority)', async () => {
    // Resolve correction
    const trackingRes = await makeRequest(`/applications/${applicationId}/tracking`, {}, studentACookie);
    const openCorr = trackingRes.body.tracking.correctionRequests.find((c) => c.status === 'OPEN');

    await makeRequest(`/applications/${applicationId}/corrections/${openCorr.id}/resolve`, {
      method: 'PATCH',
      body: JSON.stringify({
        studentResponseText: 'Re-confirmed bank account number matches nationalized bank passbook.',
      }),
    }, studentACookie);

    // Resubmit
    const res = await makeRequest(`/applications/${applicationId}/resubmit`, {
      method: 'POST',
      body: JSON.stringify({ confirmationAccepted: true }),
    }, studentACookie);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('RESUBMITTED_TO_COLLEGE'); // Must go to College desk!
  });

  // ---------------------------------------------------------------------------
  // PART 6: REVIEWER RE-SCRUTINY & RE-FLAGGING
  // ---------------------------------------------------------------------------
  await test('Test 19: Reviewer re-flagging a correction item moves status back to COLLEGE_SENT_BACK', async () => {
    // Put under review
    await makeRequest(`/applications/${applicationId}/review/start`, { method: 'POST' }, collegeCookie);

    const trackingRes = await makeRequest(`/applications/${applicationId}/tracking`, {}, studentACookie);
    const corrId = trackingRes.body.tracking.correctionRequests[0].id;

    // Re-flag item
    const res = await makeRequest(`/applications/${applicationId}/corrections/${corrId}/review`, {
      method: 'PATCH',
      body: JSON.stringify({
        decision: 'RE_FLAG',
        remarks: 'Resolution explanation is insufficient. Please re-upload.',
      }),
    }, collegeCookie);

    expect(res.status).toBe(200);
    expect(res.body.correction.status).toBe('RE_FLAGGED');

    const app = await prisma.application.findUnique({ where: { id: applicationId } });
    expect(app.status).toBe('COLLEGE_SENT_BACK');
  });

  // ---------------------------------------------------------------------------
  // PART 7: CANCELLATION & RIGHT TO GIVE UP (Strict Allowlist Enforcement)
  // ---------------------------------------------------------------------------
  await test('Test 20: Permitted student cancellation transitions application to CANCELLED', async () => {
    const res = await makeRequest(`/applications/${applicationId}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason: 'Student transferred to out-of-state university.' }),
    }, studentACookie);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('CANCELLED');

    const app = await prisma.application.findUnique({ where: { id: applicationId } });
    expect(app.status).toBe('CANCELLED');
  });

  await test('Test 21: Cancellation is BLOCKED from terminal CANCELLED status (returns 400)', async () => {
    const res = await makeRequest(`/applications/${applicationId}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason: 'Duplicate cancellation attempt.' }),
    }, studentACookie);

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Application cannot be cancelled from current status');
  });

  await test('Test 22: Right to Give Up is permitted for APPROVED applications and transitions to RIGHT_TO_GIVE_UP', async () => {
    const anotherScholarship = await prisma.scholarship.findFirst({
      where: { id: { not: scholarship.id } },
    });
    expect(anotherScholarship).toBeTruthy();

    const appApproved = await prisma.application.create({
      data: {
        studentId: (await prisma.studentProfile.findUnique({ where: { userId: studentAUser.id } })).id,
        scholarshipId: anotherScholarship.id,
        academicYear: '2024-2025',
        status: 'APPROVED',
        applicationNumber: `MH-2024-APPROVED-${Date.now()}`,
      },
    });

    const res = await makeRequest(`/applications/${appApproved.id}/right-to-give-up`, {
      method: 'POST',
      body: JSON.stringify({ reason: 'Availed Central Government Merit Scholarship.' }),
    }, studentACookie);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('RIGHT_TO_GIVE_UP');

    const updated = await prisma.application.findUnique({ where: { id: appApproved.id } });
    expect(updated.status).toBe('RIGHT_TO_GIVE_UP');
  });

  await test('Test 23: Right to Give Up is BLOCKED from invalid statuses (e.g. DRAFT or CANCELLED)', async () => {
    const res = await makeRequest(`/applications/${applicationId}/right-to-give-up`, {
      method: 'POST',
      body: JSON.stringify({ reason: 'Attempt from CANCELLED' }),
    }, studentACookie);

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Right to Give Up cannot be exercised from status');
  });

  } finally {
    console.log('\n[CLEANUP] Cleaning up Phase 6 ephemeral test records...');
    try {
      const userIds = [studentAUser?.id, studentBUser?.id, collegeUser?.id, authorityUser?.id].filter(Boolean);
      const studentProfiles = await prisma.studentProfile.findMany({
        where: { userId: { in: userIds } },
        select: { id: true },
      });
      const profileIds = studentProfiles.map((p) => p.id);

      const apps = await prisma.application.findMany({
        where: { studentId: { in: profileIds } },
        select: { id: true },
      });
      const appIds = apps.map((a) => a.id);
      if (applicationId && !appIds.includes(applicationId)) appIds.push(applicationId);

      if (appIds.length > 0) {
        await prisma.applicationAuditLog.deleteMany({ where: { applicationId: { in: appIds } } });
        await prisma.applicationCorrectionRequest.deleteMany({ where: { applicationId: { in: appIds } } });
        await prisma.applicationReview.deleteMany({ where: { applicationId: { in: appIds } } });
        await prisma.applicationDocumentSnapshot.deleteMany({ where: { applicationId: { in: appIds } } });
        await prisma.applicationSnapshot.deleteMany({ where: { applicationId: { in: appIds } } });
        await prisma.application.deleteMany({ where: { id: { in: appIds } } });
      }

      if (userIds.length > 0) {
        await prisma.notification.deleteMany({ where: { userId: { in: userIds } } });
        await prisma.documentVersion.deleteMany({ where: { document: { student: { userId: { in: userIds } } } } });
        await prisma.document.deleteMany({ where: { student: { userId: { in: userIds } } } });
        await prisma.studentProfile.deleteMany({ where: { userId: { in: userIds } } });
        await prisma.user.deleteMany({ where: { id: { in: userIds } } });
      }

      if (collegeRecord?.id) {
        await prisma.college.deleteMany({ where: { id: collegeRecord.id } });
      }
      console.log('[CLEANUP] Phase 6 test records cleaned up cleanly.');
    } catch (cleanErr) {
      console.error('[CLEANUP ERROR in Phase 6]', cleanErr);
    }
  }

  // ---------------------------------------------------------------------------
  // SUMMARY
  // ---------------------------------------------------------------------------
  console.log('\n====================================================');
  console.log(`PHASE 6 TEST SUITE COMPLETE: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('====================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTests()
  .catch((err) => {
    console.error('Fatal error during test run:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
