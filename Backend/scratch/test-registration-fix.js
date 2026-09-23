const { prisma } = require('../src/config/prisma');
const bcrypt = require('bcryptjs');

const BASE_URL_BACKEND = 'http://localhost:5000/api';
const BASE_URL_PROXY = 'http://localhost:5173/api';

async function runTests() {
  console.log('====================================================');
  console.log('STUDENT REGISTRATION VERIFICATION & REGRESSION SUITE');
  console.log('====================================================\n');

  const createdUserIds = [];
  const testEmail = `qa.student.${Date.now()}@test.local`;
  const testPassword = 'SecurePassword@123!';

  try {
    // 1. Test brand-new Student registration via Vite proxy
    console.log('TEST 1: Register brand-new student via Vite proxy...');
    const regRes = await fetch(`${BASE_URL_PROXY}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
        confirmPassword: testPassword,
      }),
    });

    console.log(`- Status: ${regRes.status} (expected 201)`);
    if (regRes.status !== 201) {
      throw new Error(`Expected status 201, got ${regRes.status}`);
    }

    const regData = await regRes.json();
    console.log('- Response data:', JSON.stringify(regData));
    if (!regData.success || !regData.user?.id) {
      throw new Error('Registration did not return success or user.id');
    }
    createdUserIds.push(regData.user.id);

    // Verify response does not leak password or passwordHash
    if (regData.user.password || regData.user.passwordHash) {
      throw new Error('SECURITY VIOLATION: Password or passwordHash exposed in response!');
    }
    console.log('✔ PASS: Registration succeeded via proxy; no password/hash leaked in API response.\n');

    // 2. Database verification
    console.log('TEST 2: Verify database record directly in PostgreSQL...');
    const dbUser = await prisma.user.findUnique({
      where: { id: regData.user.id },
    });
    if (!dbUser) {
      throw new Error('User not found in database!');
    }
    console.log(`- DB User ID: ${dbUser.id}`);
    console.log(`- DB Role: ${dbUser.role} (expected STUDENT)`);
    console.log(`- DB Email: ${dbUser.email} (expected ${testEmail})`);
    console.log(`- DB Active: ${dbUser.isActive}`);
    console.log(`- DB PasswordHash prefix: ${dbUser.passwordHash.substring(0, 7)}`);

    if (dbUser.role !== 'STUDENT') {
      throw new Error(`Expected role STUDENT, got ${dbUser.role}`);
    }
    if (!dbUser.passwordHash.startsWith('$2b$10$')) {
      throw new Error('Password hash does not match bcrypt $2b$10$ pattern');
    }
    const isPasswordMatch = await bcrypt.compare(testPassword, dbUser.passwordHash);
    if (!isPasswordMatch) {
      throw new Error('bcrypt.compare failed on stored password hash');
    }
    console.log('✔ PASS: Database record verified (role=STUDENT, valid bcrypt hash).\n');

    // 3. Duplicate registration check
    console.log('TEST 3: Test duplicate registration with same email...');
    const dupRes = await fetch(`${BASE_URL_PROXY}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
        confirmPassword: testPassword,
      }),
    });
    console.log(`- Status: ${dupRes.status} (expected 409)`);
    const dupData = await dupRes.json();
    console.log('- Message:', dupData.message);
    if (dupRes.status !== 409 || dupData.success !== false) {
      throw new Error(`Expected 409 duplicate conflict, got ${dupRes.status}`);
    }
    console.log('✔ PASS: Duplicate registration rejected with 409 conflict.\n');

    // 4. Invalid email format
    console.log('TEST 4: Test invalid email format...');
    const invalidEmailRes = await fetch(`${BASE_URL_PROXY}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'invalid-email-no-at-sign',
        password: testPassword,
        confirmPassword: testPassword,
      }),
    });
    console.log(`- Status: ${invalidEmailRes.status} (expected 400)`);
    const invalidEmailData = await invalidEmailRes.json();
    console.log('- Message:', invalidEmailData.message);
    if (invalidEmailRes.status !== 400 || invalidEmailData.success !== false) {
      throw new Error(`Expected 400 for invalid email, got ${invalidEmailRes.status}`);
    }
    console.log('✔ PASS: Invalid email format rejected with 400 validation error.\n');

    // 5. Short password (<8 characters)
    console.log('TEST 5: Test short password (<8 characters)...');
    const shortPassRes = await fetch(`${BASE_URL_PROXY}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `shortpass.${Date.now()}@test.local`,
        password: 'short',
        confirmPassword: 'short',
      }),
    });
    console.log(`- Status: ${shortPassRes.status} (expected 400)`);
    const shortPassData = await shortPassRes.json();
    console.log('- Message:', shortPassData.message);
    if (shortPassRes.status !== 400 || shortPassData.success !== false) {
      throw new Error(`Expected 400 for short password, got ${shortPassRes.status}`);
    }
    console.log('✔ PASS: Short password rejected with 400 validation error.\n');

    // 6. Password mismatch
    console.log('TEST 6: Test password mismatch...');
    const mismatchRes = await fetch(`${BASE_URL_PROXY}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `mismatch.${Date.now()}@test.local`,
        password: 'Password123!',
        confirmPassword: 'DifferentPassword456!',
      }),
    });
    console.log(`- Status: ${mismatchRes.status} (expected 400)`);
    const mismatchData = await mismatchRes.json();
    console.log('- Message:', mismatchData.message);
    if (mismatchRes.status !== 400 || mismatchData.success !== false) {
      throw new Error(`Expected 400 for password mismatch, got ${mismatchRes.status}`);
    }
    console.log('✔ PASS: Password mismatch rejected with 400 validation error.\n');

    // 7. Verify newly registered student can login
    console.log('TEST 7: Verify newly registered student can login...');
    const newLoginRes = await fetch(`${BASE_URL_PROXY}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
      }),
    });
    console.log(`- Status: ${newLoginRes.status} (expected 200)`);
    const newLoginData = await newLoginRes.json();
    console.log('- User:', JSON.stringify(newLoginData.user));
    if (newLoginRes.status !== 200 || newLoginData.user?.role !== 'STUDENT') {
      throw new Error('Newly registered student could not login');
    }
    console.log('✔ PASS: Newly registered student successfully logged in.\n');

    // 8. Verify existing stable accounts login
    console.log('TEST 8: Verify existing stable accounts login across all 4 roles...');
    const stableAccounts = [
      { role: 'STUDENT', email: 'deep.imr123@gmail.com', pass: 'Deep@123' },
      { role: 'COLLEGE', email: 'officer.coep@college.ac.in', pass: 'Password@123' },
      { role: 'AUTHORITY', email: 'officer.obcw@authority.gov.in', pass: 'Password@123' },
      { role: 'ADMIN', email: 'admin@scholarship.local', pass: 'Admin@123' },
    ];

    for (const acc of stableAccounts) {
      const loginRes = await fetch(`${BASE_URL_PROXY}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: acc.email, password: acc.pass }),
      });
      const loginData = await loginRes.json();
      if (loginRes.status !== 200 || loginData.user?.role !== acc.role) {
        throw new Error(`Login failed for ${acc.role} (${acc.email}): status=${loginRes.status}`);
      }
      console.log(`✔ [${acc.role}] login verified: ${acc.email}`);
    }
    console.log('✔ PASS: All 4 role logins verified.\n');

    console.log('ALL REGISTRATION TESTS PASSED SUCCESSFULLY!');
  } finally {
    // Deterministic cleanup of temporary test accounts created during this run
    if (createdUserIds.length > 0) {
      console.log(`\n[CLEANUP] Removing ${createdUserIds.length} temporary test user(s)...`);
      const deleted = await prisma.user.deleteMany({
        where: { id: { in: createdUserIds } },
      });
      console.log(`[CLEANUP] Deleted count: ${deleted.count}`);
    }
    await prisma.$disconnect();
  }
}

runTests().catch((err) => {
  console.error('\n❌ TEST SUITE FAILED:', err);
  process.exit(1);
});
