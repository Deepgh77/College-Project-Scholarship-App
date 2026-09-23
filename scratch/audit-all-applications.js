const { prisma } = require('../src/config/prisma');

async function auditApplications() {
  const apps = await prisma.application.findMany({
    include: {
      student: {
        include: {
          user: true,
          college: true,
        },
      },
      scholarship: {
        include: {
          department: true,
        },
      },
      snapshots: { select: { id: true, cycleNumber: true } },
      documentSnapshots: { select: { id: true } },
      reviews: { select: { id: true } },
      correctionRequests: { select: { id: true } },
      auditLogs: { select: { id: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  console.log(`TOTAL APPLICATIONS IN DATABASE: ${apps.length}\n`);

  const summary = apps.map((a) => ({
    id: a.id,
    arn: a.applicationNumber,
    status: a.status,
    studentName: a.student?.fullName,
    userEmail: a.student?.user?.email,
    userRole: a.student?.user?.role,
    collegeName: a.student?.college?.name,
    collegeCode: a.student?.college?.code,
    schemeName: a.scholarship?.name,
    schemeCode: a.scholarship?.code,
    deptName: a.scholarship?.department?.name,
    deptCode: a.scholarship?.department?.code,
    createdAt: a.createdAt,
    snapshots: a.snapshots.length,
    docSnapshots: a.documentSnapshots.length,
    reviews: a.reviews.length,
    corrections: a.correctionRequests.length,
    auditLogs: a.auditLogs.length,
  }));

  console.log(JSON.stringify(summary, null, 2));

  // Check unique user emails
  const userEmails = [...new Set(apps.map((a) => a.student?.user?.email).filter(Boolean))];
  console.log('\nUnique student user emails associated with applications:');
  console.log(userEmails);

  // Check unique colleges
  const colleges = [...new Set(apps.map((a) => `${a.student?.college?.code} (${a.student?.college?.name})`).filter(Boolean))];
  console.log('\nUnique colleges associated with applications:');
  console.log(colleges);
}

auditApplications()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
