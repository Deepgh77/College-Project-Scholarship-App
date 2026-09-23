const { prisma } = require('../src/config/prisma');

async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
  });
  console.log(`Total users in DB: ${users.length}`);
  users.forEach((u, i) => {
    console.log(`${i + 1}. [${u.role}] ${u.email} (active: ${u.isActive}, id: ${u.id})`);
  });
  await prisma.$disconnect();
}

main().catch(console.error);
