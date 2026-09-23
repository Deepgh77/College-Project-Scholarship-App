const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const depts = await prisma.department.findMany();
  const scholarships = await prisma.scholarship.findMany();
  const rules = await prisma.scholarshipRule.findMany();
  const docs = await prisma.scholarshipRequiredDoc.findMany();
  console.log('PHASE 3 DATABASE AUDIT:');
  console.log({
    departmentsCount: depts.length,
    departments: depts,
    scholarshipsCount: scholarships.length,
    scholarships: scholarships,
    rulesCount: rules.length,
    requiredDocsCount: docs.length,
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
