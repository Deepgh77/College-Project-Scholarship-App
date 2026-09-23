const { prisma } = require('../src/config/prisma');

async function checkDeep() {
  const user = await prisma.user.findFirst({
    where: { email: { contains: 'deep', mode: 'insensitive' } },
    include: {
      studentProfile: {
        include: {
          applications: {
            include: {
              scholarship: true,
              correctionRequests: true,
              reviews: true,
            },
          },
        },
      },
    },
  });

  if (!user) {
    console.log('No user with deep found');
    return;
  }

  console.log('User:', user.email, 'Profile:', user.studentProfile?.fullName);
  for (const app of user.studentProfile?.applications || []) {
    console.log({
      id: app.id,
      arn: app.applicationNumber,
      status: app.status,
      scholarship: app.scholarship.name,
      cycle: app.cycleNumber,
      corrections: app.correctionRequests.length,
      createdAt: app.createdAt,
    });
  }
}

checkDeep()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
