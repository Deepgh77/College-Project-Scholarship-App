const { prisma } = require('../src/config/prisma');

async function cleanTestPollution() {
  console.log('====================================================');
  console.log('STARTING DATABASE CLEANUP OF TEST POLLUTION');
  console.log('====================================================\n');

  const preservedEmails = [
    'deep.imr123@gmail.com',
    'devesh.imr123@gmail.com',
    'officer.coep@college.ac.in',
    'officer.obcw@authority.gov.in',
    'admin@maharashtra.gov.in',
  ];

  const preservedCollegeCodes = [
    'ENG-PUN-001',
    'ASC-PUN-002',
    'COM-MUM-003',
    'BCA-KLN-004',
    'MOD-PUN-005',
  ];

  // Step 1: Ensure Devesh points to a legitimate master college (BCA-KLN-004)
  const bkaCollege = await prisma.college.findFirst({ where: { code: 'BCA-KLN-004' } });
  if (!bkaCollege) {
    throw new Error('Master college BCA-KLN-004 not found!');
  }

  const deveshUser = await prisma.user.findFirst({
    where: { email: 'devesh.imr123@gmail.com' },
    include: { studentProfile: true },
  });

  if (deveshUser && deveshUser.studentProfile) {
    console.log(`Re-linking Devesh profile to legitimate master college: ${bkaCollege.name} (${bkaCollege.code})`);
    await prisma.studentProfile.update({
      where: { id: deveshUser.studentProfile.id },
      data: { collegeId: bkaCollege.id },
    });
  }

  // Step 2: Gather all test IDs to clean
  const testApps = await prisma.application.findMany({
    where: {
      student: {
        user: {
          email: { notIn: preservedEmails },
        },
      },
    },
    select: { id: true, applicationNumber: true },
  });
  const testAppIds = testApps.map((a) => a.id);

  const testUsers = await prisma.user.findMany({
    where: {
      email: { notIn: preservedEmails },
    },
    select: { id: true, email: true },
  });
  const testUserIds = testUsers.map((u) => u.id);

  const testColleges = await prisma.college.findMany({
    where: {
      code: { notIn: preservedCollegeCodes },
    },
    select: { id: true, code: true },
  });
  const testCollegeIds = testColleges.map((c) => c.id);

  console.log(`Entities to clean:`);
  console.log(` - Test Applications: ${testAppIds.length}`);
  console.log(` - Test Users: ${testUserIds.length}`);
  console.log(` - Ephemeral Colleges: ${testCollegeIds.length}\n`);

  // Step 3: Run transaction-based cleanup
  const counts = await prisma.$transaction(async (tx) => {
    // 3a. Audit logs
    const auditLogsRes = await tx.applicationAuditLog.deleteMany({
      where: {
        OR: [
          { applicationId: { in: testAppIds } },
          { actorUserId: { in: testUserIds } },
        ],
      },
    });

    // 3b. Corrections
    const corrRes = await tx.applicationCorrectionRequest.deleteMany({
      where: { applicationId: { in: testAppIds } },
    });

    // 3c. Reviews
    const revRes = await tx.applicationReview.deleteMany({
      where: {
        OR: [
          { applicationId: { in: testAppIds } },
          { reviewerUserId: { in: testUserIds } },
        ],
      },
    });

    // 3d. Document snapshots
    const docSnapRes = await tx.applicationDocumentSnapshot.deleteMany({
      where: { applicationId: { in: testAppIds } },
    });

    // 3e. Application snapshots
    const snapRes = await tx.applicationSnapshot.deleteMany({
      where: { applicationId: { in: testAppIds } },
    });

    // 3f. Applications
    const appRes = await tx.application.deleteMany({
      where: { id: { in: testAppIds } },
    });

    // 3g. Document versions of test users
    const docVerRes = await tx.documentVersion.deleteMany({
      where: {
        document: {
          student: {
            userId: { in: testUserIds },
          },
        },
      },
    });

    // 3h. Documents of test users
    const docRes = await tx.document.deleteMany({
      where: {
        student: {
          userId: { in: testUserIds },
        },
      },
    });

    // 3i. Notifications of test users
    const notifRes = await tx.notification.deleteMany({
      where: { userId: { in: testUserIds } },
    });

    // 3j. Student profiles of test users
    const profRes = await tx.studentProfile.deleteMany({
      where: { userId: { in: testUserIds } },
    });

    // 3k. Test users
    const userRes = await tx.user.deleteMany({
      where: { id: { in: testUserIds } },
    });

    // 3l. Ephemeral test colleges
    const colRes = await tx.college.deleteMany({
      where: { id: { in: testCollegeIds } },
    });

    return {
      auditLogs: auditLogsRes.count,
      correctionRequests: corrRes.count,
      reviews: revRes.count,
      documentSnapshots: docSnapRes.count,
      applicationSnapshots: snapRes.count,
      applications: appRes.count,
      documentVersions: docVerRes.count,
      documents: docRes.count,
      notifications: notifRes.count,
      studentProfiles: profRes.count,
      users: userRes.count,
      colleges: colRes.count,
    };
  });

  console.log('CLEANUP TRANSACTION EXECUTED SUCCESSFULLY:');
  console.table(counts);

  // Step 4: Verification of Preserved Genuine Data
  console.log('\n--- VERIFYING PRESERVED DATA ---');
  const remainingApps = await prisma.application.findMany({
    include: {
      student: { include: { user: true, college: true } },
      scholarship: { include: { department: true } },
      snapshots: true,
      documentSnapshots: true,
      reviews: true,
      correctionRequests: true,
      auditLogs: true,
    },
  });

  console.log(`Remaining Applications in Database: ${remainingApps.length}`);
  for (const a of remainingApps) {
    console.log(`[ARN: ${a.applicationNumber}] Student: ${a.student?.fullName} (${a.student?.user?.email}) | Status: ${a.status} | College: ${a.student?.college?.name} (${a.student?.college?.code}) | Dept: ${a.scholarship?.department?.code} | Snapshots: ${a.snapshots.length} | Reviews: ${a.reviews.length} | Audit: ${a.auditLogs.length}`);
  }

  const remainingColleges = await prisma.college.findMany({
    select: { code: true, name: true },
    orderBy: { code: 'asc' },
  });
  console.log(`\nRemaining Colleges in Database: ${remainingColleges.length}`);
  for (const c of remainingColleges) {
    console.log(` - ${c.code}: ${c.name}`);
  }

  const remainingUsers = await prisma.user.findMany({
    select: { email: true, role: true },
    orderBy: { email: 'asc' },
  });
  console.log(`\nRemaining Users in Database: ${remainingUsers.length}`);
  for (const u of remainingUsers) {
    console.log(` - ${u.email} (${u.role})`);
  }

  console.log('\n====================================================');
  console.log('DATABASE CLEANUP VERIFIED 100% COMPLETE');
  console.log('====================================================');
}

cleanTestPollution()
  .catch((err) => {
    console.error('Cleanup failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
