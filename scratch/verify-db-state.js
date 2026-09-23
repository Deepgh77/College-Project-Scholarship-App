const { prisma } = require('../src/config/prisma');

async function verifyState() {
  console.log('--- VERIFYING STATE ---');
  
  // 1. Check Deep Patil application
  const deep = await prisma.user.findFirst({
    where: { email: 'deep.imr123@gmail.com' },
    include: {
      studentProfile: {
        include: {
          college: true,
          applications: {
            include: {
              scholarship: { include: { department: true } },
              reviews: true,
              correctionRequests: true,
            },
          },
        },
      },
    },
  });

  if (!deep || !deep.studentProfile) {
    console.error('ERROR: Deep Patil profile not found!');
  } else {
    console.log(`Student: ${deep.studentProfile.fullName} (${deep.email})`);
    console.log(`College: ${deep.studentProfile.college?.name} (${deep.studentProfile.college?.code})`);
    for (const app of deep.studentProfile.applications) {
      console.log(`Application: ARN=${app.applicationNumber} Status=${app.status} Scheme=${app.scholarship?.name} Dept=${app.scholarship?.department?.name}`);
    }
  }

  // 2. Check COEP applications
  const coep = await prisma.college.findFirst({ where: { code: 'ENG-PUN-001' } });
  if (coep) {
    const coepApps = await prisma.application.findMany({
      where: { student: { collegeId: coep.id } },
      select: {
        id: true,
        applicationNumber: true,
        status: true,
        student: { select: { fullName: true, user: { select: { email: true } } } },
      },
    });
    console.log(`COEP College (${coep.name}) total applications: ${coepApps.length}`);
    for (const ca of coepApps) {
      console.log(` - ARN: ${ca.applicationNumber} | Student: ${ca.student?.fullName} (${ca.student?.user?.email}) | Status: ${ca.status}`);
    }
  }

  // 3. Check Authority Users
  const authUsers = await prisma.user.findMany({
    where: { role: 'AUTHORITY' },
    select: {
      id: true,
      email: true,
      role: true,
      isActive: true,
      departmentId: true,
      department: { select: { id: true, name: true, code: true } },
    },
  });
  console.log(`Authority Users count: ${authUsers.length}`);
  for (const u of authUsers) {
    console.log(` - User: ${u.email} | Dept: ${u.department?.name} (${u.department?.code}) | Active: ${u.isActive}`);
  }

  console.log('--- VERIFICATION COMPLETED ---');
}

verifyState()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
