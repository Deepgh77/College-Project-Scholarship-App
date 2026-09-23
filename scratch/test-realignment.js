const http = require('http');
const app = require('../src/app');
const { prisma } = require('../src/config/prisma');

let server;
let baseUrl;

function request(method, path, body = null, cookie = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (cookie) {
      options.headers['Cookie'] = cookie;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        const setCookie = res.headers['set-cookie'];
        let json = null;
        try {
          json = JSON.parse(data);
        } catch {
          json = data;
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          setCookie,
          body: json,
        });
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

function extractTokenCookie(setCookieHeader) {
  if (!setCookieHeader) return null;
  const cookieStr = Array.isArray(setCookieHeader) ? setCookieHeader.join('; ') : setCookieHeader;
  const match = cookieStr.match(/token=([^;]+)/);
  return match ? `token=${match[1]}` : null;
}

async function runTests() {
  console.log('====================================================');
  console.log('PHASE 2 DATA-INTEGRITY REALIGNMENT VERIFICATION');
  console.log('====================================================\n');

  // Start in-memory test server on random port
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}`;
  console.log(`Test server listening on ${baseUrl}\n`);

  let passed = 0;
  let failed = 0;

  function assert(condition, name, details = '') {
    if (condition) {
      console.log(`  [PASS] ${name}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${name} ${details ? '- ' + details : ''}`);
      failed++;
    }
  }

  try {
    // ----------------------------------------------------
    // TEST 1: Health & System Connectivity
    // ----------------------------------------------------
    console.log('1. Testing System & Database Health...');
    const healthRes = await request('GET', '/api/health');
    assert(healthRes.status === 200, 'GET /api/health returns 200');
    assert(healthRes.body?.database?.status === 'connected', 'Database reported connected');

    // ----------------------------------------------------
    // TEST 2: College Master Data Integrity
    // ----------------------------------------------------
    console.log('\n2. Testing College Master Data (No Auto-Seeding)...');
    const collegesBefore = await prisma.college.findMany();
    const collegesCountBefore = collegesBefore.length;
    console.log(`   Initial colleges in database: ${collegesCountBefore}`);

    // Create and login a student to test college listing
    const timestamp = Date.now();
    const student1Email = `student.alpha.${timestamp}@test.com`;
    const reg1 = await request('POST', '/api/auth/register', {
      email: student1Email,
      password: 'StrongPassword123!',
      passwordConfirm: 'StrongPassword123!',
    });
    assert(reg1.status === 201, 'Student 1 registration successful');

    const login1 = await request('POST', '/api/auth/login', {
      email: student1Email,
      password: 'StrongPassword123!',
    });
    assert(login1.status === 200, 'Student 1 login successful');
    const student1Cookie = extractTokenCookie(login1.setCookie);
    assert(student1Cookie !== null, 'HTTP-only token cookie obtained');

    const collegesRes = await request('GET', '/api/student/colleges', null, student1Cookie);
    assert(collegesRes.status === 200, 'GET /api/student/colleges returns 200');
    assert(collegesRes.body?.colleges?.length === collegesCountBefore, `Returns exactly ${collegesCountBefore} colleges`);

    const collegesAfter = await prisma.college.count();
    assert(collegesAfter === collegesCountBefore, 'College count in DB remains strictly identical (no auto-seeding)');

    // ----------------------------------------------------
    // TEST 3: Security & Role Protection
    // ----------------------------------------------------
    console.log('\n3. Testing Security & Role Protection...');
    const unauthGet = await request('GET', '/api/student/profile');
    assert(unauthGet.status === 401, 'Unauthenticated GET /api/student/profile rejected with 401');

    const unauthPut = await request('PUT', '/api/student/profile', { fullName: 'Hacker' });
    assert(unauthPut.status === 401, 'Unauthenticated PUT /api/student/profile rejected with 401');

    // Create COLLEGE role user directly in DB
    const collegeStaff = await prisma.user.create({
      data: {
        email: `staff.${timestamp}@college.edu`,
        passwordHash: 'dummyhash',
        role: 'COLLEGE',
      },
    });

    // Generate token for college staff
    const jwt = require('jsonwebtoken');
    const staffToken = jwt.sign(
      { id: collegeStaff.id, email: collegeStaff.email, role: collegeStaff.role },
      process.env.JWT_SECRET || 'dev_secret',
      { expiresIn: '1h' }
    );
    const staffCookie = `token=${staffToken}`;

    const staffPut = await request('PUT', '/api/student/profile', { fullName: 'Staff' }, staffCookie);
    assert(staffPut.status === 403, 'Non-STUDENT user (COLLEGE role) rejected with 403 Forbidden');

    // ----------------------------------------------------
    // TEST 4: Brand New Student Profile (Uninitialized)
    // ----------------------------------------------------
    console.log('\n4. Testing Uninitialized Profile Retrieval...');
    const initGet = await request('GET', '/api/student/profile', null, student1Cookie);
    assert(initGet.status === 200, 'GET /api/student/profile returns 200 for new student');
    assert(initGet.body?.profile === null, 'Profile is null when not yet created');
    assert(initGet.body?.completion?.total === 0, 'Completion is 0% for uninitialized profile');

    // ----------------------------------------------------
    // TEST 5: Empty Profile Creation (Proving NULL Storage)
    // ----------------------------------------------------
    console.log('\n5. Testing Empty Profile Creation & NULL Verification in PostgreSQL...');
    const emptyPut = await request('PUT', '/api/student/profile', {}, student1Cookie);
    assert(emptyPut.status === 200, 'PUT /api/student/profile with empty body succeeds');
    assert(emptyPut.body?.completion?.total === 0, 'Completion remains 0% on empty profile');

    // Query PostgreSQL directly via Prisma to inspect actual row
    const student1User = await prisma.user.findUnique({ where: { email: student1Email } });
    const student1Row = await prisma.studentProfile.findUnique({ where: { userId: student1User.id } });

    assert(student1Row !== null, 'StudentProfile row exists in database');
    assert(student1Row.fullName === null, 'DB field fullName is literal NULL');
    assert(student1Row.dob === null, 'DB field dob is literal NULL (no fake date 2002-01-01)');
    assert(student1Row.gender === null, 'DB field gender is literal NULL (no fake MALE)');
    assert(student1Row.category === null, 'DB field category is literal NULL (no fake OPEN)');
    assert(student1Row.state === null, 'DB field state is literal NULL (no fake Maharashtra)');
    assert(student1Row.collegeId === null, 'DB field collegeId is literal NULL (no arbitrary college assigned)');
    assert(student1Row.courseYear === null, 'DB field courseYear is literal NULL (no fake year 1)');
    assert(student1Row.admissionYear === null, 'DB field admissionYear is literal NULL (no fake year 2026)');
    assert(student1Row.annualFamilyIncome === null, 'DB field annualFamilyIncome is literal NULL (no fake income 0)');
    assert(student1Row.bankAccountNo === null, 'DB field bankAccountNo is literal NULL');
    assert(student1Row.bankIfsc === null, 'DB field bankIfsc is literal NULL');
    assert(student1Row.isHandicapped === false, 'DB field isHandicapped is false (default flag)');
    assert(student1Row.completionPercentage === 0, 'DB field completionPercentage is 0');

    console.log('   Direct DB Row Inspection for Empty Profile:');
    console.log('   ', {
      fullName: student1Row.fullName,
      dob: student1Row.dob,
      gender: student1Row.gender,
      category: student1Row.category,
      state: student1Row.state,
      collegeId: student1Row.collegeId,
      courseYear: student1Row.courseYear,
      annualFamilyIncome: student1Row.annualFamilyIncome,
      completionPercentage: student1Row.completionPercentage,
    });

    // ----------------------------------------------------
    // TEST 6: Minimal Partial Profile (Name Only)
    // ----------------------------------------------------
    console.log('\n6. Testing Minimal Partial Profile (Name Only: "Rahul")...');
    const nameOnlyPut = await request(
      'PUT',
      '/api/student/profile',
      { fullName: 'Rahul' },
      student1Cookie
    );
    assert(nameOnlyPut.status === 200, 'PUT with fullName only succeeds');
    assert(nameOnlyPut.body?.completion?.total === 5, 'Completion is exactly 5% (5 pts for fullName)');
    assert(nameOnlyPut.body?.completion?.sections?.personal === 5, 'Personal section score is 5/20');
    assert(nameOnlyPut.body?.completion?.sections?.address === 0, 'Address section score is 0/20');
    assert(nameOnlyPut.body?.completion?.sections?.academic === 0, 'Academic section score is 0/20');
    assert(nameOnlyPut.body?.completion?.sections?.income === 0, 'Income section score is 0/20');
    assert(nameOnlyPut.body?.completion?.sections?.bank === 0, 'Bank section score is 0/20');

    const student1RowAfterName = await prisma.studentProfile.findUnique({ where: { userId: student1User.id } });
    assert(student1RowAfterName.fullName === 'Rahul', 'DB field fullName is "Rahul"');
    assert(student1RowAfterName.dob === null, 'DB field dob remains literal NULL');
    assert(student1RowAfterName.gender === null, 'DB field gender remains literal NULL');
    assert(student1RowAfterName.category === null, 'DB field category remains literal NULL');
    assert(student1RowAfterName.collegeId === null, 'DB field collegeId remains literal NULL');
    assert(student1RowAfterName.annualFamilyIncome === null, 'DB field annualFamilyIncome remains literal NULL');
    assert(student1RowAfterName.completionPercentage === 5, 'DB completionPercentage updated to 5');

    // ----------------------------------------------------
    // TEST 7: Progressive Filling Across All 5 Sections
    // ----------------------------------------------------
    console.log('\n7. Testing Progressive Section-by-Section Completion...');

    // Section 1: Complete Personal Details (20%)
    const personalPut = await request(
      'PUT',
      '/api/student/profile',
      {
        fullName: 'Rahul Patil',
        dob: '2003-04-15',
        gender: 'MALE',
        category: 'OBC',
        religion: 'Hindu',
      },
      student1Cookie
    );
    assert(personalPut.body?.completion?.sections?.personal === 20, 'Personal section reaches 20/20%');
    assert(personalPut.body?.completion?.total === 20, 'Total completion reaches 20%');

    // Section 2: Complete Address Details (20%)
    const addressPut = await request(
      'PUT',
      '/api/student/profile',
      {
        mobile: '9876543210',
        address: 'Flat 402, Shivneri Heights',
        state: 'Maharashtra',
        district: 'Pune',
        taluka: 'Haveli',
        cityVillage: 'Pune',
        pincode: '411038',
      },
      student1Cookie
    );
    assert(addressPut.body?.completion?.sections?.address === 20, 'Address section reaches 20/20%');
    assert(addressPut.body?.completion?.total === 40, 'Total completion reaches 40%');

    // Section 3: Complete Academic Details (20%)
    const collegeList = await prisma.college.findMany({ take: 1 });
    const targetCollegeId = collegeList[0].id;

    const academicPut = await request(
      'PUT',
      '/api/student/profile',
      {
        collegeId: targetCollegeId,
        courseName: 'Bachelor of Computer Applications (BCA)',
        courseYear: 3,
        admissionYear: 2024,
        previousQualification: 'HSC / 12th Science',
        previousPercentage: 81.5,
      },
      student1Cookie
    );
    assert(academicPut.body?.completion?.sections?.academic === 20, 'Academic section reaches 20/20%');
    assert(academicPut.body?.completion?.total === 60, 'Total completion reaches 60%');

    // Section 4: Complete Family & Income Details (20%)
    const incomePut = await request(
      'PUT',
      '/api/student/profile',
      {
        guardianName: 'Suresh Patil',
        annualFamilyIncome: 180000,
      },
      student1Cookie
    );
    assert(incomePut.body?.completion?.sections?.income === 20, 'Income section reaches 20/20%');
    assert(incomePut.body?.completion?.total === 80, 'Total completion reaches 80%');

    // Section 5: Complete Bank Details (20%)
    const bankPut = await request(
      'PUT',
      '/api/student/profile',
      {
        bankAccountNo: '123456789012',
        bankIfsc: 'SBIN0001234',
        bankName: 'State Bank of India',
      },
      student1Cookie
    );
    assert(bankPut.body?.completion?.sections?.bank === 20, 'Bank section reaches 20/20%');
    assert(bankPut.body?.completion?.total === 100, 'Total completion reaches 100%');

    // Inspect DB for Fully Completed Profile
    const fullRow = await prisma.studentProfile.findUnique({ where: { userId: student1User.id } });
    assert(fullRow.completionPercentage === 100, 'DB stores completionPercentage: 100');
    assert(Number(fullRow.annualFamilyIncome) === 180000, 'DB stores annualFamilyIncome: 180000');
    assert(Number(fullRow.previousPercentage) === 81.5, 'DB stores previousPercentage: 81.5');
    assert(fullRow.collegeId === targetCollegeId, 'DB stores genuine collegeId');
    assert(fullRow.state === 'Maharashtra', 'DB stores user-selected state "Maharashtra"');

    // ----------------------------------------------------
    // TEST 8: Validation Rejections
    // ----------------------------------------------------
    console.log('\n8. Testing Validation Rules...');
    const invalidMobile = await request('PUT', '/api/student/profile', { mobile: '123' }, student1Cookie);
    assert(invalidMobile.status === 400, 'Invalid mobile number rejected with 400');

    const invalidPincode = await request('PUT', '/api/student/profile', { pincode: '999' }, student1Cookie);
    assert(invalidPincode.status === 400, 'Invalid pincode rejected with 400');

    const negativeIncome = await request('PUT', '/api/student/profile', { annualFamilyIncome: -500 }, student1Cookie);
    assert(negativeIncome.status === 400, 'Negative annual income rejected with 400');

    const overPercentage = await request('PUT', '/api/student/profile', { previousPercentage: 105 }, student1Cookie);
    assert(overPercentage.status === 400, 'Percentage > 100 rejected with 400');

    const invalidGender = await request('PUT', '/api/student/profile', { gender: 'INVALID' }, student1Cookie);
    assert(invalidGender.status === 400, 'Invalid gender enum rejected with 400');

    // ----------------------------------------------------
    // TEST 9: Student Isolation (No Cross-Access / IDOR)
    // ----------------------------------------------------
    console.log('\n9. Testing Multi-Tenant Student Isolation...');
    const student2Email = `student.beta.${timestamp}@test.com`;
    const reg2 = await request('POST', '/api/auth/register', {
      email: student2Email,
      password: 'StrongPassword123!',
      passwordConfirm: 'StrongPassword123!',
    });
    assert(reg2.status === 201, 'Student 2 registration successful');

    const login2 = await request('POST', '/api/auth/login', {
      email: student2Email,
      password: 'StrongPassword123!',
    });
    assert(login2.status === 200, 'Student 2 login successful');
    const student2Cookie = extractTokenCookie(login2.setCookie);

    const student2Get = await request('GET', '/api/student/profile', null, student2Cookie);
    assert(student2Get.body?.profile === null, "Student 2 profile is null (cannot see Student 1's 100% profile)");
    assert(student2Get.body?.completion?.total === 0, 'Student 2 completion is 0%');

    // Verify total profiles in DB is exactly 1 (only Student 1 has saved)
    const profileCount = await prisma.studentProfile.count();
    assert(profileCount === 1, 'Total profile count in database is 1');

    // ----------------------------------------------------
    // TEST 10: Auth Logout & Cookie Clearance
    // ----------------------------------------------------
    console.log('\n10. Testing Authentication Lifecycle...');
    const meRes = await request('GET', '/api/auth/me', null, student1Cookie);
    assert(meRes.status === 200, 'GET /api/auth/me succeeds with student token');
    assert(meRes.body?.user?.email === student1Email, 'Identity matches authenticated student');

    const logoutRes = await request('POST', '/api/auth/logout', null, student1Cookie);
    assert(logoutRes.status === 200, 'POST /api/auth/logout succeeds');

    const clearedCookie = extractTokenCookie(logoutRes.setCookie);
    const postLogoutGet = await request('GET', '/api/student/profile', null, clearedCookie);
    assert(postLogoutGet.status === 401, 'Request with cleared cookie is rejected with 401');

    console.log('\n====================================================');
    console.log(`SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Unexpected test failure:', err);
    process.exit(1);
  } finally {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await prisma.$disconnect();
  }
}

runTests();
