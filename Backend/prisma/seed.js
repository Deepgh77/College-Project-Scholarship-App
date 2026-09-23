const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

const ACADEMIC_YEAR = '2024-2025';

const DEPARTMENTS = [
  {
    code: 'SJD',
    name: 'Social Justice & Special Assistance Department',
    description: 'Welfare schemes for Scheduled Castes, Nav-Bouddha, and Persons with Disabilities. (Academic Demo)',
  },
  {
    code: 'TDD',
    name: 'Tribal Development Department',
    description: 'Welfare and higher education scholarship schemes for Scheduled Tribes. (Academic Demo)',
  },
  {
    code: 'DHE',
    name: 'Directorate of Higher Education',
    description: 'Higher education merit and economically backward class fee concession schemes. (Academic Demo)',
  },
  {
    code: 'OBCW',
    name: 'Other Backward Bahujan Welfare Department',
    description: 'Post-matric scholarship and freeship schemes for OBC, VJNT, and SBC communities. (Academic Demo)',
  },
];

const SCHOLARSHIPS = [
  {
    code: 'SJD-SC-001',
    academicYear: ACADEMIC_YEAR,
    departmentCode: 'SJD',
    name: 'Government of India Post-Matric Scholarship for SC Students',
    description:
      'Academic Demonstration Scheme: Financial assistance covering compulsory tuition fees and maintenance allowance for Scheduled Caste students pursuing recognized post-matriculation courses.',
    benefitAmount: 15000.0,
    applicationStartDate: new Date('2024-06-01T00:00:00.000Z'),
    applicationEndDate: new Date('2026-12-31T23:59:59.000Z'),
    isFreshAllowed: true,
    isRenewalAllowed: true,
    isActive: true,
    rules: [
      {
        ruleGroup: 'DEFAULT',
        fieldPath: 'category',
        operator: 'IN',
        targetValue: ['SC'],
        failureReasonText: 'Applicant must belong to the Scheduled Caste (SC) category.',
      },
      {
        ruleGroup: 'DEFAULT',
        fieldPath: 'annualFamilyIncome',
        operator: 'LTE',
        targetValue: 250000,
        failureReasonText: 'Annual family income must not exceed ₹2,50,000.',
      },
      {
        ruleGroup: 'DEFAULT',
        fieldPath: 'state',
        operator: 'EQ',
        targetValue: 'Maharashtra',
        failureReasonText: 'Applicant must be a permanent resident of Maharashtra.',
      },
    ],
    requiredDocs: [
      {
        documentType: 'CASTE_CERT',
        isMandatory: true,
        helpTitle: 'Caste Certificate',
        helpTextSimple: 'Official certificate issued by competent Sub-Divisional Officer / Executive Magistrate.',
      },
      {
        documentType: 'INCOME_CERT',
        isMandatory: true,
        helpTitle: 'Income Certificate',
        helpTextSimple: 'Annual household income certificate issued by Tahsildar (<= ₹2.5 Lakh).',
      },
      {
        documentType: 'MARKSHEET_PREV',
        isMandatory: true,
        helpTitle: 'Previous Year Marksheet',
        helpTextSimple: 'Attested marksheet of the previous qualifying examination.',
      },
      {
        documentType: 'DOMICILE_CERT',
        isMandatory: true,
        helpTitle: 'Domicile Certificate',
        helpTextSimple: 'Certificate of Age, Nationality, and Domicile in Maharashtra.',
      },
    ],
  },
  {
    code: 'OBCW-OBC-002',
    academicYear: ACADEMIC_YEAR,
    departmentCode: 'OBCW',
    name: 'Post-Matric Tuition Fee and Examination Fee (Freeship) for OBC Students',
    description:
      'Academic Demonstration Scheme: Reimbursement of tuition fees and examination fees for eligible Other Backward Class, VJNT, and SBC students enrolled in professional and non-professional degree courses.',
    benefitAmount: 12000.0,
    applicationStartDate: new Date('2024-06-01T00:00:00.000Z'),
    applicationEndDate: new Date('2026-12-31T23:59:59.000Z'),
    isFreshAllowed: true,
    isRenewalAllowed: true,
    isActive: true,
    rules: [
      {
        ruleGroup: 'DEFAULT',
        fieldPath: 'category',
        operator: 'IN',
        targetValue: ['OBC', 'VJNT', 'SBC'],
        failureReasonText: 'Applicant must belong to OBC, VJNT, or SBC categories.',
      },
      {
        ruleGroup: 'DEFAULT',
        fieldPath: 'annualFamilyIncome',
        operator: 'LTE',
        targetValue: 150000,
        failureReasonText: 'Annual family income must not exceed ₹1,50,000.',
      },
    ],
    requiredDocs: [
      {
        documentType: 'CASTE_CERT',
        isMandatory: true,
        helpTitle: 'Caste Certificate',
        helpTextSimple: 'Official OBC/VJNT/SBC caste certificate.',
      },
      {
        documentType: 'INCOME_CERT',
        isMandatory: true,
        helpTitle: 'Income Certificate',
        helpTextSimple: 'Tahsildar income certificate showing annual income up to ₹1.5 Lakh.',
      },
      {
        documentType: 'DOMICILE_CERT',
        isMandatory: true,
        helpTitle: 'Domicile Certificate',
        helpTextSimple: 'Maharashtra domicile certificate.',
      },
    ],
  },
  {
    code: 'DHE-EBC-003',
    academicYear: ACADEMIC_YEAR,
    departmentCode: 'DHE',
    name: 'Rajarshi Chhatrapati Shahu Maharaj Shikshan Shulkh Shishyavrutti Yojna (EBC)',
    description:
      'Academic Demonstration Scheme: 50% tuition fee and exam fee concession for economically weaker students from General and EWS categories admitted to higher education institutes.',
    benefitAmount: 20000.0,
    applicationStartDate: new Date('2024-06-01T00:00:00.000Z'),
    applicationEndDate: new Date('2026-12-31T23:59:59.000Z'),
    isFreshAllowed: true,
    isRenewalAllowed: true,
    isActive: true,
    rules: [
      {
        ruleGroup: 'DEFAULT',
        fieldPath: 'category',
        operator: 'IN',
        targetValue: ['OPEN', 'EWS'],
        failureReasonText: 'Scheme applies to General / OPEN and Economically Weaker Section (EWS) students.',
      },
      {
        ruleGroup: 'DEFAULT',
        fieldPath: 'annualFamilyIncome',
        operator: 'LTE',
        targetValue: 800000,
        failureReasonText: 'Annual family income must not exceed ₹8,00,000.',
      },
      {
        ruleGroup: 'DEFAULT',
        fieldPath: 'previousPercentage',
        operator: 'GTE',
        targetValue: 50.0,
        failureReasonText: 'Minimum 50.0% marks required in previous examination.',
      },
      {
        ruleGroup: 'DEFAULT',
        fieldPath: 'age',
        operator: 'LTE',
        targetValue: 30,
        failureReasonText: 'Applicant age must not exceed 30 years.',
      },
    ],
    requiredDocs: [
      {
        documentType: 'INCOME_CERT',
        isMandatory: true,
        helpTitle: 'Income Certificate',
        helpTextSimple: 'Income certificate issued by Tahsildar (<= ₹8.0 Lakh).',
      },
      {
        documentType: 'MARKSHEET_PREV',
        isMandatory: true,
        helpTitle: 'Previous Year Marksheet',
        helpTextSimple: 'Marksheet certifying at least 50% score in previous academic year.',
      },
      {
        documentType: 'DOMICILE_CERT',
        isMandatory: true,
        helpTitle: 'Domicile Certificate',
        helpTextSimple: 'Maharashtra Domicile Certificate.',
      },
    ],
  },
  {
    code: 'DHE-GIRLS-004',
    academicYear: ACADEMIC_YEAR,
    departmentCode: 'DHE',
    name: 'State Government Open Merit Scholarship for Girls',
    description:
      'Academic Demonstration Scheme: State affirmative scholarship encouraging meritorious girl students in higher education.',
    benefitAmount: 10000.0,
    applicationStartDate: new Date('2024-06-01T00:00:00.000Z'),
    applicationEndDate: new Date('2026-12-31T23:59:59.000Z'),
    isFreshAllowed: true,
    isRenewalAllowed: true,
    isActive: true,
    rules: [
      {
        ruleGroup: 'DEFAULT',
        fieldPath: 'gender',
        operator: 'EQ',
        targetValue: 'FEMALE',
        failureReasonText: 'This scholarship is exclusively open to female students.',
      },
      {
        ruleGroup: 'DEFAULT',
        fieldPath: 'previousPercentage',
        operator: 'GTE',
        targetValue: 70.0,
        failureReasonText: 'Minimum 70.0% marks required in previous qualifying examination.',
      },
    ],
    requiredDocs: [
      {
        documentType: 'MARKSHEET_PREV',
        isMandatory: true,
        helpTitle: 'Previous Marksheet',
        helpTextSimple: 'Attested marksheet showing 70% or higher.',
      },
      {
        documentType: 'DOMICILE_CERT',
        isMandatory: true,
        helpTitle: 'Domicile Certificate',
        helpTextSimple: 'Maharashtra Domicile Certificate.',
      },
    ],
  },
  {
    code: 'SJD-DIV-005',
    academicYear: ACADEMIC_YEAR,
    departmentCode: 'SJD',
    name: 'Post-Matric Scholarship for Persons with Disability (Divyang Quota & Merit Pathway)',
    description:
      'Academic Demonstration Scheme: Inclusive support for Divyang students via Disability Quota (>=40% disability & income <= ₹2.5L) OR high-merit inclusive pathway (>=75% marks).',
    benefitAmount: 18000.0,
    applicationStartDate: new Date('2024-06-01T00:00:00.000Z'),
    applicationEndDate: new Date('2026-12-31T23:59:59.000Z'),
    isFreshAllowed: true,
    isRenewalAllowed: true,
    isActive: true,
    rules: [
      // Rule Group 1: DIVYANG_QUOTA
      {
        ruleGroup: 'DIVYANG_QUOTA',
        fieldPath: 'isHandicapped',
        operator: 'EQ',
        targetValue: true,
        failureReasonText: 'Applicant must be a registered Person with Disability.',
      },
      {
        ruleGroup: 'DIVYANG_QUOTA',
        fieldPath: 'disabilityPercentage',
        operator: 'GTE',
        targetValue: 40,
        failureReasonText: 'Disability percentage must be at least 40%.',
      },
      {
        ruleGroup: 'DIVYANG_QUOTA',
        fieldPath: 'annualFamilyIncome',
        operator: 'LTE',
        targetValue: 250000,
        failureReasonText: 'Annual family income must not exceed ₹2,50,000 under quota category.',
      },
      // Rule Group 2: MERIT_PATHWAY
      {
        ruleGroup: 'MERIT_PATHWAY',
        fieldPath: 'isHandicapped',
        operator: 'EQ',
        targetValue: true,
        failureReasonText: 'Applicant must be a registered Person with Disability.',
      },
      {
        ruleGroup: 'MERIT_PATHWAY',
        fieldPath: 'previousPercentage',
        operator: 'GTE',
        targetValue: 75.0,
        failureReasonText: 'Inclusive merit pathway requires at least 75.0% marks.',
      },
    ],
    requiredDocs: [
      {
        documentType: 'DISABILITY_CERT',
        isMandatory: true,
        helpTitle: 'Disability Certificate',
        helpTextSimple: 'Civil Surgeon or competent Medical Board Divyang Certificate.',
      },
      {
        documentType: 'INCOME_CERT',
        isMandatory: false,
        helpTitle: 'Income Certificate',
        helpTextSimple: 'Optional if qualifying via the high-merit pathway.',
      },
      {
        documentType: 'MARKSHEET_PREV',
        isMandatory: true,
        helpTitle: 'Previous Year Marksheet',
        helpTextSimple: 'Official academic marksheet.',
      },
    ],
  },
  {
    code: 'TDD-ST-006',
    academicYear: ACADEMIC_YEAR,
    departmentCode: 'TDD',
    name: 'Post-Matric Scholarship for ST Students (Application Closed Demo)',
    description:
      'Academic Demonstration Scheme: Tribal scholarship with past application window to verify application window display.',
    benefitAmount: 14000.0,
    applicationStartDate: new Date('2024-01-01T00:00:00.000Z'),
    applicationEndDate: new Date('2024-05-01T23:59:59.000Z'),
    isFreshAllowed: true,
    isRenewalAllowed: true,
    isActive: true,
    rules: [
      {
        ruleGroup: 'DEFAULT',
        fieldPath: 'category',
        operator: 'IN',
        targetValue: ['ST'],
        failureReasonText: 'Applicant must belong to Scheduled Tribe (ST) category.',
      },
    ],
    requiredDocs: [
      {
        documentType: 'CASTE_CERT',
        isMandatory: true,
        helpTitle: 'Tribe Certificate',
        helpTextSimple: 'Valid Scheduled Tribe certificate.',
      },
    ],
  },
  {
    code: 'SJD-ARCHIVED-007',
    academicYear: ACADEMIC_YEAR,
    departmentCode: 'SJD',
    name: 'Archived State Welfare Scheme (Inactive Demo)',
    description:
      'Academic Demonstration Scheme: Inactive scheme for testing discovery exclusion.',
    benefitAmount: 5000.0,
    applicationStartDate: new Date('2024-01-01T00:00:00.000Z'),
    applicationEndDate: new Date('2026-12-31T23:59:59.000Z'),
    isFreshAllowed: false,
    isRenewalAllowed: false,
    isActive: false,
    rules: [
      {
        ruleGroup: 'DEFAULT',
        fieldPath: 'annualFamilyIncome',
        operator: 'LTE',
        targetValue: 100000,
        failureReasonText: 'Income must be under ₹1,00,000.',
      },
    ],
    requiredDocs: [],
  },
];

async function seed() {
  console.log('=== STARTING PHASE 3 SCHOLARSHIP MASTER SEEDING ===\n');

  // 1. Seed Departments
  console.log('1. Seeding Departments...');
  const deptMap = {};
  for (const d of DEPARTMENTS) {
    const dept = await prisma.department.upsert({
      where: { code: d.code },
      update: {
        name: d.name,
        description: d.description,
        isActive: true,
      },
      create: {
        code: d.code,
        name: d.name,
        description: d.description,
        isActive: true,
      },
    });
    deptMap[d.code] = dept.id;
    console.log(`   [DEPT] ${dept.code} — ${dept.name}`);
  }

  // 2. Seed Scholarships & Rules
  console.log('\n2. Seeding Scholarships, Rules & Required Documents...');
  for (const s of SCHOLARSHIPS) {
    const departmentId = deptMap[s.departmentCode];
    if (!departmentId) {
      console.warn(`   Skipping ${s.code}: Department ${s.departmentCode} not found.`);
      continue;
    }

    const scholarship = await prisma.scholarship.upsert({
      where: {
        code_academicYear: {
          code: s.code,
          academicYear: s.academicYear,
        },
      },
      update: {
        name: s.name,
        description: s.description,
        benefitAmount: s.benefitAmount,
        applicationStartDate: s.applicationStartDate,
        applicationEndDate: s.applicationEndDate,
        isFreshAllowed: s.isFreshAllowed,
        isRenewalAllowed: s.isRenewalAllowed,
        isActive: s.isActive,
        departmentId,
      },
      create: {
        code: s.code,
        academicYear: s.academicYear,
        name: s.name,
        description: s.description,
        benefitAmount: s.benefitAmount,
        applicationStartDate: s.applicationStartDate,
        applicationEndDate: s.applicationEndDate,
        isFreshAllowed: s.isFreshAllowed,
        isRenewalAllowed: s.isRenewalAllowed,
        isActive: s.isActive,
        departmentId,
      },
    });

    // Upsert Rules
    for (const r of s.rules) {
      await prisma.scholarshipRule.upsert({
        where: {
          scholarshipId_ruleGroup_fieldPath_operator: {
            scholarshipId: scholarship.id,
            ruleGroup: r.ruleGroup,
            fieldPath: r.fieldPath,
            operator: r.operator,
          },
        },
        update: {
          targetValue: r.targetValue,
          failureReasonText: r.failureReasonText,
        },
        create: {
          scholarshipId: scholarship.id,
          ruleGroup: r.ruleGroup,
          fieldPath: r.fieldPath,
          operator: r.operator,
          targetValue: r.targetValue,
          failureReasonText: r.failureReasonText,
        },
      });
    }

    // Upsert Required Documents
    for (const doc of s.requiredDocs) {
      await prisma.scholarshipRequiredDoc.upsert({
        where: {
          scholarshipId_documentType: {
            scholarshipId: scholarship.id,
            documentType: doc.documentType,
          },
        },
        update: {
          isMandatory: doc.isMandatory,
          helpTitle: doc.helpTitle,
          helpTextSimple: doc.helpTextSimple,
        },
        create: {
          scholarshipId: scholarship.id,
          documentType: doc.documentType,
          isMandatory: doc.isMandatory,
          helpTitle: doc.helpTitle,
          helpTextSimple: doc.helpTextSimple,
        },
      });
    }

    console.log(`   [SCHOLARSHIP] ${scholarship.code} — ${scholarship.name} (${s.rules.length} rules, ${s.requiredDocs.length} docs)`);
  }

  // 3. Provision Stable College Officer User for Manual QA
  console.log('\n3. Provisioning Stable College Officer for COEP (ENG-PUN-001)...');
  const coepCollege = await prisma.college.findUnique({
    where: { code: 'ENG-PUN-001' },
  });

  if (!coepCollege) {
    console.warn('   [WARN] College ENG-PUN-001 not found; skipping College Officer provisioning.');
  } else {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('Password@123', salt);

    const officer = await prisma.user.upsert({
      where: { email: 'officer.coep@college.ac.in' },
      update: {
        role: 'COLLEGE',
        collegeId: coepCollege.id,
        isActive: true,
        passwordHash,
      },
      create: {
        email: 'officer.coep@college.ac.in',
        passwordHash,
        role: 'COLLEGE',
        collegeId: coepCollege.id,
        isActive: true,
      },
    });

    console.log(`   [USER] Provisioned College Officer: ${officer.email} linked to ${coepCollege.name} (${coepCollege.code})`);
  }

  // 4. Provision Stable Development Admin User (Academic/Demo)
  console.log('\n4. Provisioning Stable Development Admin User (Academic/Local)...');
  const adminEmail = 'admin@scholarship.local';
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  const salt = await bcrypt.genSalt(10);
  const adminHash = await bcrypt.hash('Admin@123', salt);

  if (existingAdmin) {
    const updated = await prisma.user.update({
      where: { email: adminEmail },
      data: {
        role: 'ADMIN',
        isActive: true,
      },
    });
    console.log(`   [USER] Verified Development Admin: ${updated.email} (Role: ${updated.role}, Active: ${updated.isActive})`);
  } else {
    const created = await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash: adminHash,
        role: 'ADMIN',
        isActive: true,
      },
    });
    console.log(`   [USER] Created Development Admin: ${created.email} (Role: ${created.role}, Active: ${created.isActive})`);
  }

  const finalDepts = await prisma.department.count();
  const finalSchols = await prisma.scholarship.count();
  const finalRules = await prisma.scholarshipRule.count();
  const finalDocs = await prisma.scholarshipRequiredDoc.count();

  console.log('\n=== SEEDING COMPLETED SUCCESSFULLY ===');
  console.log(`Total Departments: ${finalDepts}`);
  console.log(`Total Scholarships: ${finalSchols}`);
  console.log(`Total Rules: ${finalRules}`);
  console.log(`Total Required Documents: ${finalDocs}`);
}

seed()
  .catch((err) => {
    console.error('Error during seeding:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
