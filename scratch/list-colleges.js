const { prisma } = require('../src/config/prisma');

async function listColleges() {
  const colleges = await prisma.college.findMany({
    orderBy: { createdAt: 'asc' },
  });
  console.log(`TOTAL COLLEGES: ${colleges.length}`);
  for (const c of colleges) {
    console.log(`- [${c.id}] Code: ${c.code} | Name: ${c.name} | Created: ${c.createdAt.toISOString()}`);
  }
}

listColleges()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
