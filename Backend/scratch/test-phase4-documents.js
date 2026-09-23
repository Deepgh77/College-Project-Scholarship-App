const assert = require('assert');
const path = require('path');
const fs = require('fs');
const { prisma } = require('../src/config/prisma');
const bcrypt = require('bcryptjs');

const BASE_URL = 'http://localhost:5000';

// Helper to create valid sample buffers
function createValidPdfBuffer() {
  // Minimal valid PDF structure with %PDF- header
  return Buffer.from(
    '%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\nxref\n0 4\n0000000000 65535 f \n0000000010 00000 n \n0000000060 00000 n \n0000000117 00000 n \ntrailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n193\n%%EOF\n' +
      ' '.repeat(1024) // Pad above 1KB
  );
}

function createValidPngBuffer() {
  // PNG signature: 0x89 0x50 0x4E 0x47 0x0D 0x0A 0x1A 0x0A
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const padding = Buffer.alloc(1100, 0x00);
  return Buffer.concat([sig, padding]);
}

function createFakePdfBuffer() {
  // Disguised .txt file with .pdf extension
  return Buffer.from('This is just plain text masquerading as a PDF file.' + ' '.repeat(1024));
}

async function runPhase4Tests() {
  console.log('====================================================');
  console.log('STARTING PHASE 4 DOCUMENT MANAGEMENT TEST SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let total = 0;

  function test(desc, fn) {
    total++;
    try {
      fn();
      passed++;
      console.log(`[PASS] ${desc}`);
    } catch (err) {
      console.error(`[FAIL] ${desc}:`, err.message);
      throw err;
    }
  }

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
  const studentAEmail = `doc.student.a.${timestamp}@example.com`;
  const studentBEmail = `doc.student.b.${timestamp}@example.com`;
  const collegeEmail = `doc.college.${timestamp}@example.com`;
  const password = 'StrongPassword123!';

  let cookieStudentA = '';
  let cookieStudentB = '';
  let cookieCollege = '';

  try {
  // Setup: Register and authenticate Student A
  await testAsync('Setup: Register Student A & initialize profile', async () => {
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
    const cookieHeader = loginRes.headers.get('set-cookie');
    assert(cookieHeader, 'Must receive auth cookie');
    cookieStudentA = cookieHeader.split(';')[0];

    // Initialize profile for Student A
    const profRes = await fetch(`${BASE_URL}/api/student/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: cookieStudentA },
      body: JSON.stringify({ fullName: 'Student A', category: 'SC' }),
    });
    assert.strictEqual(profRes.status, 200);
  });

  // Setup: Register and authenticate Student B (for IDOR testing)
  await testAsync('Setup: Register Student B & initialize profile', async () => {
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
    const cookieHeader = loginRes.headers.get('set-cookie');
    cookieStudentB = cookieHeader.split(';')[0];

    // Initialize profile for Student B
    const profRes = await fetch(`${BASE_URL}/api/student/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: cookieStudentB },
      body: JSON.stringify({ fullName: 'Student B', category: 'OPEN' }),
    });
    assert.strictEqual(profRes.status, 200);
  });

  // Setup: Create a COLLEGE user in DB to test role restrictions
  await testAsync('Setup: Seed COLLEGE user for role restriction test', async () => {
    const passwordHash = await bcrypt.hash(password, 10);

    await prisma.user.create({
      data: {
        email: collegeEmail,
        passwordHash,
        role: 'COLLEGE',
      },
    });

    // Login via public auth endpoint to obtain genuine session cookie
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: collegeEmail, password }),
    });
    assert.strictEqual(loginRes.status, 200);
    const cookieHeader = loginRes.headers.get('set-cookie');
    assert(cookieHeader, 'Must receive auth cookie for college user');
    cookieCollege = cookieHeader.split(';')[0];
  });

  // Test 1: Supported Document Types endpoint
  await testAsync('Test 1: GET /api/documents/types returns 8 supported document types', async () => {
    const res = await fetch(`${BASE_URL}/api/documents/types`, {
      headers: { Cookie: cookieStudentA },
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.types.length, 8);
    const incomeType = data.types.find((t) => t.documentType === 'INCOME_CERT');
    assert(incomeType, 'INCOME_CERT must exist');
    assert.strictEqual(incomeType.label, 'Income Certificate');
  });

  // Test 2: List empty documents initially
  await testAsync('Test 2: GET /api/documents returns empty list for new student', async () => {
    const res = await fetch(`${BASE_URL}/api/documents`, {
      headers: { Cookie: cookieStudentA },
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.count, 0);
    assert.deepStrictEqual(data.documents, []);
  });

  // Test 3: Unauthorized & Non-Student Role Access
  await testAsync('Test 3: Unauthenticated access returns 401', async () => {
    const res = await fetch(`${BASE_URL}/api/documents`);
    assert.strictEqual(res.status, 401);
  });

  await testAsync('Test 4: Non-student role (COLLEGE) returns 403 Forbidden', async () => {
    const res = await fetch(`${BASE_URL}/api/documents`, {
      headers: { Cookie: cookieCollege },
    });
    assert.strictEqual(res.status, 403);
    const data = await res.json();
    assert.strictEqual(data.success, false);
    assert(data.message.includes('Access restricted to [STUDENT]'));
  });

  // Test 5: Validation - Invalid DocumentType
  await testAsync('Test 5: Upload with invalid documentType is rejected with 400', async () => {
    const formData = new FormData();
    const pdfBlob = new Blob([createValidPdfBuffer()], { type: 'application/pdf' });
    formData.append('file', pdfBlob, 'income.pdf');
    formData.append('documentType', 'INVALID_TYPE');

    const res = await fetch(`${BASE_URL}/api/documents/upload`, {
      method: 'POST',
      headers: { Cookie: cookieStudentA },
      body: formData,
    });
    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.strictEqual(data.success, false);
    assert(data.message.includes('Invalid document type'));
  });

  // Test 6: Validation - Magic Bytes & Extension Mismatch (Fake PDF)
  await testAsync('Test 6: Disguised text file with .pdf extension rejected via magic-byte check', async () => {
    const formData = new FormData();
    const fakeBlob = new Blob([createFakePdfBuffer()], { type: 'application/pdf' });
    formData.append('file', fakeBlob, 'fake.pdf');
    formData.append('documentType', 'INCOME_CERT');

    const res = await fetch(`${BASE_URL}/api/documents/upload`, {
      method: 'POST',
      headers: { Cookie: cookieStudentA },
      body: formData,
    });
    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.strictEqual(data.success, false);
    assert(data.message.includes('File signature verification failed'));
  });

  // Test 7: Validation - Disallowed file extension (.exe)
  await testAsync('Test 7: Disallowed file extension (.exe) rejected with 400', async () => {
    const formData = new FormData();
    const exeBlob = new Blob([Buffer.alloc(2000, 0x4d)], { type: 'application/octet-stream' });
    formData.append('file', exeBlob, 'malware.exe');
    formData.append('documentType', 'INCOME_CERT');

    const res = await fetch(`${BASE_URL}/api/documents/upload`, {
      method: 'POST',
      headers: { Cookie: cookieStudentA },
      body: formData,
    });
    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.strictEqual(data.success, false);
    assert(data.message.includes('Only PDF, JPG, and PNG files are allowed'));
  });

  // Test 8: Validation - Empty / Corrupt file (< 1 KB)
  await testAsync('Test 8: Empty file (< 1 KB) rejected with 400', async () => {
    const formData = new FormData();
    const tinyBlob = new Blob([Buffer.from('%PDF-1.4\n')], { type: 'application/pdf' });
    formData.append('file', tinyBlob, 'tiny.pdf');
    formData.append('documentType', 'INCOME_CERT');

    const res = await fetch(`${BASE_URL}/api/documents/upload`, {
      method: 'POST',
      headers: { Cookie: cookieStudentA },
      body: formData,
    });
    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.strictEqual(data.success, false);
    assert(data.message.includes('minimum file size is 1 KB'));
  });

  let studentADocId = '';
  let studentAVersion1Id = '';

  // Test 9: Valid PDF Upload (Initial Version 1)
  await testAsync('Test 9: Upload valid PDF Income Certificate creates Version 1', async () => {
    const formData = new FormData();
    const pdfBlob = new Blob([createValidPdfBuffer()], { type: 'application/pdf' });
    formData.append('file', pdfBlob, 'tahsildar_income_2025.pdf');
    formData.append('documentType', 'INCOME_CERT');

    const res = await fetch(`${BASE_URL}/api/documents/upload`, {
      method: 'POST',
      headers: { Cookie: cookieStudentA },
      body: formData,
    });
    assert.strictEqual(res.status, 201);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.isReplacement, false);
    assert.strictEqual(data.versionNumber, 1);
    assert.strictEqual(data.document.documentType, 'INCOME_CERT');
    assert.strictEqual(data.document.currentVersionNumber, 1);
    assert.strictEqual(data.document.currentVersion.versionNumber, 1);
    assert.strictEqual(data.document.currentVersion.originalFilename, 'tahsildar_income_2025.pdf');
    assert.strictEqual(data.document.currentVersion.mimeType, 'application/pdf');

    studentADocId = data.document.id;
    studentAVersion1Id = data.document.currentVersion.id;
  });

  // Test 10: Valid PNG Upload (Caste Certificate)
  let studentACasteDocId = '';
  await testAsync('Test 10: Upload valid PNG Caste Certificate creates Version 1', async () => {
    const formData = new FormData();
    const pngBlob = new Blob([createValidPngBuffer()], { type: 'image/png' });
    formData.append('file', pngBlob, 'caste_certificate.png');
    formData.append('documentType', 'CASTE_CERT');

    const res = await fetch(`${BASE_URL}/api/documents/upload`, {
      method: 'POST',
      headers: { Cookie: cookieStudentA },
      body: formData,
    });
    assert.strictEqual(res.status, 201);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.document.documentType, 'CASTE_CERT');
    assert.strictEqual(data.document.currentVersion.mimeType, 'image/png');
    studentACasteDocId = data.document.id;
  });

  // Test 11: List Documents now returns 2 documents
  await testAsync('Test 11: GET /api/documents returns 2 uploaded documents', async () => {
    const res = await fetch(`${BASE_URL}/api/documents`, {
      headers: { Cookie: cookieStudentA },
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.count, 2);
    assert(data.documents.some((d) => d.documentType === 'INCOME_CERT'));
    assert(data.documents.some((d) => d.documentType === 'CASTE_CERT'));
  });

  // Test 12: Document Replacement (New Version 2)
  let studentAVersion2Id = '';
  await testAsync('Test 12: Re-uploading INCOME_CERT creates Version 2 and preserves Version 1', async () => {
    const formData = new FormData();
    const updatedPdfBlob = new Blob([createValidPdfBuffer()], { type: 'application/pdf' });
    formData.append('file', updatedPdfBlob, 'updated_income_cert_2025.pdf');
    formData.append('documentType', 'INCOME_CERT');

    const res = await fetch(`${BASE_URL}/api/documents/upload`, {
      method: 'POST',
      headers: { Cookie: cookieStudentA },
      body: formData,
    });
    assert.strictEqual(res.status, 200); // 200 OK for replacement
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.isReplacement, true);
    assert.strictEqual(data.versionNumber, 2);
    assert.strictEqual(data.document.id, studentADocId, 'Document ID must remain the same');
    assert.strictEqual(data.document.currentVersionNumber, 2);
    assert.strictEqual(data.document.versionCount, 2);
    assert.strictEqual(data.document.currentVersion.versionNumber, 2);
    assert.strictEqual(data.document.currentVersion.originalFilename, 'updated_income_cert_2025.pdf');

    studentAVersion2Id = data.document.currentVersion.id;
    assert.notStrictEqual(studentAVersion1Id, studentAVersion2Id);

    // Verify history contains both versions
    assert.strictEqual(data.document.history.length, 2);
    assert.strictEqual(data.document.history[0].versionNumber, 2);
    assert.strictEqual(data.document.history[1].versionNumber, 1);
    assert.strictEqual(data.document.history[1].originalFilename, 'tahsildar_income_2025.pdf');
  });

  // Test 13: Direct DB & Filesystem Check for Version 1 and Version 2
  await testAsync('Test 13: Verify DB and disk persistence for both Version 1 & 2', async () => {
    const v1Record = await prisma.documentVersion.findUnique({ where: { id: studentAVersion1Id } });
    const v2Record = await prisma.documentVersion.findUnique({ where: { id: studentAVersion2Id } });

    assert(v1Record, 'Version 1 record must exist in PostgreSQL');
    assert(v2Record, 'Version 2 record must exist in PostgreSQL');
    assert.strictEqual(v1Record.versionNumber, 1);
    assert.strictEqual(v2Record.versionNumber, 2);

    // Verify both physical files exist on disk
    assert.strictEqual(fs.existsSync(v1Record.storagePath), true, 'Version 1 file must exist on disk');
    assert.strictEqual(fs.existsSync(v2Record.storagePath), true, 'Version 2 file must exist on disk');
    assert.notStrictEqual(v1Record.storagePath, v2Record.storagePath, 'Storage paths must be distinct');
  });

  // Test 14: Secure Preview and Download
  await testAsync('Test 14: Preview current document streams inline with correct headers', async () => {
    const res = await fetch(`${BASE_URL}/api/documents/${studentADocId}/preview`, {
      headers: { Cookie: cookieStudentA },
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers.get('content-type'), 'application/pdf');
    assert(res.headers.get('content-disposition').includes('inline'));
    assert.strictEqual(res.headers.get('x-content-type-options'), 'nosniff');
  });

  await testAsync('Test 15: Download current document streams as attachment', async () => {
    const res = await fetch(`${BASE_URL}/api/documents/${studentADocId}/download`, {
      headers: { Cookie: cookieStudentA },
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers.get('content-type'), 'application/pdf');
    assert(res.headers.get('content-disposition').includes('attachment'));
    assert(res.headers.get('content-disposition').includes('updated_income_cert_2025.pdf'));
  });

  await testAsync('Test 16: Download historical Version 1 streams original file', async () => {
    const res = await fetch(
      `${BASE_URL}/api/documents/${studentADocId}/versions/${studentAVersion1Id}/download`,
      { headers: { Cookie: cookieStudentA } }
    );
    assert.strictEqual(res.status, 200);
    assert(res.headers.get('content-disposition').includes('tahsildar_income_2025.pdf'));
  });

  // Test 17 & 18: IDOR Protection (Student B cannot access or download Student A's document)
  await testAsync('Test 17: IDOR Check - Student B cannot view Student A document metadata (returns 404)', async () => {
    const res = await fetch(`${BASE_URL}/api/documents/${studentADocId}`, {
      headers: { Cookie: cookieStudentB },
    });
    assert.strictEqual(res.status, 404, 'IDOR request must return 404 Not Found');
    const data = await res.json();
    assert.strictEqual(data.success, false);
  });

  await testAsync('Test 18: IDOR Check - Student B cannot preview or download Student A file (returns 404)', async () => {
    const previewRes = await fetch(`${BASE_URL}/api/documents/${studentADocId}/preview`, {
      headers: { Cookie: cookieStudentB },
    });
    assert.strictEqual(previewRes.status, 404, 'IDOR preview must return 404');

    const downloadRes = await fetch(`${BASE_URL}/api/documents/${studentADocId}/download`, {
      headers: { Cookie: cookieStudentB },
    });
    assert.strictEqual(downloadRes.status, 404, 'IDOR download must return 404');

    const verDownloadRes = await fetch(
      `${BASE_URL}/api/documents/${studentADocId}/versions/${studentAVersion1Id}/download`,
      { headers: { Cookie: cookieStudentB } }
    );
    assert.strictEqual(verDownloadRes.status, 404, 'IDOR version download must return 404');
  });

  // Test 19: Path Traversal defense in filename
  await testAsync('Test 19: Filename with path traversal sequences is sanitized', async () => {
    const formData = new FormData();
    const pdfBlob = new Blob([createValidPdfBuffer()], { type: 'application/pdf' });
    formData.append('file', pdfBlob, '../../../../etc/passwd.pdf');
    formData.append('documentType', 'DOMICILE_CERT');

    const res = await fetch(`${BASE_URL}/api/documents/upload`, {
      method: 'POST',
      headers: { Cookie: cookieStudentA },
      body: formData,
    });
    assert.strictEqual(res.status, 201);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    // Verify stored path does not escape storage
    const version = await prisma.documentVersion.findUnique({
      where: { id: data.document.currentVersion.id },
    });
    assert(!version.storagePath.includes('..'), 'Storage path must never contain ..');
    assert(version.storagePath.startsWith(path.resolve('storage/documents')));
  });

  // Test 20: Safe Document Deletion for unreferenced document
  await testAsync('Test 20: Unreferenced document can be safely deleted with disk cleanup', async () => {
    const delRes = await fetch(`${BASE_URL}/api/documents/${studentACasteDocId}`, {
      method: 'DELETE',
      headers: { Cookie: cookieStudentA },
    });
    assert.strictEqual(delRes.status, 200);
    const data = await delRes.json();
    assert.strictEqual(data.success, true);

    // Verify DB record is gone
    const checkDb = await prisma.document.findUnique({ where: { id: studentACasteDocId } });
    assert.strictEqual(checkDb, null, 'Deleted document must not exist in DB');
  });

  // Test 21: Snapshot Reference blocks deletion (Simulated Application Snapshot)
  await testAsync('Test 21: Deletion is blocked if document is referenced by an Application Snapshot', async () => {
    // 1. Create a dummy Scholarship if none exists
    const scholarship = await prisma.scholarship.findFirst();

    // 2. Create a dummy Application and Snapshot referencing studentAVersion1Id
    const studentProfile = await prisma.studentProfile.findFirst({
      where: { user: { email: studentAEmail } },
    });

    const dummyApp = await prisma.application.create({
      data: {
        studentId: studentProfile.id,
        scholarshipId: scholarship.id,
        academicYear: '2024-2025',
        status: 'SUBMITTED',
      },
    });

    const snapshot = await prisma.applicationDocumentSnapshot.create({
      data: {
        applicationId: dummyApp.id,
        cycleNumber: 1,
        documentVersionId: studentAVersion1Id,
        documentType: 'INCOME_CERT',
      },
    });

    // 3. Attempt to delete studentADocId -> MUST FAIL with 409 Conflict
    const delRes = await fetch(`${BASE_URL}/api/documents/${studentADocId}`, {
      method: 'DELETE',
      headers: { Cookie: cookieStudentA },
    });
    assert.strictEqual(delRes.status, 409, 'Referenced document deletion must return 409 Conflict');
    const delData = await delRes.json();
    assert.strictEqual(delData.success, false);
    assert(delData.message.includes('cannot be deleted'));

    // Cleanup the dummy test application fixture
    await prisma.applicationDocumentSnapshot.delete({ where: { id: snapshot.id } });
    await prisma.application.delete({ where: { id: dummyApp.id } });
  });

  // Test 22: Compress & Upload - Initial upload with isCompressed: 'true'
  await testAsync('Test 22: Initial upload with isCompressed: true persists isCompressed=true in DB', async () => {
    const formData = new FormData();
    const pngBlob = new Blob([createValidPngBuffer()], { type: 'image/png' });
    formData.append('file', pngBlob, 'compressed_marksheet.png');
    formData.append('documentType', 'MARKSHEET_PREV');
    formData.append('isCompressed', 'true');

    const res = await fetch(`${BASE_URL}/api/documents/upload`, {
      method: 'POST',
      headers: { Cookie: cookieStudentA },
      body: formData,
    });
    assert.strictEqual(res.status, 201);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.document.currentVersion.isCompressed, true);

    // Verify DB record directly
    const dbVersion = await prisma.documentVersion.findUnique({
      where: { id: data.document.currentVersion.id },
    });
    assert.strictEqual(dbVersion.isCompressed, true, 'DB record must store isCompressed: true');
  });

  // Test 23: Normal Upload - Initial upload without isCompressed or isCompressed: 'false'
  await testAsync('Test 23: Normal upload without isCompressed persists isCompressed=false in DB', async () => {
    const formData = new FormData();
    const pdfBlob = new Blob([createValidPdfBuffer()], { type: 'application/pdf' });
    formData.append('file', pdfBlob, 'normal_fee_receipt.pdf');
    formData.append('documentType', 'FEE_RECEIPT');
    formData.append('isCompressed', 'false');

    const res = await fetch(`${BASE_URL}/api/documents/upload`, {
      method: 'POST',
      headers: { Cookie: cookieStudentA },
      body: formData,
    });
    assert.strictEqual(res.status, 201);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.document.currentVersion.isCompressed, false);

    // Verify DB record directly
    const dbVersion = await prisma.documentVersion.findUnique({
      where: { id: data.document.currentVersion.id },
    });
    assert.strictEqual(dbVersion.isCompressed, false, 'DB record must store isCompressed: false');
  });

  // Test 24: Versioning - Replacement with isCompressed: 'true' creates v2 compressed while v1 remains uncompressed
  await testAsync('Test 24: Replacement version with isCompressed=true leaves v1 untouched and sets v2=true', async () => {
    // Replace FEE_RECEIPT (which had v1 with isCompressed: false) with a compressed PNG
    const formData = new FormData();
    const pngBlob = new Blob([createValidPngBuffer()], { type: 'image/png' });
    formData.append('file', pngBlob, 'replacement_compressed_fee_receipt.png');
    formData.append('documentType', 'FEE_RECEIPT');
    formData.append('isCompressed', 'true');

    const res = await fetch(`${BASE_URL}/api/documents/upload`, {
      method: 'POST',
      headers: { Cookie: cookieStudentA },
      body: formData,
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.isReplacement, true);
    assert.strictEqual(data.versionNumber, 2);

    // Fetch full document with history from DB
    const docWithVersions = await prisma.document.findUnique({
      where: { id: data.document.id },
      include: { versions: { orderBy: { versionNumber: 'asc' } } },
    });
    assert.strictEqual(docWithVersions.versions.length, 2);
    assert.strictEqual(docWithVersions.versions[0].versionNumber, 1);
    assert.strictEqual(docWithVersions.versions[0].isCompressed, false, 'v1 must remain uncompressed');
    assert.strictEqual(docWithVersions.versions[1].versionNumber, 2);
    assert.strictEqual(docWithVersions.versions[1].isCompressed, true, 'v2 must be marked compressed');
  });

  // Test 25: Backend Security - Direct oversized file (> 5 MB) is strictly rejected by backend
  await testAsync('Test 25: Backend 5 MB validation remains authoritative against oversized payloads', async () => {
    const formData = new FormData();
    // 5.5 MB payload
    const oversizedBuffer = Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      Buffer.alloc(5.5 * 1024 * 1024, 0x20),
    ]);
    const oversizedBlob = new Blob([oversizedBuffer], { type: 'image/png' });
    formData.append('file', oversizedBlob, 'huge_doc.png');
    formData.append('documentType', 'RATION_CARD');

    const res = await fetch(`${BASE_URL}/api/documents/upload`, {
      method: 'POST',
      headers: { Cookie: cookieStudentA },
      body: formData,
    });
    // Should be rejected with 400 (multer / validation service limit)
    assert(res.status === 400, `Expected 400 for oversized payload, received ${res.status}`);
  });

  } finally {
    console.log('\n[CLEANUP] Cleaning up Phase 4 document test records...');
    try {
      const testUsers = await prisma.user.findMany({
        where: { email: { in: [studentAEmail, studentBEmail, collegeEmail] } },
        select: { id: true, studentProfile: { select: { id: true } } },
      });
      const userIds = testUsers.map((u) => u.id);

      if (userIds.length > 0) {
        await prisma.documentVersion.deleteMany({ where: { document: { student: { userId: { in: userIds } } } } });
        await prisma.document.deleteMany({ where: { student: { userId: { in: userIds } } } });
        await prisma.studentProfile.deleteMany({ where: { userId: { in: userIds } } });
        await prisma.user.deleteMany({ where: { id: { in: userIds } } });
      }
      console.log('[CLEANUP] Phase 4 test records cleaned up cleanly.');
    } catch (cleanErr) {
      console.error('[CLEANUP ERROR in Phase 4]', cleanErr);
    }
    await prisma.$disconnect();
  }

  console.log('\n====================================================');
  console.log(`PHASE 4 & 4.1 TESTS COMPLETE: ${passed}/${total} PASSED (100%)`);
  console.log('====================================================\n');
}

runPhase4Tests().catch((err) => {
  console.error('Phase 4 Test Suite Failed:', err);
  process.exit(1);
});
