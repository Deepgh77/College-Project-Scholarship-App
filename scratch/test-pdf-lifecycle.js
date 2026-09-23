const assert = require('assert');
const { PDFParse } = require('pdf-parse');
const { prisma } = require('../src/config/prisma');

const BASE_URL = 'http://localhost:5000';

function createValidPdfBuffer(label = 'test') {
  return Buffer.from(
    `%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\nxref\n0 4\n0000000000 65535 f \n0000000010 00000 n \n0000000060 00000 n \n0000000117 00000 n \ntrailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n193\n%%EOF\n% ${label}` +
      ' '.repeat(1024)
  );
}

async function runPdfLifecycleTests() {
  console.log('============================================================');
  console.log('STARTING APPLICATION PDF LIFECYCLE VERIFICATION SUITE');
  console.log('============================================================\n');

  let passed = 0;
  let total = 0;

  async function test(desc, fn) {
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

  const ts = Date.now();
  const studentAEmail = `pdf.lifecycle.studentA.${ts}@test.local`;
  const studentBEmail = `pdf.lifecycle.studentB.${ts}@test.local`;
  const password = 'Password@123!';

  let studentACookie = '';
  let studentBCookie = '';
  let collegeCookie = '';

  let studentAUser = null;
  let studentBUser = null;
  let studentAProfile = null;
  let studentBProfile = null;
  let college = null;
  let scholarship = null;

  let appId = '';
  let arn = '';
  let cycle1SnapshotId = '';
  let cycle1SnapshotJson = null;

  let docIncomeId = '';
  let docIncomeV1Id = '';
  let docIncomeV2Id = '';

  try {
    // -------------------------------------------------------------------------
    // SETUP: Fixtures and authentication
    // -------------------------------------------------------------------------
    await test('Setup 1: Retrieve test scholarship and college', async () => {
      scholarship = await prisma.scholarship.findFirst({
        where: { code: 'SJD-SC-001' },
        include: { requiredDocuments: true, rules: true, department: true },
      });
      assert(scholarship, 'SJD-SC-001 scheme must exist');

      college = await prisma.college.findFirst({
        where: { code: 'ENG-PUN-001' },
      });
      assert(college, 'COEP college must exist');
    });

    await test('Setup 2: Register Student A & Student B', async () => {
      // Register Student A
      const resA = await fetch(`${BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: studentAEmail, password, confirmPassword: password }),
      });
      assert.strictEqual(resA.status, 201);
      const dataA = await resA.json();
      studentAUser = dataA.user;

      const loginResA = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: studentAEmail, password }),
      });
      assert.strictEqual(loginResA.status, 200);
      studentACookie = loginResA.headers.get('set-cookie');

      // Register Student B
      const resB = await fetch(`${BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: studentBEmail, password, confirmPassword: password }),
      });
      assert.strictEqual(resB.status, 201);
      const dataB = await resB.json();
      studentBUser = dataB.user;

      const loginResB = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: studentBEmail, password }),
      });
      assert.strictEqual(loginResB.status, 200);
      studentBCookie = loginResB.headers.get('set-cookie');

      // Login College Officer (for review/send back)
      const loginResCol = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'officer.coep@college.ac.in', password: 'Password@123' }),
      });
      assert.strictEqual(loginResCol.status, 200);
      collegeCookie = loginResCol.headers.get('set-cookie');
    });

    await test('Setup 3: Create complete Student A profile', async () => {
      const res = await fetch(`${BASE_URL}/api/student/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Cookie: studentACookie },
        body: JSON.stringify({
          fullName: 'Siddharth Ashok Patil',
          dob: '2003-05-15',
          gender: 'MALE',
          category: 'SC',
          mobile: '9876543210',
          addressLine1: 'Shivaji Nagar',
          city: 'Pune',
          district: 'Pune',
          state: 'Maharashtra',
          pincode: '411005',
          collegeId: college.id,
          courseName: 'Computer Engineering',
          courseYear: 2,
          admissionYear: 2024,
          annualFamilyIncome: 150000,
          bankAccountNo: '123456789012',
          bankIfsc: 'SBIN0001234',
          bankName: 'State Bank of India',
        }),
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      studentAProfile = data.profile;
    });

    // -------------------------------------------------------------------------
    // TEST 1: DRAFT STATE PDF PREVIEW & SUBMITTED ENDPOINT REJECTION
    // -------------------------------------------------------------------------
    await test('1. Draft State: GET /preview/pdf returns DRAFT-PREVIEW; GET /pdf returns 400', async () => {
      // Start application
      const startRes = await fetch(`${BASE_URL}/api/applications/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: studentACookie },
        body: JSON.stringify({ scholarshipId: scholarship.id }),
      });
      assert.strictEqual(startRes.status, 201);
      const startData = await startRes.json();
      appId = startData.application.id;
      assert.strictEqual(startData.application.status, 'DRAFT');

      // Preview PDF works for draft
      const previewRes = await fetch(`${BASE_URL}/api/applications/${appId}/preview/pdf`, {
        headers: { Cookie: studentACookie },
      });
      assert.strictEqual(previewRes.status, 200);
      assert.strictEqual(previewRes.headers.get('content-type'), 'application/pdf');

      const buf = Buffer.from(await previewRes.arrayBuffer());
      const parser = new PDFParse({ data: buf });
      const parsed = await parser.getText();
      assert(parsed.text.includes('DRAFT PREVIEW') || parsed.text.includes('DRAFT-PREVIEW'));
      assert(parsed.text.includes('Siddharth Ashok Patil'));

      // Submitted PDF endpoint MUST return 400 for unsubmitted draft
      const submittedRes = await fetch(`${BASE_URL}/api/applications/${appId}/pdf`, {
        headers: { Cookie: studentACookie },
      });
      assert.strictEqual(submittedRes.status, 400);
      const errData = await submittedRes.json();
      assert(errData.message.includes('not yet been submitted'));
    });

    // -------------------------------------------------------------------------
    // TEST 2: SUBMITTED STATE PDF (CYCLE 1)
    // -------------------------------------------------------------------------
    await test('2. Submitted State: GET /pdf returns Cycle 1 PDF with ARN and Income v1', async () => {
      // Upload 4 required documents for SJD-SC-001
      const docTypes = [
        { type: 'INCOME_CERT', name: 'income_v1.pdf' },
        { type: 'CASTE_CERT', name: 'caste_v1.pdf' },
        { type: 'MARKSHEET_PREV', name: 'marksheet_v1.pdf' },
        { type: 'DOMICILE_CERT', name: 'domicile_v1.pdf' },
      ];
      const selectedDocs = {};

      for (const d of docTypes) {
        const form = new FormData();
        form.append('file', new Blob([createValidPdfBuffer(d.name)], { type: 'application/pdf' }), d.name);
        form.append('documentType', d.type);
        const upRes = await fetch(`${BASE_URL}/api/documents/upload`, {
          method: 'POST',
          headers: { Cookie: studentACookie },
          body: form,
        });
        assert.strictEqual(upRes.status, 201);
        const upData = await upRes.json();
        const vId = upData.document?.currentVersion?.id;
        selectedDocs[d.type] = vId;
        if (d.type === 'INCOME_CERT') {
          docIncomeId = upData.document.id;
          docIncomeV1Id = vId;
        }
      }

      // Save draft questionnaire responses and documents
      const saveDraftRes = await fetch(`${BASE_URL}/api/applications/${appId}/draft`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Cookie: studentACookie },
        body: JSON.stringify({
          questionnaire: {
            admissionReceiptNo: 'REC-CYCLE1-1234',
            admissionDate: '2024-07-20',
            isAvailingOtherScholarship: false,
          },
          selectedDocuments: selectedDocs,
          declarationAccepted: true,
        }),
      });
      assert.strictEqual(saveDraftRes.status, 200);

      // Submit application
      const subRes = await fetch(`${BASE_URL}/api/applications/${appId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: studentACookie },
        body: JSON.stringify({ declarationAccepted: true }),
      });
      const subData = await subRes.json();
      if (subRes.status !== 200) {
        console.error('Submission failed with:', JSON.stringify(subData));
      }
      assert.strictEqual(subRes.status, 200);
      arn = subData.applicationNumber;

      // Verify Cycle 1 snapshot in DB
      const dbApp = await prisma.application.findUnique({
        where: { id: appId },
        include: { snapshots: true, documentSnapshots: true },
      });
      assert.strictEqual(dbApp.status, 'SUBMITTED');
      assert.strictEqual(dbApp.snapshots.length, 1);
      assert.strictEqual(dbApp.snapshots[0].cycleNumber, 1);
      cycle1SnapshotId = dbApp.snapshots[0].id;
      cycle1SnapshotJson = JSON.stringify(dbApp.snapshots[0].snapshotDataJson);

      // Fetch submitted PDF
      const pdfRes = await fetch(`${BASE_URL}/api/applications/${appId}/pdf`, {
        headers: { Cookie: studentACookie },
      });
      assert.strictEqual(pdfRes.status, 200);
      assert.strictEqual(pdfRes.headers.get('content-type'), 'application/pdf');

      const buf = Buffer.from(await pdfRes.arrayBuffer());
      const parser = new PDFParse({ data: buf });
      const parsed = await parser.getText();
      assert(parsed.text.includes(arn), 'Cycle 1 PDF must include ARN');
      assert(parsed.text.includes('STATUS: SUBMITTED'));
      assert(parsed.text.includes('income_v1.pdf'));
      assert(parsed.text.includes('REC-CYCLE1-1234'));
    });

    // -------------------------------------------------------------------------
    // TEST 3: COLLEGE_SENT_BACK STATE PDF
    // -------------------------------------------------------------------------
    await test('3. College Send Back: GET /pdf remains accessible and serves Cycle 1 PDF', async () => {
      // College starts review
      const startRevRes = await fetch(`${BASE_URL}/api/college/applications/${appId}/review/start`, {
        method: 'POST',
        headers: { Cookie: collegeCookie },
      });
      assert.strictEqual(startRevRes.status, 200);

      // College flags a document correction on Income Certificate
      const decRes = await fetch(`${BASE_URL}/api/college/applications/${appId}/review/decision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: collegeCookie },
        body: JSON.stringify({
          decision: 'SEND_BACK',
          overallRemarks: 'Please re-upload income certificate signed by competent authority.',
          corrections: [
            {
              affectedSection: 'DOCUMENT',
              affectedDocumentType: 'INCOME_CERT',
              rejectionCategory: 'INCORRECT_DOCUMENT',
              reasonText: 'The uploaded income certificate is unclear. Please upload a clear valid certificate.',
              actionRequiredText: 'Upload a certified Income Certificate in your document vault.',
            },
          ],
        }),
      });
      const decData = await decRes.json();
      if (decRes.status !== 200) {
        console.error('Review decision failed:', JSON.stringify(decData));
      }
      assert.strictEqual(decRes.status, 200);

      const dbApp = await prisma.application.findUnique({ where: { id: appId } });
      assert.strictEqual(dbApp.status, 'COLLEGE_SENT_BACK');

      // CRITICAL: Fetching PDF during COLLEGE_SENT_BACK MUST NOT throw 400!
      const pdfRes = await fetch(`${BASE_URL}/api/applications/${appId}/pdf`, {
        headers: { Cookie: studentACookie },
      });
      assert.strictEqual(pdfRes.status, 200, 'Must return 200 during COLLEGE_SENT_BACK, not 400');
      assert.strictEqual(pdfRes.headers.get('content-type'), 'application/pdf');

      const buf = Buffer.from(await pdfRes.arrayBuffer());
      const parser = new PDFParse({ data: buf });
      const parsed = await parser.getText();
      assert(parsed.text.includes(arn));
      assert(parsed.text.includes('income_v1.pdf'));
    });

    // -------------------------------------------------------------------------
    // TEST 4 & 5: RESUBMISSION & CYCLE 2 PDF
    // -------------------------------------------------------------------------
    await test('4 & 5. Student Resubmits: Cycle 2 PDF contains updated Income v2 and RESUBMITTED_TO_COLLEGE status', async () => {
      // Upload replacement Income Certificate (Version 2)
      const formV2 = new FormData();
      formV2.append('file', new Blob([createValidPdfBuffer('income_v2_signed.pdf')], { type: 'application/pdf' }), 'income_v2_signed.pdf');
      formV2.append('documentType', 'INCOME_CERT');
      const upV2Res = await fetch(`${BASE_URL}/api/documents/upload`, {
        method: 'POST',
        headers: { Cookie: studentACookie },
        body: formV2,
      });
      assert.strictEqual(upV2Res.status, 200);
      const v2Data = await upV2Res.json();
      assert.strictEqual(v2Data.versionNumber, 2);
      docIncomeV2Id = v2Data.document?.currentVersion?.id;

      // Get open corrections
      const corrRes = await fetch(`${BASE_URL}/api/applications/${appId}/corrections`, {
        headers: { Cookie: studentACookie },
      });
      assert.strictEqual(corrRes.status, 200);
      const corrData = await corrRes.json();
      assert(corrData.corrections.length > 0);
      const incomeCorr = corrData.corrections.find((c) => c.affectedDocumentType === 'INCOME_CERT');
      assert(incomeCorr, 'Income correction item must exist');

      // Resolve correction linking to Income v2
      const resCorrRes = await fetch(
        `${BASE_URL}/api/applications/${appId}/corrections/${incomeCorr.id}/resolve`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Cookie: studentACookie },
          body: JSON.stringify({
            resolvedDocumentVersionId: docIncomeV2Id,
            responseRemarks: 'Uploaded Tahsildar certified income certificate.',
          }),
        }
      );
      assert.strictEqual(resCorrRes.status, 200);

      // Student resubmits application
      const resubRes = await fetch(`${BASE_URL}/api/applications/${appId}/resubmit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: studentACookie },
        body: JSON.stringify({ confirmationAccepted: true }),
      });
      assert.strictEqual(resubRes.status, 200);
      const resubData = await resubRes.json();
      assert.strictEqual(resubData.status, 'RESUBMITTED_TO_COLLEGE');

      // CRITICAL: Fetching PDF in RESUBMITTED_TO_COLLEGE state MUST NOT throw 400!
      const pdfRes = await fetch(`${BASE_URL}/api/applications/${appId}/pdf`, {
        headers: { Cookie: studentACookie },
      });
      assert.strictEqual(pdfRes.status, 200, 'Must return 200 in RESUBMITTED_TO_COLLEGE state');
      assert.strictEqual(pdfRes.headers.get('content-type'), 'application/pdf');

      const buf = Buffer.from(await pdfRes.arrayBuffer());
      const parser = new PDFParse({ data: buf });
      const parsed = await parser.getText();

      // Verify Cycle 2 contents in PDF
      assert(parsed.text.includes(arn));
      assert(parsed.text.includes('STATUS: RESUBMITTED_TO_COLLEGE'));
      assert(
        parsed.text.includes('income_v2_signed.pdf'),
        'Cycle 2 PDF must reference updated income_v2_signed.pdf'
      );
    });

    // -------------------------------------------------------------------------
    // TEST 6: CYCLE 1 SNAPSHOT IMMUTABILITY
    // -------------------------------------------------------------------------
    await test('6. Cycle 1 Snapshot Immutability: Cycle 1 snapshot in DB remains strictly identical', async () => {
      const cycle1SnapInDb = await prisma.applicationSnapshot.findUnique({
        where: { id: cycle1SnapshotId },
      });
      assert(cycle1SnapInDb, 'Cycle 1 snapshot must still exist');
      assert.strictEqual(cycle1SnapInDb.cycleNumber, 1);
      assert.strictEqual(
        JSON.stringify(cycle1SnapInDb.snapshotDataJson),
        cycle1SnapshotJson,
        'Cycle 1 snapshotDataJson must remain completely frozen and unmodified'
      );

      // Request explicit Cycle 1 PDF
      const pdfC1Res = await fetch(`${BASE_URL}/api/applications/${appId}/pdf?cycle=1`, {
        headers: { Cookie: studentACookie },
      });
      assert.strictEqual(pdfC1Res.status, 200);
      const bufC1 = Buffer.from(await pdfC1Res.arrayBuffer());
      const parserC1 = new PDFParse({ data: bufC1 });
      const parsedC1 = await parserC1.getText();
      assert(parsedC1.text.includes('income_v1.pdf'), 'Cycle 1 PDF must still contain income_v1.pdf');
    });

    // -------------------------------------------------------------------------
    // TEST 7 & 8: CYCLE 2 SNAPSHOT & DOCUMENT VERSION ACCURACY
    // -------------------------------------------------------------------------
    await test('7 & 8. Cycle 2 Document Snapshots: Cycle 2 references Income v2 while Cycle 1 preserves Income v1', async () => {
      const docSnaps = await prisma.applicationDocumentSnapshot.findMany({
        where: { applicationId: appId },
        include: { documentVersion: true },
        orderBy: [{ cycleNumber: 'asc' }, { documentType: 'asc' }],
      });

      const cycle1Docs = docSnaps.filter((d) => d.cycleNumber === 1);
      const cycle2Docs = docSnaps.filter((d) => d.cycleNumber === 2);

      assert.strictEqual(cycle1Docs.length, 4, 'Cycle 1 must have 4 document snapshots');
      assert.strictEqual(cycle2Docs.length, 4, 'Cycle 2 must have 4 document snapshots');

      const c1Income = cycle1Docs.find((d) => d.documentType === 'INCOME_CERT');
      const c2Income = cycle2Docs.find((d) => d.documentType === 'INCOME_CERT');

      assert.strictEqual(c1Income.documentVersionId, docIncomeV1Id, 'Cycle 1 references v1');
      assert.strictEqual(c2Income.documentVersionId, docIncomeV2Id, 'Cycle 2 references v2');
    });

    // -------------------------------------------------------------------------
    // TEST 9, 10, 11: COLLEGE, AUTHORITY, ADMIN SCRUTINY ACCESS
    // -------------------------------------------------------------------------
    await test('9, 10, 11. Scrutiny document access works for permitted roles; direct student endpoint rejects non-students', async () => {
      // College officer can preview document via /api/college/applications/:id/documents/:versionId/preview
      const colPrevRes = await fetch(
        `${BASE_URL}/api/college/applications/${appId}/documents/${docIncomeV2Id}/preview`,
        { headers: { Cookie: collegeCookie } }
      );
      assert.strictEqual(colPrevRes.status, 200);
      assert.strictEqual(colPrevRes.headers.get('content-type'), 'application/pdf');

      // Non-student attempting direct student endpoint /api/applications/:id/pdf gets 403 Forbidden
      const colDirectRes = await fetch(`${BASE_URL}/api/applications/${appId}/pdf`, {
        headers: { Cookie: collegeCookie },
      });
      assert.strictEqual(colDirectRes.status, 403, 'College direct call to student endpoint must be 403');
    });

    // -------------------------------------------------------------------------
    // TEST 12: IDOR DEFENSE
    // -------------------------------------------------------------------------
    await test('12. IDOR Defense: Student B cannot access Student A application PDF (returns 404)', async () => {
      const idorRes = await fetch(`${BASE_URL}/api/applications/${appId}/pdf`, {
        headers: { Cookie: studentBCookie },
      });
      assert.strictEqual(idorRes.status, 404, 'Must return 404 Not Found for unauthorized student');

      const idorPrevRes = await fetch(`${BASE_URL}/api/applications/${appId}/preview/pdf`, {
        headers: { Cookie: studentBCookie },
      });
      assert.strictEqual(idorPrevRes.status, 404, 'Must return 404 Not Found for unauthorized student preview');
    });

    console.log('\n============================================================');
    console.log(`PDF LIFECYCLE SUITE COMPLETE: ${passed}/${total} PASSED, 0 FAILED`);
    console.log('============================================================\n');
  } finally {
    // Deterministic cleanup
    console.log('[CLEANUP] Cleaning up isolated test fixtures...');
    try {
      if (appId) {
        await prisma.applicationAuditLog.deleteMany({ where: { applicationId: appId } });
        await prisma.applicationReview.deleteMany({ where: { applicationId: appId } });
        await prisma.applicationCorrectionRequest.deleteMany({ where: { applicationId: appId } });
        await prisma.applicationDocumentSnapshot.deleteMany({ where: { applicationId: appId } });
        await prisma.applicationSnapshot.deleteMany({ where: { applicationId: appId } });
        await prisma.application.deleteMany({ where: { id: appId } });
      }
      if (studentAUser) {
        await prisma.notification.deleteMany({ where: { userId: studentAUser.id } });
        await prisma.documentVersion.deleteMany({ where: { document: { student: { userId: studentAUser.id } } } });
        await prisma.document.deleteMany({ where: { student: { userId: studentAUser.id } } });
        await prisma.studentProfile.deleteMany({ where: { userId: studentAUser.id } });
        await prisma.user.deleteMany({ where: { id: studentAUser.id } });
      }
      if (studentBUser) {
        await prisma.notification.deleteMany({ where: { userId: studentBUser.id } });
        await prisma.studentProfile.deleteMany({ where: { userId: studentBUser.id } });
        await prisma.user.deleteMany({ where: { id: studentBUser.id } });
      }
      console.log('[CLEANUP] Isolated test fixtures cleaned up successfully.');
    } catch (cleanErr) {
      console.error('[CLEANUP ERROR]', cleanErr);
    }
    await prisma.$disconnect();
  }
}

runPdfLifecycleTests().catch((err) => {
  console.error('\n❌ PDF LIFECYCLE SUITE FAILED:', err);
  process.exit(1);
});
