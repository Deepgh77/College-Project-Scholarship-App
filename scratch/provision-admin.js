const { prisma } = require('../src/config/prisma');
const bcrypt = require('bcryptjs');

async function provisionAdmin() {
  const hash = await bcrypt.hash('Password@123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@maharashtra.gov.in' },
    update: {
      role: 'ADMIN',
      isActive: true,
      passwordHash: hash,
    },
    create: {
      email: 'admin@maharashtra.gov.in',
      passwordHash: hash,
      role: 'ADMIN',
      isActive: true,
    },
  });
  console.log('Provisioned Admin User:', admin.email, admin.role);
}

provisionAdmin()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
