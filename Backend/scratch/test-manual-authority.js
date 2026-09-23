const { prisma } = require('../src/config/prisma');
const authorityService = require('../src/modules/authority/authority.service');

async function checkManualOfficer() {
  const user = await prisma.user.findUnique({
    where: { email: 'officer.obcw@authority.gov.in' },
  });

  const dashboard = await authorityService.getDashboard(user);
  console.log('Centralized Dashboard metrics:', dashboard.metrics);
  console.log('Workload Department Distribution:', dashboard.workload.departmentDistribution);

  const filterOptions = await authorityService.getFilterOptions(user);
  console.log('Filter options departments count:', filterOptions.departments.length);
  console.log('Filter options scholarships count:', filterOptions.scholarships.length);
  console.log('Filter options colleges count:', filterOptions.colleges.length);

  // Test overall queue
  const queueAll = await authorityService.getApplications(user, { status: 'ALL' });
  console.log('All departments queue total:', queueAll.pagination.total);

  // Test filtered by OBCW
  const obcw = filterOptions.departments.find(d => d.code === 'OBCW');
  if (obcw) {
    const queueObcw = await authorityService.getApplications(user, { departmentId: obcw.id });
    console.log(`OBCW (${obcw.name}) filtered total:`, queueObcw.pagination.total);
    for (const app of queueObcw.applications) {
      console.log(` - ARN: ${app.applicationNumber} | Student: ${app.studentName} | Dept: ${app.departmentCode} | Scheme: ${app.scholarshipName}`);
    }
  }

  // Test filtered by SJD
  const sjd = filterOptions.departments.find(d => d.code === 'SJD');
  if (sjd) {
    const queueSjd = await authorityService.getApplications(user, { departmentId: sjd.id });
    console.log(`SJD (${sjd.name}) filtered total:`, queueSjd.pagination.total);
  }
}

checkManualOfficer()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
