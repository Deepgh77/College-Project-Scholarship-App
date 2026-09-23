const { prisma } = require('../src/config/prisma');

async function checkSubmitted() {
  const submittedApps = await prisma.application.findMany({
    where: { status: 'SUBMITTED' },
    orderBy: { createdAt: 'desc' },
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

  console.log(`Found ${submittedApps.length} SUBMITTED applications:`);
  for (const a of submittedApps) {
    console.log({
      id: a.id,
      arn: a.applicationNumber,
      studentName: a.student?.fullName,
      studentEmail: a.student?.user?.email,
      college: a.student?.college?.name,
      collegeId: a.student?.collegeId,
      createdAt: a.createdAt,
    });
  }
}

checkSubmitted()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
