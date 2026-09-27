const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

/**
 * CLI Tool for Secure Account Provisioning
 * Usage:
 *   node prisma/provision-staff.js --role=ADMIN --email=admin@example.com --password=SecretPassword123
 *   node prisma/provision-staff.js --role=COLLEGE --email=officer@college.edu --password=SecretPassword123 --collegeCode=ENG-PUN-001
 *   node prisma/provision-staff.js --role=AUTHORITY --email=officer@authority.gov.in --password=SecretPassword123 --deptCode=SJD
 */
async function main() {
  const args = process.argv.slice(2);
  const params = {};

  args.forEach((arg) => {
    if (arg.startsWith('--')) {
      const [key, ...vals] = arg.slice(2).split('=');
      params[key] = vals.join('=');
    }
  });

  const role = (params.role || process.env.STAFF_ROLE || '').toUpperCase();
  const email = (params.email || process.env.STAFF_EMAIL || '').trim().toLowerCase();
  const password = params.password || process.env.STAFF_PASSWORD;
  const collegeCode = (params.collegeCode || process.env.STAFF_COLLEGE_CODE || '').trim().toUpperCase();
  const deptCode = (params.deptCode || process.env.STAFF_DEPT_CODE || '').trim().toUpperCase();

  console.log('========================================================');
  console.log('INSTITUTIONAL STAFF & ADMIN SECURE PROVISIONING UTILITY');
  console.log('========================================================\n');

  if (!['ADMIN', 'COLLEGE', 'AUTHORITY'].includes(role)) {
    console.error('Error: --role must be one of: ADMIN, COLLEGE, AUTHORITY');
    process.exit(1);
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    console.error('Error: A valid --email address is required.');
    process.exit(1);
  }

  if (!password || password.length < 8) {
    console.error('Error: A secure --password with at least 8 characters is required.');
    process.exit(1);
  }

  let collegeId = null;
  let departmentId = null;

  if (role === 'COLLEGE') {
    if (!collegeCode) {
      console.error('Error: --collegeCode is required for COLLEGE role (e.g. --collegeCode=ENG-PUN-001)');
      const colleges = await prisma.college.findMany({ select: { code: true, name: true } });
      console.log('\nAvailable Colleges:');
      colleges.forEach((c) => console.log(` - ${c.code}: ${c.name}`));
      process.exit(1);
    }
    const college = await prisma.college.findUnique({ where: { code: collegeCode } });
    if (!college) {
      console.error(`Error: College code "${collegeCode}" not found in database.`);
      process.exit(1);
    }
    collegeId = college.id;
    console.log(`Linking account to College: ${college.name} (${college.code})`);
  }

  if (role === 'AUTHORITY') {
    if (!deptCode) {
      console.error('Error: --deptCode is required for AUTHORITY role (e.g. --deptCode=SJD, TDD, DHE, OBCW)');
      const depts = await prisma.department.findMany({ select: { code: true, name: true } });
      console.log('\nAvailable Departments:');
      depts.forEach((d) => console.log(` - ${d.code}: ${d.name}`));
      process.exit(1);
    }
    const department = await prisma.department.findUnique({ where: { code: deptCode } });
    if (!department) {
      console.error(`Error: Department code "${deptCode}" not found in database.`);
      process.exit(1);
    }
    departmentId = department.id;
    console.log(`Linking account to Department: ${department.name} (${department.code})`);
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      role,
      passwordHash,
      collegeId,
      departmentId,
      isActive: true,
    },
    create: {
      email,
      passwordHash,
      role,
      collegeId,
      departmentId,
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
      updatedAt: true,
    },
  });

  console.log('\nSUCCESS: Staff user successfully provisioned:');
  console.log(`- ID: ${user.id}`);
  console.log(`- Email: ${user.email}`);
  console.log(`- Role: ${user.role}`);
  console.log(`- Active: ${user.isActive}`);
  console.log(`- College Linked: ${user.collegeId || 'None'}`);
  console.log(`- Department Linked: ${user.departmentId || 'None'}`);
}

main()
  .catch((err) => {
    console.error('Provisioning failed:', err.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
