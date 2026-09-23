const assert = require('assert');
const { PDFParse } = require('pdf-parse');
const { prisma } = require('../src/config/prisma');

const BASE_URL = 'http://localhost:5000';

function createValidPdfBuffer() {
  return Buffer.from(
    '%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\nxref\n0 4\n0000000000 65535 f \n0000000010 00000 n \n0000000060 00000 n \n0000000117 00000 n \ntrailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n193\n%%EOF\n' +
      ' '.repeat(1024)
  );
}

function createValidPngBuffer() {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const padding = Buffer.alloc(1100, 0x00);
  return Buffer.concat([sig, padding]);
}

async function runPdfPreviewTests() {
  console.log('====================================================');
  console.log('STARTING PHASE 5 QA FIXES: PDF PREVIEW & DOCUMENT PREVIEW TESTS');
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
  const studentAEmail = `pdf.qa.student.a.${timestamp}@example.com`;
  const studentBEmail = `pdf.qa.student.b.${timestamp}@example.com`;
  const password = 'StrongPassword123!';

  let cookieStudentA = '';
  let cookieStudentB = '';
  let studentAProfile = null;
  let studentBProfile = null;

  let scScholarship = null;
  let studentAIncomeDocId = '';
  let studentAIncomeDocVersionId = '';
  let studentACasteDocId = '';
  let studentACasteDocVersionId = '';
  let studentAMarksheetDocId = '';
  let studentAMarksheetDocVersionId = '';
  let studentADomicileDocId = '';
  let studentADomicileDocVersionId = '';

  let createdApplicationId = '';
  let generatedArn = '';
  let college = null;

  try {
  // Setup: Fetch target scholarship SJD-SC-001
  await testAsync('Setup: Fetch active scholarship SJD-SC-001', async () => {
    scScholarship = await prisma.scholarship.findFirst({
      where: { code: 'SJD-SC-001' },
      include: { requiredDocuments: true, rules: true },
    });
    assert(scScholarship, 'SJD-SC-001 must exist');
  });

  // Setup: Register Student A & Student B
  await testAsync('Setup: Register Student A (SC) and Student B (OBC)', async () => {
    // Student A
    const regA = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: studentAEmail, password, confirmPassword: password }),
    });
    assert.strictEqual(regA.status, 201);
    const loginA = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: studentAEmail, password }),
    });
    cookieStudentA = loginA.headers.get('set-cookie').split(';')[0];

    // Student B
    const regB = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: studentBEmail, password, confirmPassword: password }),
    });
    assert.strictEqual(regB.status, 201);
    const loginB = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: studentBEmail, password }),
    });
    cookieStudentB = loginB.headers.get('set-cookie').split(';')[0];

    // Create dedicated ephemeral test college (isolated from master COEP)
    college = await prisma.college.create({
      data: {
        code: `TEST_COLLEGE_P5_PDF_${timestamp}`,
        name: `Test Ephemeral College P5 PDF ${timestamp}`,
        university: 'Test University Pune',
        district: 'Pune',
        taluka: 'Haveli',
        isActive: true,
      },
    });

    // Student A profile
    const profA = await fetch(`${BASE_URL}/api/student/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: cookieStudentA },
      body: JSON.stringify({
        fullName: 'Govind Narayan Shinde',
        category: 'SC',
        dob: '2003-05-15',
        gender: 'MALE',
        mobile: '9822112233',
        annualFamilyIncome: 175000,
        collegeId: college.id,
        courseName: 'Bachelor of Computer Applications',
        courseYear: 2,
        admissionYear: 2023,
        previousQualification: 'HSC',
        previousPercentage: 78.5,
        state: 'Maharashtra',
        district: 'Pune',
        bankName: 'Bank of Maharashtra',
        bankAccountNo: '60112233445',
        bankIfsc: 'MAHB0000123',
      }),
    });
    assert.strictEqual(profA.status, 200);
    const dataA = await profA.json();
    studentAProfile = dataA.profile;

    // Student B profile
    const profB = await fetch(`${BASE_URL}/api/student/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: cookieStudentB },
      body: JSON.stringify({
        fullName: 'Suresh Patil',
        category: 'OBC',
        annualFamilyIncome: 200000,
        state: 'Maharashtra',
      }),
    });
    assert.strictEqual(profB.status, 200);
    const dataB = await profB.json();
    studentBProfile = dataB.profile;
  });

  // Setup: Upload Documents for Student A (PDF Income Cert + PNG Caste Cert)
  await testAsync('Setup: Upload PDF Income Certificate and PNG Caste Certificate to Student A vault', async () => {
    // 1. Income Cert (PDF)
    const formIncome = new FormData();
    formIncome.append('file', new Blob([createValidPdfBuffer()], { type: 'application/pdf' }), 'income_certificate.pdf');
    formIncome.append('documentType', 'INCOME_CERT');
    const resIncome = await fetch(`${BASE_URL}/api/documents/upload`, {
      method: 'POST',
      headers: { Cookie: cookieStudentA },
      body: formIncome,
    });
    assert.strictEqual(resIncome.status, 201);
    const dataIncome = await resIncome.json();
    studentAIncomeDocId = dataIncome.document.id;
    studentAIncomeDocVersionId = dataIncome.document.currentVersion.id;

    // 2. Caste Cert (PNG)
    const formCaste = new FormData();
    formCaste.append('file', new Blob([createValidPngBuffer()], { type: 'image/png' }), 'caste_certificate.png');
    formCaste.append('documentType', 'CASTE_CERT');
    const resCaste = await fetch(`${BASE_URL}/api/documents/upload`, {
      method: 'POST',
      headers: { Cookie: cookieStudentA },
      body: formCaste,
    });
    assert.strictEqual(resCaste.status, 201);
    const dataCaste = await resCaste.json();
    studentACasteDocId = dataCaste.document.id;
    studentACasteDocVersionId = dataCaste.document.currentVersion.id;

    // 3. Marksheet (PDF)
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
    studentAMarksheetDocId = dataMarksheet.document.id;
    studentAMarksheetDocVersionId = dataMarksheet.document.currentVersion.id;

    // 4. Domicile (PDF)
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
    studentADomicileDocId = dataDomicile.document.id;
    studentADomicileDocVersionId = dataDomicile.document.currentVersion.id;
  });

  // Test 1: Start Application Draft and Verify Document Checklist contains parent documentId and fileSizeFormatted
  await testAsync('Test 1: Application documents checklist provides parent documentId and fileSizeFormatted for preview', async () => {
    const res = await fetch(`${BASE_URL}/api/applications/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookieStudentA },
      body: JSON.stringify({ scholarshipId: scScholarship.id }),
    });
    assert.strictEqual(res.status, 201);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    createdApplicationId = data.application.id;

    const incomeItem = data.application.documentsChecklist.find((d) => d.documentType === 'INCOME_CERT');
    assert(incomeItem, 'INCOME_CERT must be in checklist');
    assert.strictEqual(incomeItem.documentId, studentAIncomeDocId, 'Must provide parent documentId');
    assert.strictEqual(incomeItem.attachedVersion.documentId, studentAIncomeDocId);
    assert(incomeItem.attachedVersion.fileSizeFormatted, 'Must provide formatted file size');

    const casteItem = data.application.documentsChecklist.find((d) => d.documentType === 'CASTE_CERT');
    assert(casteItem, 'CASTE_CERT must be in checklist');
    assert.strictEqual(casteItem.documentId, studentACasteDocId, 'Must provide parent documentId');
    assert.strictEqual(casteItem.attachedVersion.mimeType, 'image/png');
  });

  // Test 2: Document Preview inline endpoints (PDF & PNG)
  await testAsync('Test 2: GET /api/documents/:id/preview streams current version inline with correct Content-Type', async () => {
    // Preview PDF
    const pdfRes = await fetch(`${BASE_URL}/api/documents/${studentAIncomeDocId}/preview`, {
      headers: { Cookie: cookieStudentA },
    });
    assert.strictEqual(pdfRes.status, 200);
    assert.strictEqual(pdfRes.headers.get('content-type'), 'application/pdf');
    const pdfDisp = pdfRes.headers.get('content-disposition') || '';
    assert(pdfDisp.includes('inline'), `Must be inline, got: ${pdfDisp}`);

    // Preview PNG
    const pngRes = await fetch(`${BASE_URL}/api/documents/${studentACasteDocId}/preview`, {
      headers: { Cookie: cookieStudentA },
    });
    assert.strictEqual(pngRes.status, 200);
    assert.strictEqual(pngRes.headers.get('content-type'), 'image/png');
    const pngDisp = pngRes.headers.get('content-disposition') || '';
    assert(pngDisp.includes('inline'), `Must be inline, got: ${pngDisp}`);
  });

  // Test 3: Version-specific inline preview endpoint
  await testAsync('Test 3: GET /api/documents/:id/versions/:versionId/preview streams specific version inline', async () => {
    const res = await fetch(
      `${BASE_URL}/api/documents/${studentAIncomeDocId}/versions/${studentAIncomeDocVersionId}/preview`,
      { headers: { Cookie: cookieStudentA } }
    );
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers.get('content-type'), 'application/pdf');
    const disp = res.headers.get('content-disposition') || '';
    assert(disp.includes('inline'), `Must be inline, got: ${disp}`);
  });

  // Test 4: Document Preview IDOR Protection
  await testAsync('Test 4: Student B cannot preview Student A documents (returns 404)', async () => {
    const res1 = await fetch(`${BASE_URL}/api/documents/${studentAIncomeDocId}/preview`, {
      headers: { Cookie: cookieStudentB },
    });
    assert.strictEqual(res1.status, 404);

    const res2 = await fetch(
      `${BASE_URL}/api/documents/${studentAIncomeDocId}/versions/${studentAIncomeDocVersionId}/preview`,
      { headers: { Cookie: cookieStudentB } }
    );
    assert.strictEqual(res2.status, 404);
  });

  // Test 5: Save draft questionnaire
  await testAsync('Test 5: Save draft questionnaire responses', async () => {
    const res = await fetch(`${BASE_URL}/api/applications/${createdApplicationId}/draft`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: cookieStudentA },
      body: JSON.stringify({
        questionnaire: {
          admissionReceiptNo: 'REC-2024-5544',
          admissionDate: '2024-07-25',
          isAvailingOtherScholarship: false,
        },
        selectedDocuments: {
          INCOME_CERT: studentAIncomeDocVersionId,
          CASTE_CERT: studentACasteDocVersionId,
          MARKSHEET_PREV: studentAMarksheetDocVersionId,
          DOMICILE_CERT: studentADomicileDocVersionId,
        },
        declarationAccepted: true,
      }),
    });
    assert.strictEqual(res.status, 200);
  });

  // Test 6: Pre-Submission Application PDF Preview
  await testAsync('Test 6: GET /api/applications/:id/preview/pdf returns application/pdf with DRAFT-PREVIEW content', async () => {
    const res = await fetch(`${BASE_URL}/api/applications/${createdApplicationId}/preview/pdf`, {
      headers: { Cookie: cookieStudentA },
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers.get('content-type'), 'application/pdf');
    const disp = res.headers.get('content-disposition') || '';
    assert(disp.includes('inline'), `Pre-submission preview must be inline, got: ${disp}`);

    const arrayBuffer = await res.arrayBuffer();
    const pdfBuf = Buffer.from(arrayBuffer);
    assert(pdfBuf.length > 500, 'PDF buffer must be non-empty');

    // Parse text content using PDFParse
    const parser = new PDFParse({ data: pdfBuf });
    const parsed = await parser.getText();
    const text = parsed.text;

    // Verify draft watermark and student facts in actual PDF content
    assert(text.includes('DRAFT-PREVIEW') || text.includes('DRAFT PREVIEW'), 'PDF content must identify draft preview');
    assert(text.includes('Govind Narayan Shinde'), 'PDF content must contain applicant name');
    assert(text.includes('SJD-SC-001'), 'PDF content must contain scheme code');
    assert(text.includes('REC-2024-5544'), 'PDF content must contain questionnaire answer');
  });

  // Test 7: User Adjustment #3: Verify pre-submission preview DOES NOT create or mutate ApplicationSnapshot or ApplicationDocumentSnapshot
  await testAsync('Test 7: Pre-submission PDF preview does NOT create or modify ApplicationSnapshot or ApplicationDocumentSnapshot', async () => {
    const snapshotCount = await prisma.applicationSnapshot.count({
      where: { applicationId: createdApplicationId },
    });
    assert.strictEqual(snapshotCount, 0, 'ApplicationSnapshot count must remain strictly 0 during preview');

    const docSnapshotCount = await prisma.applicationDocumentSnapshot.count({
      where: { applicationId: createdApplicationId },
    });
    assert.strictEqual(docSnapshotCount, 0, 'ApplicationDocumentSnapshot count must remain strictly 0 during preview');

    const app = await prisma.application.findUnique({
      where: { id: createdApplicationId },
    });
    assert.strictEqual(app.status, 'DRAFT', 'Application status must remain strictly DRAFT after preview');
  });

  // Test 8: Submit Application and generate ARN
  await testAsync('Test 8: Final submission transitions DRAFT to SUBMITTED and assigns ARN', async () => {
    const res = await fetch(`${BASE_URL}/api/applications/${createdApplicationId}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookieStudentA },
      body: JSON.stringify({ declarationAccepted: true }),
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert(data.applicationNumber.startsWith('MHA-'), `Must start with MHA-, got: ${data.applicationNumber}`);
    generatedArn = data.applicationNumber;

    const submittedApp = await prisma.application.findUnique({
      where: { id: createdApplicationId },
      include: { snapshots: true, documentSnapshots: true },
    });
    assert.strictEqual(submittedApp.status, 'SUBMITTED');
    assert.strictEqual(submittedApp.snapshots.length, 1, 'Exactly one ApplicationSnapshot created');
    assert(submittedApp.documentSnapshots.length >= 4, 'Document snapshots created');
  });

  // Test 9: User Adjustment #1 & #2: Submitted Application PDF Preview & Content Verification
  await testAsync('Test 9: GET /api/applications/:id/pdf returns application/pdf and contains generated ARN in actual PDF content', async () => {
    const res = await fetch(`${BASE_URL}/api/applications/${createdApplicationId}/pdf`, {
      headers: { Cookie: cookieStudentA },
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers.get('content-type'), 'application/pdf');
    const disp = res.headers.get('content-disposition') || '';
    assert(disp.includes('inline'), `Submitted view must be inline by default, got: ${disp}`);

    const arrayBuffer = await res.arrayBuffer();
    const pdfBuf = Buffer.from(arrayBuffer);
    assert(pdfBuf.length > 1000, 'PDF buffer must be non-empty');

    // Extract text from actual PDF binary content
    const parser = new PDFParse({ data: pdfBuf });
    const parsed = await parser.getText();
    const text = parsed.text;

    // Verify ARN from actual PDF text content (User Adjustment #1)
    assert(
      text.includes(generatedArn),
      `PDF text must contain generated ARN "${generatedArn}". Extracted: ${text.slice(0, 300)}...`
    );
    assert(text.includes('Govind Narayan Shinde'), 'PDF must contain student name');
    assert(text.includes('SJD-SC-001'), 'PDF must contain scheme code');
    assert(text.includes('SUBMITTED'), 'PDF must contain SUBMITTED status');

    // Verify User Adjustment #2: Document checklist/version info is included
    assert(text.includes('income_certificate.pdf') || text.includes('INCOME_CERT'), 'PDF must list income certificate');
    assert(text.includes('caste_certificate.png') || text.includes('CASTE_CERT'), 'PDF must list caste certificate');
  });

  // Test 10: PDF Download Query Parameter
  await testAsync('Test 10: GET /api/applications/:id/pdf?download=true returns Content-Disposition: attachment', async () => {
    const res = await fetch(`${BASE_URL}/api/applications/${createdApplicationId}/pdf?download=true`, {
      headers: { Cookie: cookieStudentA },
    });
    assert.strictEqual(res.status, 200);
    const disp = res.headers.get('content-disposition') || '';
    assert(disp.includes('attachment'), `Must be attachment on download=true, got: ${disp}`);
    assert(disp.includes(`${generatedArn}.pdf`), `Filename must be ${generatedArn}.pdf, got: ${disp}`);
  });

  // Test 11: User Requirement E (Immutability): Changing StudentProfile does NOT alter submitted PDF
  await testAsync('Test 11: Immutability: Mutating student profile in DB does NOT alter submitted PDF content', async () => {
    // Mutate StudentProfile directly in PostgreSQL
    await prisma.studentProfile.update({
      where: { id: studentAProfile.id },
      data: {
        fullName: 'MUTATED HACKER NAME THAT MUST NOT APPEAR IN FROZEN PDF',
        annualFamilyIncome: 999999,
      },
    });

    // Request submitted application PDF again
    const res = await fetch(`${BASE_URL}/api/applications/${createdApplicationId}/pdf`, {
      headers: { Cookie: cookieStudentA },
    });
    assert.strictEqual(res.status, 200);
    const arrayBuffer = await res.arrayBuffer();
    const pdfBuf = Buffer.from(arrayBuffer);

    const parser = new PDFParse({ data: pdfBuf });
    const parsed = await parser.getText();
    const text = parsed.text;

    assert(
      !text.includes('MUTATED HACKER NAME'),
      'Submitted PDF must NOT reflect post-submission student profile mutations!'
    );
    assert(
      text.includes('Govind Narayan Shinde'),
      'Submitted PDF must preserve the frozen student name from ApplicationSnapshot'
    );
  });

  // Test 12: User Requirement E (Immutability): Replacing a document in vault does NOT alter submitted PDF
  await testAsync('Test 12: Immutability: Uploading replacement version in Document Vault does NOT alter submitted PDF', async () => {
    // Upload replacement Income Certificate (Version 2) in vault
    const formV2 = new FormData();
    formV2.append('file', new Blob([createValidPdfBuffer()], { type: 'application/pdf' }), 'income_cert_v2_new.pdf');
    formV2.append('documentType', 'INCOME_CERT');
    const resUploadV2 = await fetch(`${BASE_URL}/api/documents/upload`, {
      method: 'POST',
      headers: { Cookie: cookieStudentA },
      body: formV2,
    });
    assert.strictEqual(resUploadV2.status, 200, 'Re-uploading existing doc type returns 200 (version replacement)');
    const v2Data = await resUploadV2.json();
    assert.strictEqual(v2Data.versionNumber, 2);

    // Request submitted application PDF again
    const res = await fetch(`${BASE_URL}/api/applications/${createdApplicationId}/pdf`, {
      headers: { Cookie: cookieStudentA },
    });
    assert.strictEqual(res.status, 200);
    const arrayBuffer = await res.arrayBuffer();
    const pdfBuf = Buffer.from(arrayBuffer);

    const parser = new PDFParse({ data: pdfBuf });
    const parsed = await parser.getText();
    const text = parsed.text;

    assert(
      !text.includes('income_cert_v2_new.pdf'),
      'Submitted PDF must NOT reflect replacement document version uploaded post-submission!'
    );
    assert(
      text.includes('income_certificate.pdf'),
      'Submitted PDF must preserve the exact document version from ApplicationDocumentSnapshot'
    );
  });

  // Test 13: IDOR Protection for Submitted Application PDF
  await testAsync('Test 13: Student B cannot access Student A submitted application PDF (returns 404)', async () => {
    const res = await fetch(`${BASE_URL}/api/applications/${createdApplicationId}/pdf`, {
      headers: { Cookie: cookieStudentB },
    });
    assert.strictEqual(res.status, 404, 'Must return 404 for unauthorized student');
  });

  // Test 14: Submitted Application in GET /api/applications/:id populates documentsChecklist from snapshots
  await testAsync('Test 14: GET /api/applications/:id for submitted application provides documentsChecklist with documentId for preview', async () => {
    const res = await fetch(`${BASE_URL}/api/applications/${createdApplicationId}`, {
      headers: { Cookie: cookieStudentA },
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.application.status, 'SUBMITTED');

    const incomeItem = data.application.documentsChecklist.find((d) => d.documentType === 'INCOME_CERT');
    assert(incomeItem, 'INCOME_CERT must be in checklist of submitted application');
    assert.strictEqual(incomeItem.documentId, studentAIncomeDocId);
    assert.strictEqual(incomeItem.attachedVersion.originalFilename, 'income_certificate.pdf');
    assert.strictEqual(incomeItem.attachedVersion.versionNumber, 1, 'Must reference submitted v1, not current v2');
  });

  } finally {
    console.log('\n[CLEANUP] Cleaning up Phase 5 PDF test records...');
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
      console.log('[CLEANUP] Phase 5 PDF test records cleaned up cleanly.');
    } catch (cleanErr) {
      console.error('[CLEANUP ERROR in Phase 5 PDF]', cleanErr);
    }
    await prisma.$disconnect();
  }

  console.log('\n====================================================');
  console.log(`PHASE 5 QA FIXES TESTS COMPLETE: ${passed}/${total} PASSED (100%)`);
  console.log('====================================================\n');
}

runPdfPreviewTests().catch((err) => {
  console.error('Phase 5 QA Fixes Test Suite Failed:', err);
  process.exit(1);
});
