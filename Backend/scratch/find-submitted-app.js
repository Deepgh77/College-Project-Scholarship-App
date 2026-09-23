const { prisma } = require('../src/config/prisma');

async function findApps() {
  const apps = await prisma.application.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: {
      student: {
        include: {
          user: true,
        },
      },
      scholarship: true,
    },
  });

  console.log(`Found ${apps.length} applications:`);
  for (const app of apps) {
    console.log({
      id: app.id,
      applicationNumber: app.applicationNumber,
      status: app.status,
      scholarshipCode: app.scholarship.code,
      scholarshipName: app.scholarship.name,
      studentName: app.student?.fullName,
      studentEmail: app.student?.user?.email,
      collegeId: app.collegeId,
      createdAt: app.createdAt,
    });
  }

  // Also find existing college users to authenticate with
  const collegeUsers = await prisma.user.findMany({
    where: { role: 'COLLEGE' },
    take: 5,
  });
  console.log('\nFound college users:', collegeUsers.map(u => ({ id: u.id, email: u.email, collegeId: u.collegeId })));
}

findApps()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
