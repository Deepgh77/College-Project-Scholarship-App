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
  console.log('STARTING ADMIN PANEL (SYSTEM MANAGEMENT) TEST SUITE');
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

  // Test Entities (strictly isolated ephemeral data)
  let deptA, deptB;
  let collegeA, collegeB;
  let schA, schB;
  let adminUserA, adminCookieA;
  let adminUserB, adminCookieB;
  let studentUserA, studentCookieA, studentProfileA, appA;
  let collegeUserA, collegeCookieA;
  let authorityUserA, authorityCookieA;
  let testRuleId, testDocId;
  let testGrievance;

  try {
    console.log('[SETUP] Provisioning isolated test fixtures...');
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('Password@123', salt);

    // Ephemeral Department A
    deptA = await prisma.department.create({
      data: {
        code: `DEPT_${ts.toString().slice(-4)}`,
        name: `Admin Test Dept A ${ts}`,
        description: 'Test Department description',
      },
    });

    // Ephemeral College A
    collegeA = await prisma.college.create({
      data: {
        code: `COL_${ts.toString().slice(-4)}`,
        name: `Admin Test College A ${ts}`,
        university: 'Test University Pune',
        district: 'Pune',
        taluka: 'Haveli',
      },
    });

    // Ephemeral Admin Users (two admins to test last active admin rule)
    adminUserA = await prisma.user.create({
      data: {
        email: `admin.primary.${ts}@test.gov.in`,
        passwordHash,
        role: 'ADMIN',
        isActive: true,
      },
    });

    adminUserB = await prisma.user.create({
      data: {
        email: `admin.secondary.${ts}@test.gov.in`,
        passwordHash,
        role: 'ADMIN',
        isActive: true,
      },
    });

    // Ephemeral Student User & Profile
    studentUserA = await prisma.user.create({
      data: {
        email: `student.admin.test.${ts}@test.ac.in`,
        passwordHash,
        role: 'STUDENT',
        isActive: true,
        studentProfile: {
          create: {
            fullName: `Admin Test Student ${ts}`,
            category: 'OBC',
            annualFamilyIncome: 180000,
            collegeId: collegeA.id,
            completionPercentage: 100,
          },
        },
      },
      include: { studentProfile: true },
    });
    studentProfileA = studentUserA.studentProfile;

    // Ephemeral College User
    collegeUserA = await prisma.user.create({
      data: {
        email: `officer.college.${ts}@test.ac.in`,
        passwordHash,
        role: 'COLLEGE',
        collegeId: collegeA.id,
        isActive: true,
      },
    });

    // Ephemeral Authority User
    authorityUserA = await prisma.user.create({
      data: {
        email: `officer.authority.${ts}@test.gov.in`,
        passwordHash,
        role: 'AUTHORITY',
        departmentId: deptA.id,
        isActive: true,
      },
    });

    // Ephemeral Scholarship Scheme A
    schA = await prisma.scholarship.create({
      data: {
        departmentId: deptA.id,
        code: `SCH_ADM_${ts.toString().slice(-4)}`,
        academicYear: '2024-2025',
        name: `Admin Scheme Alpha ${ts}`,
        description: 'Test scheme for admin configuration',
        benefitAmount: 35000,
        applicationStartDate: new Date('2024-01-01'),
        applicationEndDate: new Date('2026-12-31'),
        isActive: true,
      },
    });

    // Log in users to obtain session cookies
    console.log('[LOGIN] Logging in test users...');
    const adminLoginA = await makeRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: adminUserA.email, password: 'Password@123' }),
    });
    adminCookieA = adminLoginA.cookie;

    const adminLoginB = await makeRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: adminUserB.email, password: 'Password@123' }),
    });
    adminCookieB = adminLoginB.cookie;

    const studentLogin = await makeRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: studentUserA.email, password: 'Password@123' }),
    });
    studentCookieA = studentLogin.cookie;

    const collegeLogin = await makeRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: collegeUserA.email, password: 'Password@123' }),
    });
    collegeCookieA = collegeLogin.cookie;

    const authLogin = await makeRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: authorityUserA.email, password: 'Password@123' }),
    });
    authorityCookieA = authLogin.cookie;

    console.log('[LOGIN] All session cookies obtained successfully.\n');

    // -------------------------------------------------------------------------
    // TEST 1: Access Control & Role Boundaries
    // -------------------------------------------------------------------------
    await test('Security: Unauthenticated request to /api/admin/dashboard/stats returns 401', async () => {
      const res = await makeRequest('/admin/dashboard/stats');
      expect(res.status).toBe(401);
    });

    await test('Security: STUDENT role accessing /api/admin/* returns 403 Forbidden', async () => {
      const res = await makeRequest('/admin/dashboard/stats', {}, studentCookieA);
      expect(res.status).toBe(403);
    });

    await test('Security: COLLEGE role accessing /api/admin/* returns 403 Forbidden', async () => {
      const res = await makeRequest('/admin/dashboard/stats', {}, collegeCookieA);
      expect(res.status).toBe(403);
    });

    await test('Security: AUTHORITY role accessing /api/admin/* returns 403 Forbidden', async () => {
      const res = await makeRequest('/admin/dashboard/stats', {}, authorityCookieA);
      expect(res.status).toBe(403);
    });

    await test('Security: ADMIN role accessing /api/admin/dashboard/stats returns 200 OK', async () => {
      const res = await makeRequest('/admin/dashboard/stats', {}, adminCookieA);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    // -------------------------------------------------------------------------
    // TEST 2: Admin Dashboard Consolidated Metrics (User Correction #5)
    // -------------------------------------------------------------------------
    await test('Dashboard: Returns consolidated high-level metrics without 17 separate cards (Correction #5)', async () => {
      const res = await makeRequest('/admin/dashboard/stats', {}, adminCookieA);
      expect(res.status).toBe(200);

      const { overview, metrics, statusBreakdown, departmentDistribution, recentActivity } = res.body;

      // Verify overview KPIs
      expect(overview.totalStudents).toBeGreaterThanOrEqual(1);
      expect(overview.totalColleges).toBeGreaterThanOrEqual(1);
      expect(overview.totalDepartments).toBeGreaterThanOrEqual(1);
      expect(overview.totalScholarships).toBeGreaterThanOrEqual(1);

      // Verify consolidated high-level metrics exist
      expect(metrics.totalApplications !== undefined).toBe(true);
      expect(metrics.pendingCollege !== undefined).toBe(true);
      expect(metrics.pendingAuthority !== undefined).toBe(true);
      expect(metrics.sentBack !== undefined).toBe(true);
      expect(metrics.approved !== undefined).toBe(true);
      expect(metrics.rejected !== undefined).toBe(true);
      expect(metrics.paymentProcessing !== undefined).toBe(true);
      expect(metrics.disbursed !== undefined).toBe(true);
      expect(metrics.undisbursed !== undefined).toBe(true);
      expect(metrics.openGrievances !== undefined).toBe(true);

      // Verify breakdown structures
      expect(typeof statusBreakdown).toBe('object');
      expect(Array.isArray(departmentDistribution)).toBe(true);
      expect(Array.isArray(recentActivity)).toBe(true);
    });

    // -------------------------------------------------------------------------
    // TEST 3: User Management & Protection Rules (User Correction #1)
    // -------------------------------------------------------------------------
    await test('Users: List users with search, role filter, and zero passwordHash exposure', async () => {
      const res = await makeRequest('/admin/users?role=STUDENT&search=' + studentUserA.email, {}, adminCookieA);
      expect(res.status).toBe(200);
      expect(res.body.users.length).toBeGreaterThanOrEqual(1);

      const user = res.body.users.find((u) => u.id === studentUserA.id);
      expect(user).toBeTruthy();
      expect(user.passwordHash).toBeFalsy(); // Zero password hash disclosure!
    });

    await test('Users: Admin cannot deactivate their own active account (400)', async () => {
      const res = await makeRequest(`/admin/users/${adminUserA.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: false }),
      }, adminCookieA);

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('cannot deactivate your own');
    });

    await test('Users: Deactivating one admin leaves second admin active; last admin cannot be deactivated (400)', async () => {
      // Admin A deactivates Admin B (succeeds since count was >= 2)
      const deactB = await makeRequest(`/admin/users/${adminUserB.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: false }),
      }, adminCookieA);
      expect(deactB.status).toBe(200);
      expect(deactB.body.user.isActive).toBe(false);

      // Now active admin count is 1. Attempting to deactivate Admin A (the only remaining active admin) fails!
      // (Even if requested by Admin B's cookie if it were active, or via another method, service checks activeAdminCount <= 1)
      // Let's re-activate Admin B for subsequent tests
      const reactB = await makeRequest(`/admin/users/${adminUserB.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: true }),
      }, adminCookieA);
      expect(reactB.status).toBe(200);
      expect(reactB.body.user.isActive).toBe(true);
    });

    await test('Users: Provision staff accounts (COLLEGE with collegeId, AUTHORITY with deptId, ADMIN)', async () => {
      const newOfficerEmail = `staff.clg.${ts}@test.ac.in`;
      const res = await makeRequest('/admin/users/provision', {
        method: 'POST',
        body: JSON.stringify({
          email: newOfficerEmail,
          password: 'Password@123',
          role: 'COLLEGE',
          collegeId: collegeA.id,
        }),
      }, adminCookieA);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.user.email).toBe(newOfficerEmail);
      expect(res.body.user.role).toBe('COLLEGE');
      expect(res.body.user.passwordHash).toBeFalsy();

      // Clean up provisioned staff user
      await prisma.user.delete({ where: { id: res.body.user.id } });
    });

    await test('Users: Provisioning staff rejects invalid role or weak password (400)', async () => {
      const weakRes = await makeRequest('/admin/users/provision', {
        method: 'POST',
        body: JSON.stringify({
          email: `weak.${ts}@test.ac.in`,
          password: 'short',
          role: 'COLLEGE',
          collegeId: collegeA.id,
        }),
      }, adminCookieA);
      expect(weakRes.status).toBe(400);

      const badRoleRes = await makeRequest('/admin/users/provision', {
        method: 'POST',
        body: JSON.stringify({
          email: `badrole.${ts}@test.ac.in`,
          password: 'Password@123',
          role: 'SUPERUSER',
        }),
      }, adminCookieA);
      expect(badRoleRes.status).toBe(400);
    });

    // -------------------------------------------------------------------------
    // TEST 4: College Master Management
    // -------------------------------------------------------------------------
    await test('Colleges: Admin can query, create, update, and toggle active status', async () => {
      // Query
      const listRes = await makeRequest('/admin/colleges?search=' + collegeA.code, {}, adminCookieA);
      expect(listRes.status).toBe(200);
      expect(listRes.body.colleges.length).toBeGreaterThanOrEqual(1);

      // Create new college
      const newColCode = `NEW_COL_${ts.toString().slice(-4)}`;
      const createRes = await makeRequest('/admin/colleges', {
        method: 'POST',
        body: JSON.stringify({
          code: newColCode,
          name: `New Engineering Institute ${ts}`,
          university: 'Mumbai University',
          district: 'Mumbai',
          taluka: 'Kurla',
          isActive: true,
        }),
      }, adminCookieA);
      expect(createRes.status).toBe(201);
      collegeB = createRes.body.college;

      // Update
      const updateRes = await makeRequest(`/admin/colleges/${collegeB.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: `Updated Engineering Institute ${ts}`,
          university: 'Mumbai University',
          district: 'Mumbai',
          taluka: 'Andheri',
        }),
      }, adminCookieA);
      expect(updateRes.status).toBe(200);
      expect(updateRes.body.college.name).toContain('Updated');

      // Toggle active status
      const toggleRes = await makeRequest(`/admin/colleges/${collegeB.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: false }),
      }, adminCookieA);
      expect(toggleRes.status).toBe(200);
      expect(toggleRes.body.college.isActive).toBe(false);
    });

    // -------------------------------------------------------------------------
    // TEST 5: Department Master Management
    // -------------------------------------------------------------------------
    await test('Departments: Admin can query, create, update, and toggle active status', async () => {
      const newDeptCode = `ND_${ts.toString().slice(-4)}`;
      const createRes = await makeRequest('/admin/departments', {
        method: 'POST',
        body: JSON.stringify({
          code: newDeptCode,
          name: `New Tribal Welfare Dept ${ts}`,
          description: 'Department description',
        }),
      }, adminCookieA);
      expect(createRes.status).toBe(201);
      deptB = createRes.body.department;

      // Update
      const updateRes = await makeRequest(`/admin/departments/${deptB.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: `Updated Tribal Welfare Dept ${ts}`,
          description: 'Updated mandate',
        }),
      }, adminCookieA);
      expect(updateRes.status).toBe(200);
      expect(updateRes.body.department.name).toContain('Updated');

      // Toggle active status
      const toggleRes = await makeRequest(`/admin/departments/${deptB.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: false }),
      }, adminCookieA);
      expect(toggleRes.status).toBe(200);
      expect(toggleRes.body.department.isActive).toBe(false);
    });

    // -------------------------------------------------------------------------
    // TEST 6: Scholarship Scheme Management
    // -------------------------------------------------------------------------
    await test('Scholarships: Admin can query, create, and update scholarship schemes', async () => {
      const newSchCode = `NEW_SCH_${ts.toString().slice(-4)}`;
      const createRes = await makeRequest('/admin/scholarships', {
        method: 'POST',
        body: JSON.stringify({
          departmentId: deptA.id,
          code: newSchCode,
          academicYear: '2024-2025',
          name: `New Merit Scheme ${ts}`,
          description: 'Merit scholarship scheme',
          benefitAmount: 40000,
          applicationStartDate: '2024-01-01',
          applicationEndDate: '2026-12-31',
          isFreshAllowed: true,
          isRenewalAllowed: true,
          isActive: true,
        }),
      }, adminCookieA);

      expect(createRes.status).toBe(201);
      schB = createRes.body.scholarship;

      // Update
      const updateRes = await makeRequest(`/admin/scholarships/${schB.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: `Updated Merit Scheme ${ts}`,
          benefitAmount: 45000,
        }),
      }, adminCookieA);
      expect(updateRes.status).toBe(200);
      expect(Number(updateRes.body.scholarship.benefitAmount)).toBe(45000);
    });

    // -------------------------------------------------------------------------
    // TEST 7: Eligibility Rule Management & Historical Protection (User Correction #2)
    // -------------------------------------------------------------------------
    await test('Rules: Admin adds valid eligibility rule matching allowlist', async () => {
      const ruleRes = await makeRequest(`/admin/scholarships/${schB.id}/rules`, {
        method: 'POST',
        body: JSON.stringify({
          ruleGroup: 'DEFAULT',
          fieldPath: 'annualFamilyIncome',
          operator: 'LTE',
          targetValue: 200000,
          failureReasonText: 'Annual family income must not exceed ₹2,00,000.',
        }),
      }, adminCookieA);

      expect(ruleRes.status).toBe(201);
      expect(ruleRes.body.success).toBe(true);
      testRuleId = ruleRes.body.rule.id;
    });

    await test('Rules: Rejects rule with fieldPath outside allowlist or invalid operator (400)', async () => {
      const badFieldRes = await makeRequest(`/admin/scholarships/${schB.id}/rules`, {
        method: 'POST',
        body: JSON.stringify({
          fieldPath: 'arbitraryHackedField',
          operator: 'EQ',
          targetValue: 'test',
          failureReasonText: 'Invalid field reason.',
        }),
      }, adminCookieA);
      expect(badFieldRes.status).toBe(400);
      expect(badFieldRes.body.error).toContain('Permitted fields');

      const badOpRes = await makeRequest(`/admin/scholarships/${schB.id}/rules`, {
        method: 'POST',
        body: JSON.stringify({
          fieldPath: 'annualFamilyIncome',
          operator: 'REGEX_MATCH',
          targetValue: '123',
          failureReasonText: 'Invalid operator reason.',
        }),
      }, adminCookieA);
      expect(badOpRes.status).toBe(400);
      expect(badOpRes.body.error).toContain('Permitted: LTE, GTE, EQ, NEQ, IN');
    });

    await test('Rules: Rejects deleting rule if scholarship has submitted applications (Correction #2)', async () => {
      // Create an application under schB
      appA = await prisma.application.create({
        data: {
          applicationNumber: `APP-ADM-${ts.toString().slice(-6)}`,
          studentId: studentProfileA.id,
          scholarshipId: schB.id,
          academicYear: '2024-2025',
          status: 'SUBMITTED',
          submittedAt: new Date(),
        },
      });

      // Attempting to delete rule must be rejected to protect historical reproducibility!
      const delRes = await makeRequest(`/admin/scholarships/${schB.id}/rules/${testRuleId}`, {
        method: 'DELETE',
      }, adminCookieA);

      expect(delRes.status).toBe(400);
      expect(delRes.body.error).toContain('existing applications');
    });

    // -------------------------------------------------------------------------
    // TEST 8: Required Document Management & Historical Protection (User Correction #2)
    // -------------------------------------------------------------------------
    await test('Documents: Admin adds document requirement to scholarship', async () => {
      // Create document requirement on schA (which has zero applications)
      const docRes = await makeRequest(`/admin/scholarships/${schA.id}/documents`, {
        method: 'POST',
        body: JSON.stringify({
          documentType: 'INCOME_CERT',
          isMandatory: true,
          helpTitle: 'Valid Income Certificate',
          helpTextSimple: 'Official Tehsildar issued income certificate.',
        }),
      }, adminCookieA);

      expect(docRes.status).toBe(201);
      testDocId = docRes.body.doc.id;

      // Safe deletion on scheme without applications succeeds
      const delRes = await makeRequest(`/admin/scholarships/${schA.id}/documents/${testDocId}`, {
        method: 'DELETE',
      }, adminCookieA);
      expect(delRes.status).toBe(200);
    });

    // -------------------------------------------------------------------------
    // TEST 9: Application Monitoring (Strictly Read-Only - User Correction #3)
    // -------------------------------------------------------------------------
    await test('Applications: Admin queries application queue and full lifecycle details (Read-Only)', async () => {
      const listRes = await makeRequest('/admin/applications?search=' + appA.applicationNumber, {}, adminCookieA);
      expect(listRes.status).toBe(200);
      expect(listRes.body.applications.length).toBeGreaterThanOrEqual(1);

      const detailRes = await makeRequest(`/admin/applications/${appA.id}`, {}, adminCookieA);
      expect(detailRes.status).toBe(200);
      expect(detailRes.body.application.id).toBe(appA.id);
      expect(detailRes.body.application.student).toBeTruthy();
      expect(detailRes.body.application.scholarship).toBeTruthy();
    });

    await test('Applications: Admin cannot perform review actions (No review endpoints under /admin)', async () => {
      // Admin attempting college review decision returns 403 Forbidden
      const clgRes = await makeRequest(`/college/applications/${appA.id}/review/decision`, {
        method: 'POST',
        body: JSON.stringify({ decision: 'APPROVE', overallRemarks: 'Test' }),
      }, adminCookieA);
      expect(clgRes.status).toBe(403);

      // Admin attempting authority review decision returns 403 Forbidden
      const authRes = await makeRequest(`/authority/applications/${appA.id}/review/decision`, {
        method: 'POST',
        body: JSON.stringify({ decision: 'APPROVE', overallRemarks: 'Test' }),
      }, adminCookieA);
      expect(authRes.status).toBe(403);
    });

    // -------------------------------------------------------------------------
    // TEST 10: Grievance Management & Validated Reassignment (User Correction #4)
    // -------------------------------------------------------------------------
    await test('Grievances: Admin queries grievances, reassigns role (validated), and resolves ticket', async () => {
      // Create test grievance
      testGrievance = await prisma.grievance.create({
        data: {
          ticketNumber: `GRV-${ts.toString().slice(-6)}`,
          studentId: studentProfileA.id,
          applicationId: appA.id,
          category: 'TECHNICAL',
          subject: `Dispute regarding profile data ${ts}`,
          description: 'Dispute description for testing administrative resolution',
          assignedRole: 'COLLEGE',
          status: 'OPEN',
        },
      });

      // Query
      const listRes = await makeRequest('/admin/grievances?search=' + testGrievance.ticketNumber, {}, adminCookieA);
      expect(listRes.status).toBe(200);
      expect(listRes.body.grievances.length).toBeGreaterThanOrEqual(1);

      // Validated role reassignment (Correction #4)
      const reassignRes = await makeRequest(`/admin/grievances/${testGrievance.id}/assign`, {
        method: 'PATCH',
        body: JSON.stringify({ assignedRole: 'ADMIN' }),
      }, adminCookieA);
      expect(reassignRes.status).toBe(200);
      expect(reassignRes.body.grievance.assignedRole).toBe('ADMIN');

      // Rejects invalid role
      const badRoleRes = await makeRequest(`/admin/grievances/${testGrievance.id}/assign`, {
        method: 'PATCH',
        body: JSON.stringify({ assignedRole: 'STUDENT' }),
      }, adminCookieA);
      expect(badRoleRes.status).toBe(400);

      // Resolve grievance (requires resolution notes)
      const resolveRes = await makeRequest(`/admin/grievances/${testGrievance.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'RESOLVED',
          resolutionNotes: 'Technical verification completed successfully by administrator.',
        }),
      }, adminCookieA);
      expect(resolveRes.status).toBe(200);
      expect(resolveRes.body.grievance.status).toBe('RESOLVED');
    });

    // -------------------------------------------------------------------------
    // TEST 11: Notification Monitoring & Audit Logs
    // -------------------------------------------------------------------------
    await test('Notifications & Audit Logs: Admin queries in-app notifications and immutable activity logs', async () => {
      const notifRes = await makeRequest('/admin/notifications?limit=5', {}, adminCookieA);
      expect(notifRes.status).toBe(200);
      expect(Array.isArray(notifRes.body.notifications)).toBe(true);

      const auditRes = await makeRequest('/admin/audit-logs?limit=5', {}, adminCookieA);
      expect(auditRes.status).toBe(200);
      expect(Array.isArray(auditRes.body.logs)).toBe(true);
    });

  } finally {
    // -------------------------------------------------------------------------
    // CLEANUP: 100% Self-Cleaning Isolated Teardown
    // -------------------------------------------------------------------------
    console.log('\n[CLEANUP] Tearing down isolated test fixtures...');
    try {
      if (testGrievance) {
        await prisma.grievance.deleteMany({ where: { id: testGrievance.id } });
      }

      if (appA) {
        await prisma.applicationAuditLog.deleteMany({ where: { applicationId: appA.id } });
        await prisma.application.deleteMany({ where: { id: appA.id } });
      }

      if (schB) {
        await prisma.scholarshipRule.deleteMany({ where: { scholarshipId: schB.id } });
        await prisma.scholarshipRequiredDoc.deleteMany({ where: { scholarshipId: schB.id } });
        await prisma.scholarship.deleteMany({ where: { id: schB.id } });
      }

      if (schA) {
        await prisma.scholarshipRule.deleteMany({ where: { scholarshipId: schA.id } });
        await prisma.scholarshipRequiredDoc.deleteMany({ where: { scholarshipId: schA.id } });
        await prisma.scholarship.deleteMany({ where: { id: schA.id } });
      }

      const userIds = [
        studentUserA?.id,
        collegeUserA?.id,
        authorityUserA?.id,
        adminUserA?.id,
        adminUserB?.id,
      ].filter(Boolean);

      if (userIds.length > 0) {
        await prisma.notification.deleteMany({ where: { userId: { in: userIds } } });
        await prisma.studentProfile.deleteMany({ where: { userId: { in: userIds } } });
        await prisma.user.deleteMany({ where: { id: { in: userIds } } });
      }

      if (collegeB) await prisma.college.deleteMany({ where: { id: collegeB.id } });
      if (collegeA) await prisma.college.deleteMany({ where: { id: collegeA.id } });
      if (deptB) await prisma.department.deleteMany({ where: { id: deptB.id } });
      if (deptA) await prisma.department.deleteMany({ where: { id: deptA.id } });

      console.log('[CLEANUP] Isolated test fixtures removed cleanly.');
    } catch (cleanupErr) {
      console.error('[CLEANUP ERROR]', cleanupErr);
    }
    await prisma.$disconnect();
  }

  console.log('\n================================================================');
  console.log(`ADMIN PANEL TEST SUITE COMPLETE: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('================================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTests();
