const { prisma } = require('../src/config/prisma');

async function inspectDeep() {
  const app = await prisma.application.findFirst({
    where: { applicationNumber: 'MHA-20242025-8B66D9' },
    include: {
      auditLogs: { orderBy: { timestamp: 'asc' } },
      reviews: { orderBy: { reviewedAt: 'asc' } },
    },
  });

  console.log('Deep Patil Status:', app.status);
  console.log('Reviews:');
  for (const r of app.reviews) {
    console.log(` - Role: ${r.reviewerRole}, Decision: ${r.decision}, Remarks: ${r.overallRemarks}, ReviewedAt: ${r.reviewedAt}`);
  }
  console.log('Audit Logs:');
  for (const l of app.auditLogs) {
    console.log(` - Action: ${l.action}, Prev: ${l.previousStatus}, New: ${l.newStatus}, Role: ${l.actorRole}, Remarks: ${l.remarks}, Time: ${l.timestamp}`);
  }
}

inspectDeep()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
