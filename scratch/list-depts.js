const { prisma } = require('../src/config/prisma');

async function listDepts() {
  const depts = await prisma.department.findMany({
    include: {
      scholarships: { select: { id: true, name: true, code: true } },
    },
  });
  console.log('Departments in DB:');
  for (const d of depts) {
    console.log(`- [${d.id}] ${d.name} (${d.code}) -> ${d.scholarships.length} scholarships`);
    for (const s of d.scholarships) {
      console.log(`    * ${s.code}: ${s.name}`);
    }
  }
}

listDepts()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
