const { prisma } = require('../src/config/prisma');

const BASE_URL = 'http://localhost:5000/api';

async function verifyDevAdmin() {
  console.log('====================================================');
  console.log('STARTING DEV ADMIN LOGIN & ROUTE VERIFICATION');
  console.log('====================================================\n');

  // 1. Attempt login with admin@scholarship.local / Admin@123
  console.log('[TEST 1] Logging in with admin@scholarship.local / Admin@123...');
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@scholarship.local',
      password: 'Admin@123',
    }),
  });

  if (loginRes.status !== 200) {
    const errorBody = await loginRes.text();
    throw new Error(`Login failed with status ${loginRes.status}: ${errorBody}`);
  }

  const loginData = await loginRes.json();
  console.log('[PASS] Login successful: HTTP 200');
  console.log('Login Response:', JSON.stringify(loginData, null, 2));

  // Verify response fields
  if (loginData.user?.role !== 'ADMIN') {
    throw new Error(`Expected role 'ADMIN' but got: ${loginData.user?.role}`);
  }
  if (loginData.user?.passwordHash) {
    throw new Error('SECURITY VIOLATION: passwordHash exposed in login response!');
  }
  console.log('[PASS] Role is ADMIN, passwordHash is NOT exposed.');

  // Extract auth cookie
  const cookieHeader = loginRes.headers.get('set-cookie');
  if (!cookieHeader) {
    throw new Error('No set-cookie header returned from login!');
  }
  const sessionCookie = cookieHeader.split(';')[0];
  console.log('[PASS] Obtained session cookie.');

  // 2. Verify /api/auth/me
  console.log('\n[TEST 2] Verifying /api/auth/me endpoint...');
  const meRes = await fetch(`${BASE_URL}/auth/me`, {
    headers: { Cookie: sessionCookie },
  });

  if (meRes.status !== 200) {
    const errorBody = await meRes.text();
    throw new Error(`/auth/me failed with status ${meRes.status}: ${errorBody}`);
  }

  const meData = await meRes.json();
  console.log('[PASS] /api/auth/me returned HTTP 200');
  console.log('Me Response:', JSON.stringify(meData, null, 2));

  if (meData.user?.role !== 'ADMIN') {
    throw new Error(`Expected /auth/me role 'ADMIN' but got: ${meData.user?.role}`);
  }
  if (meData.user?.passwordHash) {
    throw new Error('SECURITY VIOLATION: passwordHash exposed in /auth/me response!');
  }
  console.log('[PASS] /api/auth/me confirms role ADMIN and no passwordHash.');

  // 3. Verify Admin Dashboard stats access
  console.log('\n[TEST 3] Verifying Admin Dashboard Stats API (/api/admin/dashboard/stats)...');
  const statsRes = await fetch(`${BASE_URL}/admin/dashboard/stats`, {
    headers: { Cookie: sessionCookie },
  });

  if (statsRes.status !== 200) {
    const errorBody = await statsRes.text();
    throw new Error(`Stats endpoint failed with status ${statsRes.status}: ${errorBody}`);
  }

  const statsData = await statsRes.json();
  console.log('[PASS] /api/admin/dashboard/stats returned HTTP 200');
  console.log('High-Level Metrics:', JSON.stringify(statsData.metrics, null, 2));

  // 4. Verify unauthenticated access protection
  console.log('\n[TEST 4] Verifying unauthenticated access protection...');
  const unauthRes = await fetch(`${BASE_URL}/admin/dashboard/stats`);
  if (unauthRes.status !== 401) {
    throw new Error(`Expected 401 for unauthenticated request, got ${unauthRes.status}`);
  }
  console.log('[PASS] Unauthenticated request safely rejected with HTTP 401');

  // 5. Verify database record
  console.log('\n[TEST 5] Verifying database user record...');
  const dbUser = await prisma.user.findUnique({
    where: { email: 'admin@scholarship.local' },
    select: {
      id: true,
      email: true,
      role: true,
      isActive: true,
      collegeId: true,
      departmentId: true,
    },
  });

  if (!dbUser) {
    throw new Error('admin@scholarship.local not found in database!');
  }
  if (dbUser.role !== 'ADMIN' || !dbUser.isActive) {
    throw new Error(`Invalid state in DB: role=${dbUser.role}, isActive=${dbUser.isActive}`);
  }
  if (dbUser.collegeId !== null || dbUser.departmentId !== null) {
    throw new Error(`Admin unexpectedly linked: collegeId=${dbUser.collegeId}, departmentId=${dbUser.departmentId}`);
  }
  console.log('[PASS] DB User Record:', JSON.stringify(dbUser, null, 2));

  console.log('\n====================================================');
  console.log('ALL DEVELOPMENT ADMIN VERIFICATIONS PASSED (100%)');
  console.log('====================================================');
}

verifyDevAdmin()
  .catch((err) => {
    console.error('[FAIL]', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
