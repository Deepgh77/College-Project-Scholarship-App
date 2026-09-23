const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, role: true, createdAt: true }
  });
  console.log('USERS (' + users.length + '):', JSON.stringify(users, null, 2));

  const profiles = await prisma.studentProfile.findMany();
  console.log('PROFILES (' + profiles.length + '):', JSON.stringify(profiles, null, 2));

  const docs = await prisma.document.count();
  const apps = await prisma.application.count();
  const pays = await prisma.paymentRecord.count();
  const grievs = await prisma.grievance.count();
  console.log('COUNTS:', { docs, apps, pays, grievs });
}

main().catch(console.error).finally(() => prisma.$disconnect());
