const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({
    where: { email: 'real.student.audit@example.com' },
  });
  const profile = await prisma.studentProfile.findUnique({
    where: { userId: user.id },
  });
  console.log('BROWSER TEST USER PROFILE IN DB:');
  console.log(JSON.stringify(profile, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
