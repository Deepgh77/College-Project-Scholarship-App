const assert = require('assert');
const { prisma } = require('../src/config/prisma');

const BASE_URL = 'http://localhost:5000';

function createValidPdfBuffer() {
  return Buffer.from(
    '%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\nxref\n0 4\n0000000000 65535 f \n0000000010 00000 n \n0000000060 00000 n \n0000000117 00000 n \ntrailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n193\n%%EOF\n' +
      ' '.repeat(1024)
  );
}

async function runPhase5Tests() {
  console.log('====================================================');
  console.log('STARTING PHASE 5 APPLICATION CREATION & SUBMISSION TEST SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let total = 0;

  async function testAsync(desc, fn) {
    total++;
    try {
      await fn();
      passed++;
      console.log(`[PASS] ${desc}`);
    } catch (err) {
      console.error(`[FAIL] ${desc}:`, err.message);
      throw err;
    }
  }

  const timestamp = Date.now();
  const studentAEmail = `app.student.a.${timestamp}@example.com`;
  const studentBEmail = `app.student.b.${timestamp}@example.com`;
  const password = 'StrongPassword123!';

  let cookieStudentA = '';
  let cookieStudentB = '';
  let studentAProfile = null;
  let studentBProfile = null;

  let scScholarship = null;
  let archivedScholarship = null;

  let studentAIncomeDocVersionId = '';
  let studentACasteDocVersionId = '';
  let studentAMarksheetDocVersionId = '';
  let studentADomicileDocVersionId = '';
  let studentBIncomeDocVersionId = '';

  let createdApplicationId = '';
  let college = null;

  try {
  // Setup 1: Fetch target scholarships
  await testAsync('Setup: Fetch active and archived scholarships from DB', async () => {
    scScholarship = await prisma.scholarship.findFirst({
      where: { code: 'SJD-SC-001' },
      include: { requiredDocuments: true, rules: true },
    });
    assert(scScholarship, 'SJD-SC-001 must exist in DB');

    archivedScholarship = await prisma.scholarship.findFirst({
      where: { code: 'SJD-ARCHIVED-007' },
    });
    assert(archivedScholarship, 'SJD-ARCHIVED-007 must exist in DB');
  });

  // Setup 2: Register & Initialize Student A (SC Category, Eligible for SJD-SC-001)
  await testAsync('Setup: Register Student A & initialize complete SC profile', async () => {
    const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: studentAEmail, password, confirmPassword: password }),
    });
    assert.strictEqual(regRes.status, 201);

    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: studentAEmail, password }),
    });
    assert.strictEqual(loginRes.status, 200);
    cookieStudentA = loginRes.headers.get('set-cookie').split(';')[0];

    // Create dedicated ephemeral test college (isolated from master COEP)
    college = await prisma.college.create({
      data: {
        code: `TEST_COLLEGE_P5_APP_${timestamp}`,
        name: `Test Ephemeral College P5 App ${timestamp}`,
        university: 'Test University Pune',
        district: 'Pune',
        taluka: 'Haveli',
        isActive: true,
      },
    });

    const profRes = await fetch(`${BASE_URL}/api/student/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: cookieStudentA },
      body: JSON.stringify({
        fullName: 'Amitabh Ramdas Kamble',
        category: 'SC',
        dob: '2003-04-12',
        gender: 'MALE',
        mobile: '9822012345',
        annualFamilyIncome: 180000,
        collegeId: college.id,
        courseName: 'Bachelor of Computer Applications',
        courseYear: 2,
        admissionYear: 2023,
        previousQualification: 'HSC',
        previousPercentage: 75.5,
        state: 'Maharashtra',
        district: 'Pune',
        bankName: 'Bank of Maharashtra',
        bankAccountNo: '60123456789',
        bankIfsc: 'MAHB0000123',
      }),
    });
    assert.strictEqual(profRes.status, 200);
    const profData = await profRes.json();
    studentAProfile = profData.profile;
  });

  // Setup 3: Register & Initialize Student B (OBC Category, Not eligible for SC scholarship)
  await testAsync('Setup: Register Student B & initialize OBC profile', async () => {
    const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: studentBEmail, password, confirmPassword: password }),
    });
    assert.strictEqual(regRes.status, 201);

    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: studentBEmail, password }),
    });
    assert.strictEqual(loginRes.status, 200);
    cookieStudentB = loginRes.headers.get('set-cookie').split(';')[0];

    const profRes = await fetch(`${BASE_URL}/api/student/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: cookieStudentB },
      body: JSON.stringify({
        fullName: 'Vijay Shinde',
        category: 'OBC',
        annualFamilyIncome: 150000,
      }),
    });
    assert.strictEqual(profRes.status, 200);
    const profData = await profRes.json();
    studentBProfile = profData.profile;
  });

  // Setup 4: Upload certificates to vault
  await testAsync('Setup: Upload Income and Caste certificates to Student A vault', async () => {
    // Income Cert for Student A
    const formA1 = new FormData();
    formA1.append('file', new Blob([createValidPdfBuffer()], { type: 'application/pdf' }), 'income_cert.pdf');
    formA1.append('documentType', 'INCOME_CERT');
    const resA1 = await fetch(`${BASE_URL}/api/documents/upload`, {
      method: 'POST',
      headers: { Cookie: cookieStudentA },
      body: formA1,
    });
    assert.strictEqual(resA1.status, 201);
    const dataA1 = await resA1.json();
    studentAIncomeDocVersionId = dataA1.document.currentVersion.id;

    // Caste Cert for Student A
    const formA2 = new FormData();
    formA2.append('file', new Blob([createValidPdfBuffer()], { type: 'application/pdf' }), 'caste_cert.pdf');
    formA2.append('documentType', 'CASTE_CERT');
    const resA2 = await fetch(`${BASE_URL}/api/documents/upload`, {
      method: 'POST',
      headers: { Cookie: cookieStudentA },
      body: formA2,
    });
    assert.strictEqual(resA2.status, 201);
    const dataA2 = await resA2.json();
    studentACasteDocVersionId = dataA2.document.currentVersion.id;

    // Income Cert for Student B
    const formB = new FormData();
    formB.append('file', new Blob([createValidPdfBuffer()], { type: 'application/pdf' }), 'income_b.pdf');
    formB.append('documentType', 'INCOME_CERT');
    const resB = await fetch(`${BASE_URL}/api/documents/upload`, {
      method: 'POST',
      headers: { Cookie: cookieStudentB },
      body: formB,
    });
    assert.strictEqual(resB.status, 201);
    const dataB = await resB.json();
    studentBIncomeDocVersionId = dataB.document.currentVersion.id;
  });

  // Test 1: Window Enforcement on Start
  await testAsync('Test 1: Starting application on inactive/archived scholarship is rejected with 400', async () => {
    const res = await fetch(`${BASE_URL}/api/applications/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookieStudentA },
      body: JSON.stringify({ scholarshipId: archivedScholarship.id }),
    });
    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.strictEqual(data.success, false);
    assert(data.message.includes('inactive') || data.message.includes('closed'));
  });

  // Test 2: Eligibility Gate on Start
  await testAsync('Test 2: Ineligible student (Student B / OBC) starting SC scholarship is rejected with 403', async () => {
    const res = await fetch(`${BASE_URL}/api/applications/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookieStudentB },
      body: JSON.stringify({ scholarshipId: scScholarship.id }),
    });
    assert.strictEqual(res.status, 403);
    const data = await res.json();
    assert.strictEqual(data.success, false);
    assert(data.message.includes('eligibility criteria'));
  });

  // Test 3: Creation & Auto-Resolution of Mandatory Documents
  await testAsync('Test 3: Eligible student starting application creates DRAFT with auto-attached mandatory vault documents', async () => {
    const res = await fetch(`${BASE_URL}/api/applications/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookieStudentA },
      body: JSON.stringify({ scholarshipId: scScholarship.id }),
    });
    assert.strictEqual(res.status, 201);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.isResumed, false);
    assert.strictEqual(data.application.status, 'DRAFT');
    createdApplicationId = data.application.id;

    // Verify mandatory documents were automatically resolved from vault
    const incomeCheck = data.application.documentsChecklist.find((d) => d.documentType === 'INCOME_CERT');
    assert(incomeCheck, 'INCOME_CERT must be in checklist');
    assert.strictEqual(incomeCheck.isMandatory, true);
    assert.strictEqual(incomeCheck.status, 'ATTACHED');
    assert.strictEqual(incomeCheck.attachedVersionId, studentAIncomeDocVersionId);

    const casteCheck = data.application.documentsChecklist.find((d) => d.documentType === 'CASTE_CERT');
    assert(casteCheck, 'CASTE_CERT must be in checklist');
    assert.strictEqual(casteCheck.isMandatory, true);
    assert.strictEqual(casteCheck.status, 'ATTACHED');
    assert.strictEqual(casteCheck.attachedVersionId, studentACasteDocVersionId);

    // Verify optional documents (if any) are NOT automatically attached
    const optionalDocs = data.application.documentsChecklist.filter((d) => !d.isMandatory);
    for (const opt of optionalDocs) {
      assert.strictEqual(opt.status, 'NOT_ATTACHED', 'Optional documents must not be auto-attached');
    }
  });

  // Test 4: Draft Resumption (Zero Duplicate Applications)
  await testAsync('Test 4: Calling /start again for same scholarship resumes existing draft without creating duplicate', async () => {
    const res = await fetch(`${BASE_URL}/api/applications/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookieStudentA },
      body: JSON.stringify({ scholarshipId: scScholarship.id }),
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.isResumed, true);
    assert.strictEqual(data.application.id, createdApplicationId);

    // Verify count in DB is exactly 1
    const count = await prisma.application.count({
      where: { studentId: studentAProfile.id, scholarshipId: scScholarship.id },
    });
    assert.strictEqual(count, 1, 'Must have exactly 1 application record');
  });

  // Test 5: Save Draft Questionnaire Responses
  await testAsync('Test 5: PUT /api/applications/:id/draft saves questionnaire responses and updates healthScore', async () => {
    const res = await fetch(`${BASE_URL}/api/applications/${createdApplicationId}/draft`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: cookieStudentA },
      body: JSON.stringify({
        questionnaire: {
          admissionReceiptNo: 'REC-2024-9988',
          admissionDate: '2024-07-20',
          isAvailingOtherScholarship: false,
        },
        selectedDocuments: {
          INCOME_CERT: studentAIncomeDocVersionId,
          CASTE_CERT: studentACasteDocVersionId,
        },
        declarationAccepted: true,
      }),
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert(data.healthScore > 50, 'Health score must increase');
    assert.strictEqual(data.application.questionnaireResponses.admissionReceiptNo, 'REC-2024-9988');
  });

  // Test 6: IDOR Protection on Draft
  await testAsync('Test 6: Student B cannot view or update Student A draft application (returns 404)', async () => {
    const getRes = await fetch(`${BASE_URL}/api/applications/${createdApplicationId}`, {
      headers: { Cookie: cookieStudentB },
    });
    assert.strictEqual(getRes.status, 404);

    const putRes = await fetch(`${BASE_URL}/api/applications/${createdApplicationId}/draft`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: cookieStudentB },
      body: JSON.stringify({ questionnaire: { admissionReceiptNo: 'HACKED' } }),
    });
    assert.strictEqual(putRes.status, 404);
  });

  // Test 7: Cross-Tenant Document Tampering Blocked
  await testAsync('Test 7: Student A cannot attach Student B document version (returns 403)', async () => {
    const res = await fetch(`${BASE_URL}/api/applications/${createdApplicationId}/draft`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: cookieStudentA },
      body: JSON.stringify({
        selectedDocuments: {
          INCOME_CERT: studentBIncomeDocVersionId, // Student B's document!
        },
      }),
    });
    assert.strictEqual(res.status, 403);
    const data = await res.json();
    assert.strictEqual(data.success, false);
    assert(data.message.includes('do not exist in your vault'));
  });

  // Test 8: Readiness Check (Negative: missing mandatory documents block submission)
  await testAsync('Test 8a: GET /api/applications/:id/readiness blocks submission when mandatory documents missing', async () => {
    const res = await fetch(`${BASE_URL}/api/applications/${createdApplicationId}/readiness`, {
      headers: { Cookie: cookieStudentA },
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.isReady, false, 'Must be false when mandatory docs missing');
    assert(data.blockerCount > 0, 'Must have at least one blocker');
    const docBlockers = data.blockers.filter((b) => b.code === 'MISSING_MANDATORY_DOCUMENT');
    assert(docBlockers.some((b) => b.documentType === 'MARKSHEET_PREV'));
    assert(docBlockers.some((b) => b.documentType === 'DOMICILE_CERT'));
  });

  // Test 8b: Satisfy all mandatory documents and verify isReady=true
  await testAsync('Test 8b: GET /api/applications/:id/readiness returns isReady=true when all criteria satisfied', async () => {
    // Upload missing mandatory documents to Student A's vault
    const formMarksheet = new FormData();
    formMarksheet.append('file', new Blob([createValidPdfBuffer()], { type: 'application/pdf' }), 'marksheet.pdf');
    formMarksheet.append('documentType', 'MARKSHEET_PREV');
    const resMarksheet = await fetch(`${BASE_URL}/api/documents/upload`, {
      method: 'POST',
      headers: { Cookie: cookieStudentA },
      body: formMarksheet,
    });
    assert.strictEqual(resMarksheet.status, 201);
    const dataMarksheet = await resMarksheet.json();
    studentAMarksheetDocVersionId = dataMarksheet.document.currentVersion.id;

    const formDomicile = new FormData();
    formDomicile.append('file', new Blob([createValidPdfBuffer()], { type: 'application/pdf' }), 'domicile.pdf');
    formDomicile.append('documentType', 'DOMICILE_CERT');
    const resDomicile = await fetch(`${BASE_URL}/api/documents/upload`, {
      method: 'POST',
      headers: { Cookie: cookieStudentA },
      body: formDomicile,
    });
    assert.strictEqual(resDomicile.status, 201);
    const dataDomicile = await resDomicile.json();
    studentADomicileDocVersionId = dataDomicile.document.currentVersion.id;

    // Attach all 4 mandatory documents in draft
    const updateDraftRes = await fetch(`${BASE_URL}/api/applications/${createdApplicationId}/draft`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: cookieStudentA },
      body: JSON.stringify({
        selectedDocuments: {
          INCOME_CERT: studentAIncomeDocVersionId,
          CASTE_CERT: studentACasteDocVersionId,
          MARKSHEET_PREV: studentAMarksheetDocVersionId,
          DOMICILE_CERT: studentADomicileDocVersionId,
        },
        declarationAccepted: true,
      }),
    });
    assert.strictEqual(updateDraftRes.status, 200);

    // Verify readiness is now 100% ready
    const res = await fetch(`${BASE_URL}/api/applications/${createdApplicationId}/readiness`, {
      headers: { Cookie: cookieStudentA },
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    if (!data.isReady) {
      console.log('Test 8b blockers:', JSON.stringify(data.blockers, null, 2));
    }
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.isReady, true);
    assert.strictEqual(data.readinessScore, 100);
    assert.strictEqual(data.blockerCount, 0);
  });

  // Test 9: Preview Endpoint
  await testAsync('Test 9: GET /api/applications/:id/preview aggregates full pre-submission payload', async () => {
    const res = await fetch(`${BASE_URL}/api/applications/${createdApplicationId}/preview`, {
      headers: { Cookie: cookieStudentA },
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.preview.studentSummary.fullName, 'Amitabh Ramdas Kamble');
    assert.strictEqual(data.preview.scholarship.code, 'SJD-SC-001');
    assert.strictEqual(data.preview.readiness.isReady, true);
  });

  // Test 10: Concurrency-Safe Final Submission
  await testAsync('Test 10: Atomic submission transitions DRAFT to SUBMITTED and generates ARN', async () => {
    const res = await fetch(`${BASE_URL}/api/applications/${createdApplicationId}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookieStudentA },
      body: JSON.stringify({ declarationAccepted: true }),
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert(data.applicationNumber.startsWith('MHA-'), `ARN must start with MHA-, got: ${data.applicationNumber}`);

    // Verify DB state
    const submittedApp = await prisma.application.findUnique({
      where: { id: createdApplicationId },
      include: {
        snapshots: true,
        documentSnapshots: true,
        auditLogs: true,
      },
    });
    assert.strictEqual(submittedApp.status, 'SUBMITTED');
    assert.strictEqual(submittedApp.draftDataJson, null, 'Working draft must be cleared upon submission');
    assert.strictEqual(submittedApp.snapshots.length, 1, 'Exactly one ApplicationSnapshot must exist');
    assert.strictEqual(submittedApp.snapshots[0].cycleNumber, 1);
    assert(submittedApp.documentSnapshots.length >= 2, 'Mandatory document snapshots must be created');
    assert(submittedApp.auditLogs.some((l) => l.action === 'APPLICATION_SUBMITTED'));
  });

  // Test 11: Concurrency Protection (Double-Submit Blocked)
  await testAsync('Test 11: Re-submitting an already submitted application is blocked with 400', async () => {
    const res = await fetch(`${BASE_URL}/api/applications/${createdApplicationId}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookieStudentA },
      body: JSON.stringify({ declarationAccepted: true }),
    });
    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.strictEqual(data.success, false);
    assert(data.message.includes('already been submitted'));
  });

  // Test 12: Submitted Application Immutability
  await testAsync('Test 12: Modifying submitted application via /draft is rejected with 403', async () => {
    const res = await fetch(`${BASE_URL}/api/applications/${createdApplicationId}/draft`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: cookieStudentA },
      body: JSON.stringify({ questionnaire: { admissionReceiptNo: 'NEW-REC' } }),
    });
    assert.strictEqual(res.status, 403);
    const data = await res.json();
    assert.strictEqual(data.success, false);
    assert(data.message.includes('Submitted applications cannot be modified'));
  });

  // Test 13: Document Deletion Protection for Submitted Application
  await testAsync('Test 13: Deleting a document version referenced by a submitted application is blocked with 409', async () => {
    const studentAIncomeDoc = await prisma.document.findFirst({
      where: { studentId: studentAProfile.id, documentType: 'INCOME_CERT' },
    });

    const delRes = await fetch(`${BASE_URL}/api/documents/${studentAIncomeDoc.id}`, {
      method: 'DELETE',
      headers: { Cookie: cookieStudentA },
    });
    assert.strictEqual(delRes.status, 409, 'Referenced document deletion must return 409 Conflict');
  });

  // Test 14: List Applications
  await testAsync('Test 14: GET /api/applications returns submitted application with ARN and status', async () => {
    const res = await fetch(`${BASE_URL}/api/applications`, {
      headers: { Cookie: cookieStudentA },
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.applications.length, 1);
    assert.strictEqual(data.applications[0].status, 'SUBMITTED');
    assert(data.applications[0].applicationNumber.startsWith('MHA-'));
  });

  } finally {
    console.log('\n[CLEANUP] Cleaning up Phase 5 applications test records...');
    try {
      const testUsers = await prisma.user.findMany({
        where: { email: { in: [studentAEmail, studentBEmail] } },
        select: { id: true, studentProfile: { select: { id: true } } },
      });
      const userIds = testUsers.map((u) => u.id);
      const profileIds = testUsers.map((u) => u.studentProfile?.id).filter(Boolean);

      const apps = await prisma.application.findMany({
        where: { studentId: { in: profileIds } },
        select: { id: true },
      });
      const appIds = apps.map((a) => a.id);
      if (createdApplicationId && !appIds.includes(createdApplicationId)) appIds.push(createdApplicationId);

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

      if (college?.id) {
        await prisma.college.deleteMany({ where: { id: college.id } });
      }
      console.log('[CLEANUP] Phase 5 applications test records cleaned up cleanly.');
    } catch (cleanErr) {
      console.error('[CLEANUP ERROR in Phase 5 applications]', cleanErr);
    }
    await prisma.$disconnect();
  }

  console.log('\n====================================================');
  console.log(`PHASE 5 TESTS COMPLETE: ${passed}/${total} PASSED (100%)`);
  console.log('====================================================\n');
}

runPhase5Tests().catch((err) => {
  console.error('Phase 5 Test Suite Failed:', err);
  process.exit(1);
});
