const { prisma } = require('../src/config/prisma');

async function dryRunCleanup() {
  console.log('====================================================');
  console.log('AUDIT FOR TEST DATA CLEANUP (DRY RUN)');
  console.log('====================================================\n');

  const preservedEmails = [
    'deep.imr123@gmail.com',
    'devesh.imr123@gmail.com',
    'officer.coep@college.ac.in',
    'officer.obcw@authority.gov.in',
    'admin@maharashtra.gov.in',
  ];

  const preservedColleges = [
    'ENG-PUN-001',
    'ASC-PUN-002',
    'COM-MUM-003',
    'BCA-KLN-004',
    'MOD-PUN-005',
  ];

  // 1. Identify Test Applications
  const testApps = await prisma.application.findMany({
    where: {
      student: {
        user: {
          email: { notIn: preservedEmails },
        },
      },
    },
    include: {
      student: { include: { user: true, college: true } },
      snapshots: true,
      documentSnapshots: true,
      reviews: true,
      correctionRequests: true,
      auditLogs: true,
    },
  });

  console.log(`Identified Test Applications: ${testApps.length}`);
  for (const app of testApps) {
    console.log(` - ARN: ${app.applicationNumber} | Student: ${app.student?.fullName} (${app.student?.user?.email}) | Status: ${app.status} | College: ${app.student?.college?.code}`);
  }

  // 2. Identify Test Users
  const testUsers = await prisma.user.findMany({
    where: {
      email: { notIn: preservedEmails },
    },
    include: {
      studentProfile: {
        include: {
          documents: { include: { versions: true } },
        },
      },
      notifications: true,
    },
  });

  console.log(`\nIdentified Test Users: ${testUsers.length}`);

  // 3. Identify Test Colleges
  const testColleges = await prisma.college.findMany({
    where: {
      code: { notIn: preservedColleges },
    },
  });

  console.log(`\nIdentified Ephemeral Test Colleges: ${testColleges.length}`);
  for (const col of testColleges) {
    console.log(` - Code: ${col.code} | Name: ${col.name}`);
  }

  // 4. Check Preserved Records
  const preservedApps = await prisma.application.findMany({
    where: {
      student: {
        user: {
          email: { in: preservedEmails },
        },
      },
    },
    include: {
      student: { include: { user: true, college: true } },
    },
  });

  console.log(`\nPRESERVED Genuine Applications (${preservedApps.length}):`);
  for (const p of preservedApps) {
    console.log(` - ARN: ${p.applicationNumber} | Student: ${p.student?.fullName} (${p.student?.user?.email}) | Status: ${p.status} | College: ${p.student?.college?.code}`);
  }

  console.log('\n====================================================');
  console.log('DRY RUN COMPLETE');
  console.log('====================================================');
}

dryRunCleanup()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
