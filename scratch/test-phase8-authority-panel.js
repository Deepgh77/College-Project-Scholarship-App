const { prisma } = require('../src/config/prisma');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

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
  console.log('====================================================');
  console.log('STARTING PHASE 8 ACTUAL AUTHORITY PANEL TEST SUITE');
  console.log('====================================================\n');

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
  let deptA, deptB;
  let collegeA, collegeB;
  let schA, schB;
  let authorityUserA, authorityCookieA;
  let authorityUserB, authorityCookieB;
  let studentUserA, studentCookieA;
  let studentUserB, studentCookieB;
  let collegeUserA, collegeCookieA;
  let adminUser, adminCookie;
  let appA, appB;
  let docVersionA;

  try {
    await test('Setup: Create Ephemeral Departments, Colleges, Scholarships, and Users', async () => {
      const hashedPassword = await bcrypt.hash('Password@123', 10);

      // 1. Departments (isolated from production)
      deptA = await prisma.department.create({
        data: {
          code: `DEPT_A_${ts}`,
          name: `Department Alpha ${ts}`,
          description: 'Department Alpha for Phase 8 Tests',
          isActive: true,
        },
      });

      deptB = await prisma.department.create({
        data: {
          code: `DEPT_B_${ts}`,
          name: `Department Beta ${ts}`,
          description: 'Department Beta for Phase 8 Tests',
          isActive: true,
        },
      });

      // 2. Colleges (isolated from COEP)
      collegeA = await prisma.college.create({
        data: {
          code: `COL_A_${ts}`,
          name: `College Alpha ${ts}`,
          university: 'Pune University',
          district: 'Pune',
          taluka: 'Haveli',
          isActive: true,
        },
      });

      collegeB = await prisma.college.create({
        data: {
          code: `COL_B_${ts}`,
          name: `College Beta ${ts}`,
          university: 'Mumbai University',
          district: 'Mumbai',
          taluka: 'Kurla',
          isActive: true,
        },
      });

      // 3. Scholarships under Department A & B
      schA = await prisma.scholarship.create({
        data: {
          departmentId: deptA.id,
          code: `SCH_A_${ts}`,
          academicYear: '2024-2025',
          name: `Scholarship Alpha Scheme ${ts}`,
          description: 'Department A Scheme',
          benefitAmount: 25000,
          applicationStartDate: new Date('2024-01-01'),
          applicationEndDate: new Date('2026-12-31'),
          isActive: true,
        },
      });

      schB = await prisma.scholarship.create({
        data: {
          departmentId: deptB.id,
          code: `SCH_B_${ts}`,
          academicYear: '2024-2025',
          name: `Scholarship Beta Scheme ${ts}`,
          description: 'Department B Scheme',
          benefitAmount: 30000,
          applicationStartDate: new Date('2024-01-01'),
          applicationEndDate: new Date('2026-12-31'),
          isActive: true,
        },
      });

      // 4. Authority Officer A (Department A)
      authorityUserA = await prisma.user.create({
        data: {
          email: `officer.dept.a.${ts}@dept.gov.in`,
          passwordHash: hashedPassword,
          role: 'AUTHORITY',
          departmentId: deptA.id,
          isActive: true,
        },
      });

      const loginAuthA = await makeRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: authorityUserA.email, password: 'Password@123' }),
      });
      expect(loginAuthA.status).toBe(200);
      authorityCookieA = loginAuthA.cookie;

      // 5. Authority Officer B (Department B)
      authorityUserB = await prisma.user.create({
        data: {
          email: `officer.dept.b.${ts}@dept.gov.in`,
          passwordHash: hashedPassword,
          role: 'AUTHORITY',
          departmentId: deptB.id,
          isActive: true,
        },
      });

      const loginAuthB = await makeRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: authorityUserB.email, password: 'Password@123' }),
      });
      expect(loginAuthB.status).toBe(200);
      authorityCookieB = loginAuthB.cookie;

      // 6. College Officer A (College A)
      collegeUserA = await prisma.user.create({
        data: {
          email: `officer.col.a.${ts}@college.ac.in`,
          passwordHash: hashedPassword,
          role: 'COLLEGE',
          collegeId: collegeA.id,
          isActive: true,
        },
      });

      const loginColA = await makeRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: collegeUserA.email, password: 'Password@123' }),
      });
      expect(loginColA.status).toBe(200);
      collegeCookieA = loginColA.cookie;

      // 7. Student A (College A, Scheme A)
      studentUserA = await prisma.user.create({
        data: {
          email: `student.p8.a.${ts}@student.ac.in`,
          passwordHash: hashedPassword,
          role: 'STUDENT',
          isActive: true,
          studentProfile: {
            create: {
              fullName: `Student P8 Alpha ${ts}`,
              dob: new Date('2003-02-15'),
              gender: 'MALE',
              category: 'OPEN',
              religion: 'HINDU',
              annualFamilyIncome: 150000,
              collegeId: collegeA.id,
              courseName: 'B.Tech',
              previousPercentage: 80,
              completionPercentage: 100,
            },
          },
        },
        include: { studentProfile: true },
      });

      const loginStudentA = await makeRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: studentUserA.email, password: 'Password@123' }),
      });
      expect(loginStudentA.status).toBe(200);
      studentCookieA = loginStudentA.cookie;

      // 8. Student B (College B, Scheme B)
      studentUserB = await prisma.user.create({
        data: {
          email: `student.p8.b.${ts}@student.ac.in`,
          passwordHash: hashedPassword,
          role: 'STUDENT',
          isActive: true,
          studentProfile: {
            create: {
              fullName: `Student P8 Beta ${ts}`,
              dob: new Date('2003-06-20'),
              gender: 'FEMALE',
              category: 'OBC',
              religion: 'HINDU',
              annualFamilyIncome: 180000,
              collegeId: collegeB.id,
              courseName: 'B.E',
              previousPercentage: 82,
              completionPercentage: 100,
            },
          },
        },
        include: { studentProfile: true },
      });

      const loginStudentB = await makeRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: studentUserB.email, password: 'Password@123' }),
      });
      expect(loginStudentB.status).toBe(200);
      studentCookieB = loginStudentB.cookie;

      // 9. Admin User
      adminUser = await prisma.user.create({
        data: {
          email: `admin.p8.${ts}@admin.gov.in`,
          passwordHash: hashedPassword,
          role: 'ADMIN',
          isActive: true,
        },
      });

      const loginAdmin = await makeRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: adminUser.email, password: 'Password@123' }),
      });
      expect(loginAdmin.status).toBe(200);
      adminCookie = loginAdmin.cookie;

      // 10. Seed Document & Application for Student A (Scheme A -> Department A)
      const docA = await prisma.document.create({
        data: {
          studentId: studentUserA.studentProfile.id,
          documentType: 'INCOME_CERT',
        },
      });

      const storageDir = path.resolve(__dirname, '../storage/documents/test');
      await fs.promises.mkdir(storageDir, { recursive: true });
      const testFilePath = path.join(storageDir, `test_cert_${ts}.pdf`);
      await fs.promises.writeFile(testFilePath, '%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF');

      docVersionA = await prisma.documentVersion.create({
        data: {
          documentId: docA.id,
          versionNumber: 1,
          originalFilename: 'income_certificate_v1.pdf',
          storagePath: testFilePath,
          fileSizeBytes: 1024,
          mimeType: 'application/pdf',
        },
      });

      appA = await prisma.application.create({
        data: {
          studentId: studentUserA.studentProfile.id,
          scholarshipId: schA.id,
          applicationNumber: `MHA-P8-A-${ts}`,
          status: 'FORWARDED_TO_AUTHORITY',
          academicYear: '2024-2025',
          submittedAt: new Date(),
          snapshots: {
            create: {
              cycleNumber: 1,
              snapshotDataJson: {
                student: {
                  personal: { fullName: studentUserA.studentProfile.fullName },
                  academic: { courseName: 'B.Tech', college: collegeA.name },
                },
                scholarshipConfig: { code: schA.code, name: schA.name, benefitAmount: 25000 },
              },
            },
          },
          documentSnapshots: {
            create: {
              cycleNumber: 1,
              documentType: 'INCOME_CERT',
              documentVersionId: docVersionA.id,
            },
          },
          reviews: {
            create: {
              cycleNumber: 1,
              reviewerUserId: collegeUserA.id,
              reviewerRole: 'COLLEGE',
              decision: 'VERIFY_FORWARD',
              checklistJson: { verified: true },
              overallRemarks: 'College verified all credentials and forwarded to Department.',
            },
          },
          auditLogs: {
            create: {
              actorUserId: collegeUserA.id,
              actorRole: 'COLLEGE',
              action: 'COLLEGE_FORWARDED',
              previousStatus: 'UNDER_COLLEGE_REVIEW',
              newStatus: 'FORWARDED_TO_AUTHORITY',
              remarks: 'Forwarded to Department after verification.',
            },
          },
        },
      });

      // 11. Seed Application for Student B (Scheme B -> Department B)
      appB = await prisma.application.create({
        data: {
          studentId: studentUserB.studentProfile.id,
          scholarshipId: schB.id,
          applicationNumber: `MHA-P8-B-${ts}`,
          status: 'FORWARDED_TO_AUTHORITY',
          academicYear: '2024-2025',
          submittedAt: new Date(),
          snapshots: {
            create: {
              cycleNumber: 1,
              snapshotDataJson: {
                student: { personal: { fullName: studentUserB.studentProfile.fullName } },
              },
            },
          },
        },
      });
    });

    // -------------------------------------------------------------------------
    // PART 1: RBAC & ROUTE PROTECTION
    // -------------------------------------------------------------------------
    await test('Test 1: Unauthenticated request to /api/authority/dashboard returns 401', async () => {
      const res = await makeRequest('/authority/dashboard');
      expect(res.status).toBe(401);
    });

    await test('Test 2: STUDENT user accessing /api/authority/dashboard returns 403 Forbidden', async () => {
      const res = await makeRequest('/authority/dashboard', {}, studentCookieA);
      expect(res.status).toBe(403);
    });

    await test('Test 3: COLLEGE user accessing /api/authority/dashboard returns 403 Forbidden', async () => {
      const res = await makeRequest('/authority/dashboard', {}, collegeCookieA);
      expect(res.status).toBe(403);
    });

    await test('Test 4: ADMIN user accessing /api/authority/dashboard returns 403 (strict non-implicit role policy)', async () => {
      const res = await makeRequest('/authority/dashboard', {}, adminCookie);
      expect(res.status).toBe(403);
    });

    await test('Test 5: Authority Officer A accessing /api/authority/dashboard returns 200 with centralized metrics & department distribution', async () => {
      const res = await makeRequest('/authority/dashboard', {}, authorityCookieA);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.metrics.awaitingAction).toBeGreaterThanOrEqual(2); // appA + appB both FORWARDED_TO_AUTHORITY
      expect(Array.isArray(res.body.workload.departmentDistribution)).toBe(true);
      const deptIds = res.body.workload.departmentDistribution.map((d) => d.id);
      expect(deptIds).toContain(deptA.id);
      expect(deptIds).toContain(deptB.id);
    });

    // -------------------------------------------------------------------------
    // PART 2: CENTRALIZED CROSS-DEPARTMENT ACCESS & FILTERING
    // -------------------------------------------------------------------------
    await test('Test 6: Centralized Queue Default: Authority Officer A sees both Department A and Department B applications', async () => {
      const res = await makeRequest('/authority/applications', {}, authorityCookieA);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const appIds = res.body.applications.map((a) => a.id);
      expect(appIds).toContain(appA.id);
      expect(appIds).toContain(appB.id);
    });

    await test('Test 7: Department Filter: Narrowing by departmentId=deptA.id returns only Department A applications', async () => {
      const res = await makeRequest(`/authority/applications?departmentId=${deptA.id}`, {}, authorityCookieA);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const appIds = res.body.applications.map((a) => a.id);
      expect(appIds).toContain(appA.id);
      expect(appIds.includes(appB.id)).toBe(false);
    });

    await test('Test 8: Department Filter: Narrowing by departmentId=deptB.id returns only Department B applications', async () => {
      const res = await makeRequest(`/authority/applications?departmentId=${deptB.id}`, {}, authorityCookieA);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const appIds = res.body.applications.map((a) => a.id);
      expect(appIds).toContain(appB.id);
      expect(appIds.includes(appA.id)).toBe(false);
    });

    await test('Test 9: Cross-Department Scrutiny: Authority Officer A can view Department B application details', async () => {
      const res = await makeRequest(`/authority/applications/${appB.id}`, {}, authorityCookieA);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.application.id).toBe(appB.id);
      expect(res.body.application.department.id).toBe(deptB.id);
    });

    await test('Test 10: Cross-Department Scrutiny: Authority Officer A can start review on Department B application', async () => {
      const res = await makeRequest(`/authority/applications/${appB.id}/review/start`, { method: 'POST' }, authorityCookieA);
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('UNDER_AUTHORITY_REVIEW');

      const updated = await prisma.application.findUnique({ where: { id: appB.id } });
      expect(updated.status).toBe('UNDER_AUTHORITY_REVIEW');
    });

    await test('Test 11: Document Attachment Security: Previewing document NOT attached to application returns 404', async () => {
      // docVersionA is attached to appA, NOT appB -> must return 404
      const res = await makeRequest(`/authority/applications/${appB.id}/documents/${docVersionA.id}/preview`, {}, authorityCookieA);
      expect(res.status).toBe(404);
    });

    await test('Test 12: Document Attachment Security: Downloading document NOT attached to application returns 404', async () => {
      // docVersionA is attached to appA, NOT appB -> must return 404
      const res = await makeRequest(`/authority/applications/${appB.id}/documents/${docVersionA.id}/download`, {}, authorityCookieA);
      expect(res.status).toBe(404);
    });

    // -------------------------------------------------------------------------
    // PART 3: APPLICATION QUEUE & FILTER OPTIONS
    // -------------------------------------------------------------------------
    await test('Test 13: GET /api/authority/filters/options returns all active departments, scholarships, and colleges', async () => {
      const res = await makeRequest('/authority/filters/options', {}, authorityCookieA);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const deptIds = res.body.departments.map((d) => d.id);
      expect(deptIds).toContain(deptA.id);
      expect(deptIds).toContain(deptB.id);

      const schIds = res.body.scholarships.map((s) => s.id);
      expect(schIds).toContain(schA.id);
      expect(schIds).toContain(schB.id);

      const colIds = res.body.colleges.map((c) => c.id);
      expect(colIds).toContain(collegeA.id);
      expect(colIds).toContain(collegeB.id);
    });

    await test('Test 14: Application Queue search by ARN returns exact application', async () => {
      const res = await makeRequest(`/authority/applications?search=${appA.applicationNumber}`, {}, authorityCookieA);
      expect(res.status).toBe(200);
      expect(res.body.applications.length).toBe(1);
      expect(res.body.applications[0].id).toBe(appA.id);
    });

    await test('Test 15: Application Queue filter by status AWAITING_ACTION returns pending applications', async () => {
      const res = await makeRequest('/authority/applications?status=AWAITING_ACTION', {}, authorityCookieA);
      expect(res.status).toBe(200);
      const appIds = res.body.applications.map((a) => a.id);
      expect(appIds).toContain(appA.id);
    });

    // -------------------------------------------------------------------------
    // PART 4: APPLICATION REVIEW DESK & DOCUMENT SCRUTINY
    // -------------------------------------------------------------------------
    await test('Test 16: Review desk GET /authority/applications/:id returns frozen snapshot and college verification', async () => {
      const res = await makeRequest(`/authority/applications/${appA.id}`, {}, authorityCookieA);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.application.status).toBe('FORWARDED_TO_AUTHORITY');
      expect(res.body.currentSnapshot).toBeTruthy();
      expect(res.body.collegeReview).toBeTruthy();
      expect(res.body.collegeReview.reviewerRole).toBe('COLLEGE');
      expect(res.body.documentSnapshots.length).toBe(1);
      expect(res.body.allowedActions).toContain('START_REVIEW');
    });

    await test('Test 17: Scoped Document Preview streams PDF inline with correct Content-Type', async () => {
      const res = await makeRequest(`/authority/applications/${appA.id}/documents/${docVersionA.id}/preview`, {}, authorityCookieA);
      expect(res.status).toBe(200);
      const contentType = res.headers.get('content-type') || '';
      expect(contentType).toContain('application/pdf');
      const contentDisp = res.headers.get('content-disposition') || '';
      expect(contentDisp).toContain('inline');
    });

    await test('Test 18: Scoped Document Download streams file with attachment Content-Disposition', async () => {
      const res = await makeRequest(`/authority/applications/${appA.id}/documents/${docVersionA.id}/download`, {}, authorityCookieA);
      expect(res.status).toBe(200);
      const contentDisp = res.headers.get('content-disposition') || '';
      expect(contentDisp).toContain('attachment');
    });

    await test('Test 19: Requesting unattached document version returns 404', async () => {
      const res = await makeRequest(`/authority/applications/${appA.id}/documents/00000000-0000-0000-0000-000000000000/preview`, {}, authorityCookieA);
      expect(res.status).toBe(404);
    });

    // -------------------------------------------------------------------------
    // PART 5: SCRUTINY WORKFLOW: START REVIEW & VALIDATION
    // -------------------------------------------------------------------------
    await test('Test 20: Authority starts review: Status transitions to UNDER_AUTHORITY_REVIEW', async () => {
      const res = await makeRequest(`/authority/applications/${appA.id}/review/start`, { method: 'POST' }, authorityCookieA);
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('UNDER_AUTHORITY_REVIEW');

      const updated = await prisma.application.findUnique({ where: { id: appA.id } });
      expect(updated.status).toBe('UNDER_AUTHORITY_REVIEW');
    });

    await test('Test 21: Starting review again on UNDER_AUTHORITY_REVIEW application fails with 400', async () => {
      const res = await makeRequest(`/authority/applications/${appA.id}/review/start`, { method: 'POST' }, authorityCookieA);
      expect(res.status).toBe(400);
    });

    // -------------------------------------------------------------------------
    // PART 6: SCRUTINY DECISION: SEND BACK & COLLEGE ROUTING INTEGRITY
    // -------------------------------------------------------------------------
    await test('Test 22: Send Back validation: Returning without corrections or with vague reason (< 10 chars) fails with 400', async () => {
      const res = await makeRequest(`/authority/applications/${appA.id}/review/decision`, {
        method: 'POST',
        body: JSON.stringify({
          decision: 'SEND_BACK',
          corrections: [
            {
              affectedSection: 'DOCUMENT',
              affectedDocumentType: 'INCOME_CERT',
              reasonText: 'Fix this', // < 10 chars
              actionRequiredText: 'Upload valid doc',
            },
          ],
        }),
      }, authorityCookieA);
      expect(res.status).toBe(400);
    });

    await test('Test 23: Send Back with structured correction transitions to AUTHORITY_SENT_BACK and notifies student', async () => {
      const res = await makeRequest(`/authority/applications/${appA.id}/review/decision`, {
        method: 'POST',
        body: JSON.stringify({
          decision: 'SEND_BACK',
          overallRemarks: 'Please rectify the expired income certificate.',
          corrections: [
            {
              affectedSection: 'DOCUMENT',
              affectedDocumentType: 'INCOME_CERT',
              rejectionCategory: 'EXPIRED_DOCUMENT',
              reasonText: 'Income certificate is from previous financial year. Valid certificate for 2024-25 required.',
              actionRequiredText: 'Upload valid renewed income certificate in Document Vault and attach it.',
            },
          ],
        }),
      }, authorityCookieA);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('AUTHORITY_SENT_BACK');

      const dbApp = await prisma.application.findUnique({
        where: { id: appA.id },
        include: { correctionRequests: true },
      });
      expect(dbApp.status).toBe('AUTHORITY_SENT_BACK');
      expect(dbApp.correctionRequests.length).toBe(1);
      expect(dbApp.correctionRequests[0].reviewerRole).toBe('AUTHORITY');
      expect(dbApp.correctionRequests[0].status).toBe('OPEN');

      // Check student notification
      const notif = await prisma.notification.findFirst({
        where: { userId: studentUserA.id, category: 'ACTION_REQUIRED' },
        orderBy: { createdAt: 'desc' },
      });
      expect(notif).toBeTruthy();
      expect(notif.title).toContain('Sent Back by Department');
    });

    await test('Test 24: Precondition check: Attempting to approve while open corrections exist fails with 400', async () => {
      // Move to UNDER_AUTHORITY_REVIEW manually or test decision precondition
      const res = await makeRequest(`/authority/applications/${appA.id}/review/decision`, {
        method: 'POST',
        body: JSON.stringify({ decision: 'APPROVE', overallRemarks: 'Trying to approve with open corrections' }),
      }, authorityCookieA);
      expect(res.status).toBe(400); // Fails because status is AUTHORITY_SENT_BACK, and corrections are open
    });

    await test('Test 25: Student resolves correction and resubmits -> Transitions to RESUBMITTED_TO_COLLEGE', async () => {
      // Upload replacement v2
      const storageDir = path.resolve(__dirname, '../storage/documents/test');
      const testFilePathV2 = path.join(storageDir, `test_cert_v2_${ts}.pdf`);
      await fs.promises.writeFile(testFilePathV2, '%PDF-1.4\n%V2-replacement\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF');

      const docVersionV2 = await prisma.documentVersion.create({
        data: {
          documentId: docVersionA.documentId,
          versionNumber: 2,
          originalFilename: 'income_certificate_v2_renewed.pdf',
          storagePath: testFilePathV2,
          fileSizeBytes: 1048,
          mimeType: 'application/pdf',
        },
      });

      const openCorr = await prisma.applicationCorrectionRequest.findFirst({
        where: { applicationId: appA.id, status: 'OPEN' },
      });

      // Resolve correction via student API
      const resolveRes = await makeRequest(
        `/applications/${appA.id}/corrections/${openCorr.id}/resolve`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            resolvedDocumentVersionId: docVersionV2.id,
            studentResponseText: 'Uploaded renewed income certificate for AY 2024-25.',
          }),
        },
        studentCookieA
      );
      expect(resolveRes.status).toBe(200);

      // Resubmit application
      const resubmitRes = await makeRequest(
        `/applications/${appA.id}/resubmit`,
        {
          method: 'POST',
          body: JSON.stringify({ confirmationAccepted: true }),
        },
        studentCookieA
      );
      expect(resubmitRes.status).toBe(200);
      expect(resubmitRes.body.status).toBe('RESUBMITTED_TO_COLLEGE');
    });

    await test('Test 26: College Officer re-scrutinizes and forwards to Department -> FORWARDED_TO_AUTHORITY', async () => {
      // College starts review
      const startCol = await makeRequest(`/college/applications/${appA.id}/review/start`, { method: 'POST' }, collegeCookieA);
      expect(startCol.status).toBe(200);

      // College accepts correction
      const corr = await prisma.applicationCorrectionRequest.findFirst({
        where: { applicationId: appA.id, cycleNumber: 1 },
      });
      const acceptCorr = await makeRequest(
        `/college/applications/${appA.id}/corrections/${corr.id}/review`,
        {
          method: 'PATCH',
          body: JSON.stringify({ decision: 'ACCEPT', remarks: 'Replacement certificate verified.' }),
        },
        collegeCookieA
      );
      expect(acceptCorr.status).toBe(200);

      // College forwards to Authority
      const forwardRes = await makeRequest(
        `/college/applications/${appA.id}/review/decision`,
        {
          method: 'POST',
          body: JSON.stringify({
            decision: 'VERIFY_FORWARD',
            overallRemarks: 'College verified updated certificate and re-forwarded to Department.',
          }),
        },
        collegeCookieA
      );
      expect(forwardRes.status).toBe(200);
      expect(forwardRes.body.status).toBe('FORWARDED_TO_AUTHORITY');
    });

    // -------------------------------------------------------------------------
    // PART 7: AUTHORITY APPROVAL WORKFLOW
    // -------------------------------------------------------------------------
    await test('Test 27: Authority starts re-scrutiny -> UNDER_AUTHORITY_REVIEW', async () => {
      const res = await makeRequest(`/authority/applications/${appA.id}/review/start`, { method: 'POST' }, authorityCookieA);
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('UNDER_AUTHORITY_REVIEW');
    });

    await test('Test 28: Authority approves application -> APPROVED (no real payment triggered)', async () => {
      const res = await makeRequest(`/authority/applications/${appA.id}/review/decision`, {
        method: 'POST',
        body: JSON.stringify({
          decision: 'APPROVE',
          overallRemarks: 'Department scrutiny completed. Credentials and certificates verified. Approved.',
          checklistJson: {
            eligibilityReviewed: true,
            documentsReviewed: true,
            collegeVerificationReviewed: true,
            applicationInfoReviewed: true,
          },
        }),
      }, authorityCookieA);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('APPROVED');

      const appInDb = await prisma.application.findUnique({ where: { id: appA.id } });
      expect(appInDb.status).toBe('APPROVED');

      // Check audit log
      const auditLog = await prisma.applicationAuditLog.findFirst({
        where: { applicationId: appA.id, action: 'AUTHORITY_APPROVED' },
      });
      expect(auditLog).toBeTruthy();
      expect(auditLog.actorRole).toBe('AUTHORITY');

      // Check student notification
      const notif = await prisma.notification.findFirst({
        where: { userId: studentUserA.id, title: 'Scholarship Application Approved!' },
      });
      expect(notif).toBeTruthy();
    });

    await test('Test 29: Action on already-approved application fails with HTTP 400', async () => {
      const res = await makeRequest(`/authority/applications/${appA.id}/review/decision`, {
        method: 'POST',
        body: JSON.stringify({ decision: 'APPROVE', overallRemarks: 'Double approve attempt' }),
      }, authorityCookieA);
      expect(res.status).toBe(400);
    });

    // -------------------------------------------------------------------------
    // PART 8: AUTHORITY REJECTION WORKFLOW
    // -------------------------------------------------------------------------
    await test('Test 30: Create dedicated application for rejection test & start review', async () => {
      const studentUserC = await prisma.user.create({
        data: {
          email: `student.p8.c.${ts}@student.ac.in`,
          passwordHash: await bcrypt.hash('Password@123', 10),
          role: 'STUDENT',
          isActive: true,
          studentProfile: {
            create: {
              fullName: `Student P8 Gamma ${ts}`,
              dob: new Date('2003-08-10'),
              gender: 'MALE',
              category: 'OPEN',
              religion: 'HINDU',
              annualFamilyIncome: 190000,
              collegeId: collegeA.id,
              courseName: 'B.Sc',
              previousPercentage: 75,
              completionPercentage: 100,
            },
          },
        },
        include: { studentProfile: true },
      });

      const appReject = await prisma.application.create({
        data: {
          studentId: studentUserC.studentProfile.id,
          scholarshipId: schA.id,
          applicationNumber: `MHA-P8-REJ-${ts}`,
          status: 'FORWARDED_TO_AUTHORITY',
          academicYear: '2024-2025',
          submittedAt: new Date(),
          snapshots: {
            create: {
              cycleNumber: 1,
              snapshotDataJson: { student: { personal: { fullName: 'Rejection Candidate' } } },
            },
          },
        },
      });

      // Start review
      const startRes = await makeRequest(`/authority/applications/${appReject.id}/review/start`, { method: 'POST' }, authorityCookieA);
      expect(startRes.status).toBe(200);

      // Rejection without reason fails with 400
      const badReject = await makeRequest(`/authority/applications/${appReject.id}/review/decision`, {
        method: 'POST',
        body: JSON.stringify({ decision: 'REJECT', overallRemarks: 'Short' }),
      }, authorityCookieA);
      expect(badReject.status).toBe(400);

      // Rejection with valid justification succeeds
      const goodReject = await makeRequest(`/authority/applications/${appReject.id}/review/decision`, {
        method: 'POST',
        body: JSON.stringify({
          decision: 'REJECT',
          overallRemarks: 'Candidate does not satisfy state domicile and family income requirements for this departmental scheme.',
        }),
      }, authorityCookieA);
      expect(goodReject.status).toBe(200);
      expect(goodReject.body.status).toBe('AUTHORITY_REJECTED');

      const dbRejApp = await prisma.application.findUnique({ where: { id: appReject.id } });
      expect(dbRejApp.status).toBe('AUTHORITY_REJECTED');

      // Cleanup reject test app and student C
      await prisma.applicationAuditLog.deleteMany({ where: { applicationId: appReject.id } });
      await prisma.applicationReview.deleteMany({ where: { applicationId: appReject.id } });
      await prisma.applicationSnapshot.deleteMany({ where: { applicationId: appReject.id } });
      await prisma.application.delete({ where: { id: appReject.id } });
      await prisma.notification.deleteMany({ where: { userId: studentUserC.id } });
      await prisma.studentProfile.deleteMany({ where: { userId: studentUserC.id } });
      await prisma.user.deleteMany({ where: { id: studentUserC.id } });
    });

  } finally {
    // Isolated Cleanup: Delete ephemeral test records (Zero touch to COEP or Deep Patil)
    console.log('\n[CLEANUP] Cleaning up isolated test entities...');
    try {
      if (appA) {
        await prisma.applicationAuditLog.deleteMany({ where: { applicationId: appA.id } });
        await prisma.applicationCorrectionRequest.deleteMany({ where: { applicationId: appA.id } });
        await prisma.applicationReview.deleteMany({ where: { applicationId: appA.id } });
        await prisma.applicationDocumentSnapshot.deleteMany({ where: { applicationId: appA.id } });
        await prisma.applicationSnapshot.deleteMany({ where: { applicationId: appA.id } });
        await prisma.application.deleteMany({ where: { id: appA.id } });
      }
      if (appB) {
        await prisma.applicationSnapshot.deleteMany({ where: { applicationId: appB.id } });
        await prisma.application.deleteMany({ where: { id: appB.id } });
      }
      if (studentUserA) {
        await prisma.notification.deleteMany({ where: { userId: studentUserA.id } });
        await prisma.documentVersion.deleteMany({ where: { document: { studentId: studentUserA.studentProfile?.id } } });
        await prisma.document.deleteMany({ where: { studentId: studentUserA.studentProfile?.id } });
        await prisma.studentProfile.deleteMany({ where: { userId: studentUserA.id } });
        await prisma.user.deleteMany({ where: { id: studentUserA.id } });
      }
      if (studentUserB) {
        await prisma.studentProfile.deleteMany({ where: { userId: studentUserB.id } });
        await prisma.user.deleteMany({ where: { id: studentUserB.id } });
      }
      if (authorityUserA) await prisma.user.deleteMany({ where: { id: authorityUserA.id } });
      if (authorityUserB) await prisma.user.deleteMany({ where: { id: authorityUserB.id } });
      if (collegeUserA) await prisma.user.deleteMany({ where: { id: collegeUserA.id } });
      if (adminUser) await prisma.user.deleteMany({ where: { id: adminUser.id } });
      if (schA) await prisma.scholarship.deleteMany({ where: { id: schA.id } });
      if (schB) await prisma.scholarship.deleteMany({ where: { id: schB.id } });
      if (collegeA) await prisma.college.deleteMany({ where: { id: collegeA.id } });
      if (collegeB) await prisma.college.deleteMany({ where: { id: collegeB.id } });
      if (deptA) await prisma.department.deleteMany({ where: { id: deptA.id } });
      if (deptB) await prisma.department.deleteMany({ where: { id: deptB.id } });
      console.log('[CLEANUP] Ephemeral test records removed cleanly.');
    } catch (cleanupErr) {
      console.error('[CLEANUP ERROR]', cleanupErr);
    }
    await prisma.$disconnect();
  }

  console.log('\n====================================================');
  console.log(`PHASE 8 TEST SUITE COMPLETE: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('====================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTests();
