const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const del = await prisma.studentProfile.deleteMany({
    where: { userId: 'ab1a93fa-e7ee-4572-8172-09a6a1cbe744' },
  });
  console.log('Deleted test profile rows:', del.count);

  const remaining = await prisma.studentProfile.count();
  console.log('Remaining student profiles:', remaining);
}

main().catch(console.error).finally(() => prisma.$disconnect());
