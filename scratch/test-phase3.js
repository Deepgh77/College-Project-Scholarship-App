const http = require('http');
const app = require('../src/app');
const { prisma } = require('../src/config/prisma');
const {
  calculateAge,
  evaluateSingleRule,
  evaluateScholarshipEligibility,
  ALLOWED_FIELD_PATHS,
} = require('../src/modules/scholarship/eligibility.engine');

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
        let json = null;
        try {
          json = JSON.parse(data);
        } catch {
          json = data;
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          setCookie: res.headers['set-cookie'],
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
  console.log('PHASE 3 — SCHOLARSHIP MASTER & ELIGIBILITY VERIFICATION');
  console.log('====================================================\n');

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

  // =========================================================================
  // PART 1: ELIGIBILITY ENGINE DETERMINISTIC UNIT TESTS
  // =========================================================================
  console.log('--- PART 1: ELIGIBILITY ENGINE UNIT TESTS ---');

  // Test 1: Age derivation
  const refDate = new Date('2026-09-15T00:00:00.000Z');
  assert(calculateAge('2004-09-10', refDate) === 22, 'Age calculated correctly (before birthday passed: 22)');
  assert(calculateAge('2004-09-20', refDate) === 21, 'Age calculated correctly (after birthday: 21)');
  assert(calculateAge(null, refDate) === null, 'calculateAge returns null when dob is null');
  assert(calculateAge('invalid-date', refDate) === null, 'calculateAge returns null when dob is invalid');

  // Test 2: Field Path Allowlist
  assert(ALLOWED_FIELD_PATHS.includes('annualFamilyIncome'), 'annualFamilyIncome in allowlist');
  assert(!ALLOWED_FIELD_PATHS.includes('passwordHash'), 'passwordHash excluded from allowlist');
  assert(!ALLOWED_FIELD_PATHS.includes('bankAccountNo'), 'bankAccountNo excluded from allowlist');

  // Test 3: Unsupported fieldPath handling
  const unsupportedRule = {
    id: 'u1',
    ruleGroup: 'DEFAULT',
    fieldPath: 'bankAccountNo',
    operator: 'EQ',
    targetValue: '123',
    failureReasonText: 'Sensitive',
  };
  const unsuppRes = evaluateSingleRule(unsupportedRule, { bankAccountNo: '123' }, refDate);
  assert(unsuppRes.status === 'CONFIG_ERROR', 'Unsupported fieldPath returns CONFIG_ERROR');

  // Test 4: Malformed targetValue handling
  const malformedLteRule = {
    id: 'm1',
    ruleGroup: 'DEFAULT',
    fieldPath: 'annualFamilyIncome',
    operator: 'LTE',
    targetValue: 'not-a-number',
    failureReasonText: 'Income check',
  };
  const malformedRes = evaluateSingleRule(malformedLteRule, { annualFamilyIncome: 100000 }, refDate);
  assert(malformedRes.status === 'CONFIG_ERROR', 'Malformed LTE targetValue returns CONFIG_ERROR');

  const malformedInRule = {
    id: 'm2',
    ruleGroup: 'DEFAULT',
    fieldPath: 'category',
    operator: 'IN',
    targetValue: [], // empty array
    failureReasonText: 'Category check',
  };
  const malformedInRes = evaluateSingleRule(malformedInRule, { category: 'SC' }, refDate);
  assert(malformedInRes.status === 'CONFIG_ERROR', 'Empty array IN targetValue returns CONFIG_ERROR');

  // Test 5: Strict NULL Safety (Null never converts to default)
  const incomeRule = {
    id: 'r1',
    ruleGroup: 'DEFAULT',
    fieldPath: 'annualFamilyIncome',
    operator: 'LTE',
    targetValue: 250000,
    failureReasonText: 'Income limit',
  };
  const nullIncomeRes = evaluateSingleRule(incomeRule, { annualFamilyIncome: null }, refDate);
  assert(nullIncomeRes.status === 'INCOMPLETE', 'annualFamilyIncome = NULL yields INCOMPLETE (not 0, not satisfied)');

  const categoryRule = {
    id: 'r2',
    ruleGroup: 'DEFAULT',
    fieldPath: 'category',
    operator: 'IN',
    targetValue: ['OPEN'],
    failureReasonText: 'Open category',
  };
  const nullCatRes = evaluateSingleRule(categoryRule, { category: null }, refDate);
  assert(nullCatRes.status === 'INCOMPLETE', 'category = NULL yields INCOMPLETE (not OPEN, not satisfied)');

  const ageRule = {
    id: 'r3',
    ruleGroup: 'DEFAULT',
    fieldPath: 'age',
    operator: 'LTE',
    targetValue: 25,
    failureReasonText: 'Age ceiling',
  };
  const nullDobRes = evaluateSingleRule(ageRule, { dob: null }, refDate);
  assert(nullDobRes.status === 'INCOMPLETE', 'dob = NULL yields INCOMPLETE for age rule');

  const validDobRes = evaluateSingleRule(ageRule, { dob: new Date('2003-01-01') }, refDate);
  assert(validDobRes.status === 'SATISFIED', 'dob = 2003-01-01 evaluates age 23 <= 25 as SATISFIED');

  // Test 6: OR-of-AND Logic Combinations
  // A. Group A FAILED + Group B SATISFIED -> overall = ELIGIBLE
  const orTestRulesA = [
    { id: 'gA_1', ruleGroup: 'GROUP_A', fieldPath: 'category', operator: 'IN', targetValue: ['SC'], failureReasonText: 'SC only' },
    { id: 'gB_1', ruleGroup: 'GROUP_B', fieldPath: 'gender', operator: 'EQ', targetValue: 'FEMALE', failureReasonText: 'Female only' },
  ];
  // Student is OBC Female (fails Group A, satisfies Group B)
  const evalResultA = evaluateScholarshipEligibility(orTestRulesA, { category: 'OBC', gender: 'FEMALE' }, refDate);
  assert(evalResultA.status === 'ELIGIBLE', 'Group A FAILED + Group B SATISFIED -> overall = ELIGIBLE');
  assert(evalResultA.isEligible === true, 'isEligible is true when status is ELIGIBLE');

  // B. Group A FAILED + Group B INCOMPLETE -> overall = INCOMPLETE
  // Student is OBC, gender is NULL
  const evalResultB = evaluateScholarshipEligibility(orTestRulesA, { category: 'OBC', gender: null }, refDate);
  assert(evalResultB.status === 'INCOMPLETE', 'Group A FAILED + Group B INCOMPLETE -> overall = INCOMPLETE');
  assert(evalResultB.isEligible === false, 'isEligible is false when status is INCOMPLETE');

  // C. Group A FAILED + Group B FAILED -> overall = NOT_ELIGIBLE
  // Student is OBC Male
  const evalResultC = evaluateScholarshipEligibility(orTestRulesA, { category: 'OBC', gender: 'MALE' }, refDate);
  assert(evalResultC.status === 'NOT_ELIGIBLE', 'Group A FAILED + Group B FAILED -> overall = NOT_ELIGIBLE');
  assert(evalResultC.isEligible === false, 'isEligible is false when status is NOT_ELIGIBLE');

  // D. Single Group with 1 SATISFIED + 1 INCOMPLETE -> overall = INCOMPLETE
  const singleGroupRules = [
    { id: 's1', ruleGroup: 'DEFAULT', fieldPath: 'category', operator: 'IN', targetValue: ['SC'], failureReasonText: 'SC' },
    { id: 's2', ruleGroup: 'DEFAULT', fieldPath: 'annualFamilyIncome', operator: 'LTE', targetValue: 250000, failureReasonText: 'Income' },
  ];
  const evalSingleIncomplete = evaluateScholarshipEligibility(singleGroupRules, { category: 'SC', annualFamilyIncome: null }, refDate);
  assert(evalSingleIncomplete.status === 'INCOMPLETE', 'Single Group (1 SATISFIED + 1 INCOMPLETE) -> overall = INCOMPLETE');
  assert(evalSingleIncomplete.missingFields.includes('annualFamilyIncome'), 'Missing field annualFamilyIncome correctly tracked');

  // E. Single Group with 1 SATISFIED + 1 FAILED -> overall = NOT_ELIGIBLE
  const evalSingleFailed = evaluateScholarshipEligibility(singleGroupRules, { category: 'SC', annualFamilyIncome: 300000 }, refDate);
  assert(evalSingleFailed.status === 'NOT_ELIGIBLE', 'Single Group (1 SATISFIED + 1 FAILED) -> overall = NOT_ELIGIBLE');
  assert(evalSingleFailed.failedReasons.length > 0, 'Failed reasons correctly populated');

  // =========================================================================
  // PART 2: HTTP INTEGRATION & LIVE SERVER API TESTS
  // =========================================================================
  console.log('\n--- PART 2: HTTP INTEGRATION & LIVE SERVER TESTS ---');

  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}`;
  console.log(`Test server listening on ${baseUrl}\n`);

  try {
    // Test 7: Public Catalog Discovery
    const catalogRes = await request('GET', '/api/scholarships');
    assert(catalogRes.status === 200, 'GET /api/scholarships returns 200');
    assert(catalogRes.body?.success === true, 'Catalog response success is true');
    assert(catalogRes.body?.count >= 6, `Returns active scholarships (count: ${catalogRes.body?.count})`);

    // Inactive scholarship SJD-ARCHIVED-007 should NOT be present in active catalog
    const hasInactive = catalogRes.body?.scholarships?.some((s) => s.code === 'SJD-ARCHIVED-007');
    assert(!hasInactive, 'Inactive scholarship SJD-ARCHIVED-007 excluded from discovery');

    // Test 8: Public Department Filter List
    const deptRes = await request('GET', '/api/scholarships/departments');
    assert(deptRes.status === 200, 'GET /api/scholarships/departments returns 200');
    assert(deptRes.body?.departments?.length === 4, 'Returns exactly 4 seeded departments');

    // Test 9: Application Window Status Distinction
    const openScheme = catalogRes.body?.scholarships?.find((s) => s.code === 'SJD-SC-001');
    assert(openScheme && openScheme.isWindowOpen === true && openScheme.windowStatus === 'OPEN', 'Open scheme has isWindowOpen: true, windowStatus: "OPEN"');

    const closedScheme = catalogRes.body?.scholarships?.find((s) => s.code === 'TDD-ST-006');
    assert(closedScheme && closedScheme.isWindowOpen === false && closedScheme.windowStatus === 'CLOSED', 'Closed scheme has isWindowOpen: false, windowStatus: "CLOSED"');
    assert(closedScheme && closedScheme.isActive === true, 'Closed scheme remains discoverable (isActive: true)');

    // Test 10: Single Scholarship Details View
    const targetScholarshipId = openScheme.id;
    const detailRes = await request('GET', `/api/scholarships/${targetScholarshipId}`);
    assert(detailRes.status === 200, `GET /api/scholarships/${targetScholarshipId} returns 200`);
    assert(detailRes.body?.scholarship?.rules?.length === 3, 'Scholarship detail includes 3 rules');
    assert(detailRes.body?.scholarship?.requiredDocuments?.length === 4, 'Scholarship detail includes 4 required documents');

    // Test 11: Route Ordering — /evaluate-all is NOT captured by /:id
    const unauthEvalAll = await request('GET', '/api/scholarships/evaluate-all');
    assert(unauthEvalAll.status === 401, 'GET /api/scholarships/evaluate-all returns 401 when unauthenticated (NOT captured as /:id 404/200)');

    // Create a test student account and login
    const timestamp = Date.now();
    const studentEmail = `student.phase3.${timestamp}@test.com`;
    const regRes = await request('POST', '/api/auth/register', {
      email: studentEmail,
      password: 'StrongPassword123!',
      passwordConfirm: 'StrongPassword123!',
    });
    assert(regRes.status === 201, 'Student registered successfully');

    const loginRes = await request('POST', '/api/auth/login', {
      email: studentEmail,
      password: 'StrongPassword123!',
    });
    assert(loginRes.status === 200, 'Student logged in successfully');
    const studentCookie = extractTokenCookie(loginRes.setCookie);

    // Test 12: Route Ordering with Authenticated Student
    const authEvalAll = await request('GET', '/api/scholarships/evaluate-all', null, studentCookie);
    assert(authEvalAll.status === 200, 'GET /api/scholarships/evaluate-all returns 200 for authenticated student');
    assert(authEvalAll.body?.evaluations !== undefined, 'Returns evaluations map for all active scholarships');
    assert(authEvalAll.body?.profileExists === false, 'Correctly reports profileExists: false for new student');

    // Test 13: Evaluation with Zero Profile Row
    const evalZeroProfile = await request('GET', `/api/scholarships/${targetScholarshipId}/evaluate`, null, studentCookie);
    assert(evalZeroProfile.status === 200, 'Evaluation returns 200 when student has no profile row');
    assert(evalZeroProfile.body?.evaluation?.status === 'INCOMPLETE', 'Status is INCOMPLETE for student with no profile row (zero crashes)');
    assert(evalZeroProfile.body?.evaluation?.isEligible === false, 'isEligible is false when INCOMPLETE');

    // Test 14: Evaluation with Partial Profile (Missing Income)
    await request(
      'PUT',
      '/api/student/profile',
      {
        fullName: 'Vinod Meshram',
        category: 'SC',
        state: 'Maharashtra',
        // annualFamilyIncome omitted / null
      },
      studentCookie
    );

    const evalPartial = await request('GET', `/api/scholarships/${targetScholarshipId}/evaluate`, null, studentCookie);
    assert(evalPartial.body?.evaluation?.status === 'INCOMPLETE', 'Status is INCOMPLETE when income is null');
    assert(evalPartial.body?.evaluation?.missingFields?.includes('annualFamilyIncome'), 'annualFamilyIncome listed under missingFields');

    // Test 15: Evaluation with Fully Eligible Student
    await request(
      'PUT',
      '/api/student/profile',
      {
        annualFamilyIncome: 180000, // <= 250000
      },
      studentCookie
    );

    const evalEligible = await request('GET', `/api/scholarships/${targetScholarshipId}/evaluate`, null, studentCookie);
    assert(evalEligible.body?.evaluation?.status === 'ELIGIBLE', 'Status is ELIGIBLE when SC student has income ₹1,80,000');
    assert(evalEligible.body?.evaluation?.isEligible === true, 'isEligible is true for eligible student');

    // Test 16: Evaluation with Ineligible Income Ceiling Exceeded
    await request(
      'PUT',
      '/api/student/profile',
      {
        annualFamilyIncome: 350000, // > 250000
      },
      studentCookie
    );

    const evalIneligibleIncome = await request('GET', `/api/scholarships/${targetScholarshipId}/evaluate`, null, studentCookie);
    assert(evalIneligibleIncome.body?.evaluation?.status === 'NOT_ELIGIBLE', 'Status is NOT_ELIGIBLE when income exceeds ceiling');
    assert(evalIneligibleIncome.body?.evaluation?.isEligible === false, 'isEligible is false when NOT_ELIGIBLE');
    assert(evalIneligibleIncome.body?.evaluation?.failedReasons?.length > 0, 'Includes explicit failure reason text');

    // Test 17: Multi-Group Scheme Evaluation (SJD-DIV-005)
    // Find SJD-DIV-005
    const divyangScheme = catalogRes.body?.scholarships?.find((s) => s.code === 'SJD-DIV-005');
    assert(divyangScheme !== undefined, 'Divyang multi-group scheme found in catalog');

    // Set student: isHandicapped = true, previousPercentage = 80%, income = 350000
    // Group 1 (DIVYANG_QUOTA): fails income <= 250000
    // Group 2 (MERIT_PATHWAY): satisfies isHandicapped === true AND previousPercentage >= 75%
    // Expected: Group 1 FAILED, Group 2 SATISFIED -> overall ELIGIBLE!
    await request(
      'PUT',
      '/api/student/profile',
      {
        isHandicapped: true,
        disabilityPercentage: 45,
        previousPercentage: 80.0,
      },
      studentCookie
    );

    const evalMultiGroup = await request('GET', `/api/scholarships/${divyangScheme.id}/evaluate`, null, studentCookie);
    assert(evalMultiGroup.body?.evaluation?.status === 'ELIGIBLE', 'Multi-Group OR semantics: Group 1 FAILED + Group 2 SATISFIED -> ELIGIBLE');
    assert(evalMultiGroup.body?.evaluation?.isEligible === true, 'isEligible is true when at least one group qualifies');

    // Test 18: Security & Role Protections
    // Create college user
    const collegeStaff = await prisma.user.create({
      data: {
        email: `college.test.${timestamp}@college.edu`,
        passwordHash: 'dummy',
        role: 'COLLEGE',
      },
    });
    const jwt = require('jsonwebtoken');
    const config = require('../src/config/env');
    const collegeToken = jwt.sign(
      { id: collegeStaff.id, email: collegeStaff.email, role: collegeStaff.role },
      config.jwtSecret,
      { expiresIn: '1h' }
    );
    const collegeCookie = `token=${collegeToken}`;

    const collegeEval = await request('GET', `/api/scholarships/${targetScholarshipId}/evaluate`, null, collegeCookie);
    assert(collegeEval.status === 403, 'Non-student role (COLLEGE) rejected with 403 on /evaluate');

    const collegeEvalAll = await request('GET', '/api/scholarships/evaluate-all', null, collegeCookie);
    assert(collegeEvalAll.status === 403, 'Non-student role (COLLEGE) rejected with 403 on /evaluate-all');

    console.log('\n====================================================');
    console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } finally {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await prisma.$disconnect();
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
