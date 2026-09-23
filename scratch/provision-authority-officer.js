const bcrypt = require('bcryptjs');
const { prisma } = require('../src/config/prisma');

async function provisionAuthorityOfficer() {
  const obcwDept = await prisma.department.findFirst({
    where: { code: 'OBCW' },
  });

  if (!obcwDept) {
    console.error('OBCW department not found');
    return;
  }

  const email = 'officer.obcw@authority.gov.in';
  const passwordHash = await bcrypt.hash('Password@123', 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      role: 'AUTHORITY',
      departmentId: obcwDept.id,
      isActive: true,
    },
    create: {
      email,
      passwordHash,
      role: 'AUTHORITY',
      departmentId: obcwDept.id,
      isActive: true,
    },
  });

  console.log(`Provisioned stable Authority Officer: ${user.email} (ID: ${user.id}) for Dept: ${obcwDept.name} (${obcwDept.code})`);
}

provisionAuthorityOfficer()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
