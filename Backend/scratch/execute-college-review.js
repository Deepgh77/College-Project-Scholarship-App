const jwt = require('jsonwebtoken');
const config = require('../src/config/env');
const { prisma } = require('../src/config/prisma');

const BASE_URL = 'http://localhost:5000/api';
const APPLICATION_ID = '7ab0bceb-366d-45ca-aff1-9a85079b9498';

async function executeCollegeWorkflow() {
  console.log('====================================================');
  console.log('STARTING MANUAL QA COLLEGE REVIEW WORKFLOW');
  console.log(`Target Application: ${APPLICATION_ID}`);
  console.log('====================================================\n');

  // 1. Fetch application to verify current state
  const app = await prisma.application.findUnique({
    where: { id: APPLICATION_ID },
    include: {
      student: {
        include: {
          user: true,
          college: true,
        },
      },
      scholarship: true,
    },
  });

  if (!app) {
    throw new Error(`Application ${APPLICATION_ID} not found in database.`);
  }

  console.log(`Found Application: ${app.applicationNumber}`);
  console.log(`Student: ${app.student?.fullName} (${app.student?.user?.email})`);
  console.log(`College: ${app.student?.college?.name} (ID: ${app.student?.collegeId})`);
  console.log(`Current Status: ${app.status}\n`);

  if (app.status !== 'SUBMITTED') {
    console.warn(`[WARNING] Application status is ${app.status}, expected SUBMITTED.`);
  }

  // 2. Find or retrieve a COLLEGE officer user for this college
  let collegeUser = await prisma.user.findFirst({
    where: {
      role: 'COLLEGE',
      collegeId: app.student?.collegeId,
      isActive: true,
    },
  });

  if (!collegeUser) {
    // Check if any COLLEGE user exists
    collegeUser = await prisma.user.findFirst({
      where: { role: 'COLLEGE', isActive: true },
    });
  }

  if (!collegeUser) {
    throw new Error('No active COLLEGE user found to perform review.');
  }

  console.log(`Reviewer Officer: ${collegeUser.email} (User ID: ${collegeUser.id})`);

  // 3. Generate College Reviewer JWT Auth Token
  const collegeToken = jwt.sign(
    { id: collegeUser.id, role: 'COLLEGE' },
    config.jwtSecret,
    { expiresIn: '2h' }
  );
  const collegeCookie = `token=${collegeToken}`;

  // 4. Step 1: Move from SUBMITTED to UNDER_COLLEGE_REVIEW
  console.log('\n--- Step 1: Move from SUBMITTED to UNDER_COLLEGE_REVIEW ---');
  const startReviewRes = await fetch(`${BASE_URL}/applications/${APPLICATION_ID}/review/start`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: collegeCookie,
    },
  });

  const startReviewData = await startReviewRes.json();
  console.log(`HTTP ${startReviewRes.status}:`, startReviewData);

  if (!startReviewRes.ok) {
    throw new Error(`Failed to start review: ${startReviewData.message || startReviewRes.statusText}`);
  }

  // 5. Step 2: Submit Decision: COLLEGE SEND_BACK with 2 corrections
  console.log('\n--- Step 2: Submit Decision COLLEGE SEND_BACK with 2 Corrections ---');
  const sendBackPayload = {
    decision: 'SEND_BACK',
    overallRemarks: 'College Verification: Returned to applicant for document rectification and academic percentage correction.',
    corrections: [
      {
        affectedSection: 'DOCUMENT',
        affectedDocumentType: 'INCOME_CERT',
        rejectionCategory: 'EXPIRED_DOCUMENT',
        reasonText: 'The uploaded income certificate is expired. Please upload a valid current income certificate.',
        actionRequiredText: 'Upload a valid current Income Certificate in Document Vault.',
      },
      {
        affectedSection: 'ACADEMIC',
        affectedField: 'previousPercentage',
        rejectionCategory: 'ACADEMIC_INCORRECT',
        reasonText: 'The previous percentage entered in the application does not match the submitted academic record.',
        actionRequiredText: 'Correct the previous percentage according to the submitted academic record.',
      },
    ],
  };

  const decisionRes = await fetch(`${BASE_URL}/applications/${APPLICATION_ID}/review/decision`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: collegeCookie,
    },
    body: JSON.stringify(sendBackPayload),
  });

  const decisionData = await decisionRes.json();
  console.log(`HTTP ${decisionRes.status}:`, decisionData);

  if (!decisionRes.ok) {
    throw new Error(`Failed to submit decision: ${decisionData.message || decisionRes.statusText}`);
  }

  // 6. Step 3: Verify Tracking and Corrections via Student API
  console.log('\n--- Step 3: Verify Tracking State as Student ---');
  const studentToken = jwt.sign(
    { id: app.student.userId, role: 'STUDENT' },
    config.jwtSecret,
    { expiresIn: '2h' }
  );
  const studentCookie = `token=${studentToken}`;

  const trackingRes = await fetch(`${BASE_URL}/applications/${APPLICATION_ID}/tracking`, {
    headers: {
      Cookie: studentCookie,
    },
  });
  const trackingData = await trackingRes.json();

  console.log(`Tracking Status: ${trackingData.tracking?.status}`);
  console.log(`Status Label: ${trackingData.tracking?.statusMeta?.label}`);
  console.log(`Stage: ${trackingData.tracking?.statusMeta?.stage} (Step ${trackingData.tracking?.statusMeta?.stageNumber})`);
  console.log(`Action Required: ${trackingData.tracking?.statusMeta?.isActionRequired}`);
  console.log(`Can Resubmit: ${trackingData.tracking?.canResubmit}`);
  console.log(`Open Corrections Count: ${trackingData.tracking?.correctionRequests?.length}`);

  console.log('\nCorrection Requests:');
  for (const c of trackingData.tracking?.correctionRequests || []) {
    console.log({
      id: c.id,
      section: c.affectedSection,
      field: c.affectedField,
      docType: c.affectedDocumentType,
      category: c.rejectionCategory,
      reason: c.reasonText,
      actionRequired: c.actionRequiredText,
      status: c.status,
    });
  }

  console.log('\n====================================================');
  console.log('COLLEGE REVIEW WORKFLOW EXECUTED SUCCESSFULLY');
  console.log('Application is now in COLLEGE_SENT_BACK state for Manual QA');
  console.log('====================================================\n');
}

executeCollegeWorkflow()
  .catch((err) => {
    console.error('\nExecution failed:', err.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
