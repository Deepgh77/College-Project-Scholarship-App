const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function provisionDevAdmin() {
  console.log('====================================================');
  console.log('PROVISIONING LOCAL ACADEMIC DEVELOPMENT ADMIN ACCOUNT');
  console.log('====================================================\n');

  const email = 'admin@scholarship.local';
  const rawPassword = 'Admin@123';

  // 1. Check whether this exact Admin account already exists
  const existing = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      role: true,
      isActive: true,
      collegeId: true,
      departmentId: true,
      createdAt: true,
    },
  });

  if (existing) {
    console.log(`[EXISTS] Found existing development admin user: ${existing.email} (ID: ${existing.id})`);
    
    // Ensure it has ADMIN role and is active, without creating duplicates
    const updated = await prisma.user.update({
      where: { email },
      data: {
        role: 'ADMIN',
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        collegeId: true,
        departmentId: true,
        updatedAt: true,
      },
    });

    console.log(`[STATUS] Confirmed ADMIN role and active status for: ${updated.email}`);
    console.log('User Record:', JSON.stringify(updated, null, 2));
    return { accountCreated: false, user: updated };
  }

  // 2. If it does not exist, hash password with bcrypt and create account
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(rawPassword, salt);

  const created = await prisma.user.create({
    data: {
      email,
      passwordHash,
      role: 'ADMIN',
      isActive: true,
    },
    select: {
      id: true,
      email: true,
      role: true,
      isActive: true,
      collegeId: true,
      departmentId: true,
      createdAt: true,
    },
  });

  console.log(`[CREATED] Successfully created development admin user: ${created.email} (ID: ${created.id})`);
  console.log('User Record:', JSON.stringify(created, null, 2));
  return { accountCreated: true, user: created };
}

if (require.main === module) {
  provisionDevAdmin()
    .catch((err) => {
      console.error('Error provisioning development admin:', err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

module.exports = { provisionDevAdmin };
