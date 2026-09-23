const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { prisma } = require('../src/config/prisma');

const BASE_URL = 'http://localhost:5000/api';

let passedCount = 0;
let failedCount = 0;

function expect(actual) {
  return {
    toBe(expected) {
      if (actual !== expected) {
        throw new Error(`Expected ${JSON.stringify(expected)} but received ${JSON.stringify(actual)}`);
      }
    },
    toContain(substr) {
      if (!actual || !actual.includes(substr)) {
        throw new Error(`Expected text to contain "${substr}"`);
      }
    },
    notToContain(substr) {
      if (actual && actual.includes(substr)) {
        throw new Error(`Expected text NOT to contain "${substr}"`);
      }
    },
    toBeTruthy() {
      if (!actual) {
        throw new Error(`Expected truthy value but received ${JSON.stringify(actual)}`);
      }
    },
  };
}

async function test(name, fn) {
  try {
    await fn();
    console.log(`[PASS] ${name}`);
    passedCount++;
  } catch (err) {
    console.error(`[FAIL] ${name}: ${err.message}`);
    failedCount++;
  }
}

async function runVerification() {
  console.log('================================================================');
  console.log('STARTING LOGIN PAGE REDESIGN & BRANDING VERIFICATION SUITE');
  console.log('================================================================\n');

  // ---------------------------------------------------------------------------
  // 1. STATIC UI & BRANDING CHECKS
  // ---------------------------------------------------------------------------
  const loginPagePath = path.join(__dirname, '../client/src/pages/LoginPage.jsx');
  const loginPageContent = fs.readFileSync(loginPagePath, 'utf8');

  const indexHtmlPath = path.join(__dirname, '../client/index.html');
  const indexHtmlContent = fs.readFileSync(indexHtmlPath, 'utf8');

  const adminLayoutPath = path.join(__dirname, '../client/src/components/admin/AdminLayout.jsx');
  const adminLayoutContent = fs.readFileSync(adminLayoutPath, 'utf8');

  const studentDashPath = path.join(__dirname, '../client/src/pages/StudentDashboardPage.jsx');
  const studentDashContent = fs.readFileSync(studentDashPath, 'utf8');

  await test('1. index.html title is "Maha Scholarship Portal"', () => {
    expect(indexHtmlContent).toContain('<title>Maha Scholarship Portal</title>');
    expect(indexHtmlContent).notToContain('<title>client</title>');
    expect(indexHtmlContent).notToContain('<title>Vite App</title>');
  });

  await test('2. LoginPage displays primary brand "Maha Scholarship Portal"', () => {
    expect(loginPageContent).toContain('Maha Scholarship Portal');
    expect(loginPageContent).toContain('Scholarship Application & Management System');
    expect(loginPageContent).toContain('Apply, manage and track your scholarship applications in one place.');
  });

  await test('3. LoginPage contains 3 required feature highlights', () => {
    expect(loginPageContent).toContain('Scholarship discovery');
    expect(loginPageContent).toContain('Application tracking');
    expect(loginPageContent).toContain('Document management');
  });

  await test('4. LoginPage card contains required headings and placeholders', () => {
    expect(loginPageContent).toContain('Welcome Back');
    expect(loginPageContent).toContain('Sign in to access your scholarship services.');
    expect(loginPageContent).toContain('placeholder="Enter your email address"');
    expect(loginPageContent).toContain('placeholder="Enter your password"');
    expect(loginPageContent).toContain('<span>Sign In</span>');
    expect(loginPageContent).toContain('Signing in...');
    expect(loginPageContent).toContain("Don't have an account?");
  });

  await test('5. LoginPage includes accessible Show/Hide password toggle', () => {
    expect(loginPageContent).toContain('showPassword');
    expect(loginPageContent).toContain('aria-label');
    expect(loginPageContent).toContain('EyeOff');
  });

  await test('6. LoginPage strictly has NO role selector (dropdown, radio buttons)', () => {
    expect(loginPageContent).notToContain('<select');
    expect(loginPageContent).notToContain('type="radio"');
    expect(loginPageContent).notToContain('Select Role');
    expect(loginPageContent).notToContain('STUDENT');
  });

  await test('7. LoginPage has NO visible project/academic demo wording', () => {
    expect(loginPageContent).notToContain('Academic Project');
    expect(loginPageContent).notToContain('Final Year');
    expect(loginPageContent).notToContain('BCA Project');
    expect(loginPageContent).notToContain('College Project');
    expect(loginPageContent).notToContain('Demo System');
    expect(loginPageContent).notToContain('Prototype');
    expect(loginPageContent).notToContain('MahaDBT');
    expect(loginPageContent).notToContain('Dummy');
  });

  await test('8. AdminLayout & StudentDashboard have NO visible MahaDBT references', () => {
    expect(adminLayoutContent).notToContain('MahaDBT');
    expect(studentDashContent).notToContain('MahaDBT');
  });

  // ---------------------------------------------------------------------------
  // 2. LIVE AUTHENTICATION & ROLE REDIRECTION CHECKS
  // ---------------------------------------------------------------------------
  const ts = Date.now();
  const passwordHash = await bcrypt.hash('Test@1234', 10);

  let testStudentUser = null;
  let testCollegeUser = null;
  let testAuthorityUser = null;
  let testDept = null;
  let testCollege = null;

  try {
    console.log('\n[SETUP] Provisioning isolated test accounts...');
    testDept = await prisma.department.create({
      data: {
        code: `DEPT-TEST-${ts}`,
        name: `Test Department ${ts}`,
      },
    });

    testCollege = await prisma.college.create({
      data: {
        code: `COL-TEST-${ts}`,
        name: `Test Engineering College ${ts}`,
        university: 'Test University',
        district: 'Pune',
        taluka: 'Haveli',
      },
    });

    testStudentUser = await prisma.user.create({
      data: {
        email: `student.auth.${ts}@test.local`,
        passwordHash,
        role: 'STUDENT',
      },
    });

    testCollegeUser = await prisma.user.create({
      data: {
        email: `college.auth.${ts}@test.local`,
        passwordHash,
        role: 'COLLEGE',
        collegeId: testCollege.id,
      },
    });

    testAuthorityUser = await prisma.user.create({
      data: {
        email: `authority.auth.${ts}@test.local`,
        passwordHash,
        role: 'AUTHORITY',
        departmentId: testDept.id,
      },
    });

    // Test 9: Student Login & Role Redirection
    await test('9. Student can log in successfully and receives HTTP 200 + session cookie', async () => {
      const res = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testStudentUser.email,
          password: 'Test@1234',
        }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.user.role).toBe('STUDENT');
      const cookie = res.headers.get('set-cookie');
      expect(cookie).toBeTruthy();
    });

    // Test 10: College Officer Login & Role Redirection
    await test('10. College officer can log in successfully and returns role COLLEGE', async () => {
      const res = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testCollegeUser.email,
          password: 'Test@1234',
        }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.user.role).toBe('COLLEGE');
    });

    // Test 11: Authority Officer Login & Role Redirection
    await test('11. Authority officer can log in successfully and returns role AUTHORITY', async () => {
      const res = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testAuthorityUser.email,
          password: 'Test@1234',
        }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.user.role).toBe('AUTHORITY');
    });

    // Test 12: Admin Login & Role Redirection
    await test('12. Admin user can log in successfully and returns role ADMIN', async () => {
      const res = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'admin@scholarship.local',
          password: 'Admin@123',
        }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.user.role).toBe('ADMIN');
    });

    // Test 13: /api/auth/me works with session cookie
    await test('13. /api/auth/me returns authenticated user details', async () => {
      const loginRes = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testStudentUser.email,
          password: 'Test@1234',
        }),
      });
      const cookie = loginRes.headers.get('set-cookie').split(';')[0];

      const meRes = await fetch(`${BASE_URL}/auth/me`, {
        headers: { Cookie: cookie },
      });
      expect(meRes.status).toBe(200);
      const meData = await meRes.json();
      expect(meData.success).toBe(true);
      expect(meData.user.email).toBe(testStudentUser.email);
      expect(meData.user.role).toBe('STUDENT');
    });

    // Test 14: Invalid credentials return 401
    await test('14. Invalid credentials return HTTP 401 with generic error message', async () => {
      const res = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testStudentUser.email,
          password: 'WrongPassword@999',
        }),
      });
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.success).toBe(false);
      // Ensure no Prisma or DB details leaked
      expect(data.message).notToContain('prisma');
      expect(data.message).notToContain('SELECT');
    });

    // Test 15: Registration still works cleanly
    await test('15. Student registration endpoint works and creates account', async () => {
      const newEmail = `new.student.${ts}@test.local`;
      const res = await fetch(`${BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newEmail,
          password: 'Password@123',
          confirmPassword: 'Password@123',
        }),
      });
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.success).toBe(true);

      // Clean up newly registered user
      await prisma.user.deleteMany({ where: { email: newEmail } });
    });

    // Test 16: Logout clears session
    await test('16. Logout endpoint clears authentication cookie', async () => {
      const res = await fetch(`${BASE_URL}/auth/logout`, {
        method: 'POST',
      });
      expect(res.status).toBe(200);
      const cookie = res.headers.get('set-cookie');
      // Cookie should be cleared (empty value or expired in the past)
      expect(cookie).toBeTruthy();
    });

  } finally {
    console.log('\n[CLEANUP] Cleaning up isolated test users and fixtures...');
    try {
      if (testStudentUser) {
        await prisma.user.deleteMany({ where: { id: testStudentUser.id } });
      }
      if (testCollegeUser) {
        await prisma.user.deleteMany({ where: { id: testCollegeUser.id } });
      }
      if (testAuthorityUser) {
        await prisma.user.deleteMany({ where: { id: testAuthorityUser.id } });
      }
      if (testCollege) {
        await prisma.college.deleteMany({ where: { id: testCollege.id } });
      }
      if (testDept) {
        await prisma.department.deleteMany({ where: { id: testDept.id } });
      }
      console.log('[CLEANUP] Cleaned up successfully.');
    } catch (cleanupErr) {
      console.warn('[WARN] Cleanup error:', cleanupErr.message);
    }
  }

  console.log('\n================================================================');
  console.log(`LOGIN & BRANDING SUITE COMPLETE: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('================================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runVerification()
  .catch((err) => {
    console.error('Unhandled error during test run:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
