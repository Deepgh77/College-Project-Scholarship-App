const { prisma } = require('../../config/prisma');

class AdminRepository {
  // ===========================================================================
  // 1. DASHBOARD & SYSTEM METRICS
  // ===========================================================================
  async getDashboardStats() {
    const [
      totalStudents,
      totalColleges,
      activeColleges,
      totalDepartments,
      totalScholarships,
      totalApplications,
      statusCountsRaw,
      openGrievances,
      recentActivity,
      academicYearCountsRaw,
      departmentCountsRaw,
    ] = await Promise.all([
      prisma.user.count({ where: { role: 'STUDENT' } }),
      prisma.college.count(),
      prisma.college.count({ where: { isActive: true } }),
      prisma.department.count(),
      prisma.scholarship.count(),
      prisma.application.count(),
      prisma.application.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
      prisma.grievance.count({
        where: { status: { in: ['OPEN', 'UNDER_REVIEW'] } },
      }),
      prisma.applicationAuditLog.findMany({
        take: 10,
        orderBy: { timestamp: 'desc' },
        include: {
          application: {
            select: {
              id: true,
              applicationNumber: true,
              academicYear: true,
              student: { select: { fullName: true } },
            },
          },
          actorUser: {
            select: { id: true, email: true, role: true },
          },
        },
      }),
      prisma.application.groupBy({
        by: ['academicYear'],
        _count: { id: true },
        orderBy: { academicYear: 'desc' },
      }),
      prisma.scholarship.findMany({
        select: {
          department: { select: { id: true, code: true, name: true } },
          _count: { select: { applications: true } },
        },
      }),
    ]);

    // Build status lookup map
    const statusMap = {};
    for (const item of statusCountsRaw) {
      statusMap[item.status] = item._count.id;
    }

    // High-level consolidated metrics
    const highLevelMetrics = {
      totalApplications,
      pendingCollege:
        (statusMap['SUBMITTED'] || 0) +
        (statusMap['UNDER_COLLEGE_REVIEW'] || 0) +
        (statusMap['RESUBMITTED_TO_COLLEGE'] || 0),
      pendingAuthority:
        (statusMap['FORWARDED_TO_AUTHORITY'] || 0) +
        (statusMap['UNDER_AUTHORITY_REVIEW'] || 0),
      sentBack:
        (statusMap['COLLEGE_SENT_BACK'] || 0) +
        (statusMap['AUTHORITY_SENT_BACK'] || 0),
      approved: statusMap['APPROVED'] || 0,
      rejected:
        (statusMap['COLLEGE_REJECTED'] || 0) +
        (statusMap['AUTHORITY_REJECTED'] || 0),
      paymentProcessing:
        (statusMap['PAYMENT_PROCESSING'] || 0) +
        (statusMap['PAYMENT_INITIATED'] || 0),
      disbursed: statusMap['DISBURSED'] || 0,
      undisbursed: statusMap['UNDISBURSED'] || 0,
      cancelledOrGivenUp:
        (statusMap['CANCELLED'] || 0) +
        (statusMap['RIGHT_TO_GIVE_UP'] || 0),
      draft: statusMap['DRAFT'] || 0,
      openGrievances,
    };

    // Department application totals
    const deptMap = {};
    for (const item of departmentCountsRaw) {
      const deptId = item.department.id;
      if (!deptMap[deptId]) {
        deptMap[deptId] = {
          id: deptId,
          code: item.department.code,
          name: item.department.name,
          applicationsCount: 0,
        };
      }
      deptMap[deptId].applicationsCount += item._count.applications;
    }
    const departmentDistribution = Object.values(deptMap);

    return {
      overview: {
        totalStudents,
        totalColleges,
        activeColleges,
        totalDepartments,
        totalScholarships,
        totalApplications,
        openGrievances,
      },
      metrics: highLevelMetrics,
      statusBreakdown: statusMap,
      academicYearDistribution: academicYearCountsRaw.map((y) => ({
        academicYear: y.academicYear,
        count: y._count.id,
      })),
      departmentDistribution,
      recentActivity,
    };
  }

  // ===========================================================================
  // 2. USER MANAGEMENT
  // ===========================================================================
  async findUsers({ role, isActive, search, page = 1, limit = 20 }) {
    const where = {};
    if (role && role !== 'ALL') {
      where.role = role;
    }
    if (isActive !== undefined && isActive !== 'ALL') {
      where.isActive = isActive === 'true' || isActive === true;
    }
    if (search && search.trim()) {
      const term = search.trim();
      where.OR = [
        { email: { contains: term, mode: 'insensitive' } },
        { studentProfile: { fullName: { contains: term, mode: 'insensitive' } } },
      ];
    }

    const skip = (page - 1) * limit;

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          collegeId: true,
          departmentId: true,
          college: { select: { id: true, name: true, code: true } },
          department: { select: { id: true, name: true, code: true } },
          studentProfile: {
            select: {
              id: true,
              fullName: true,
              mobile: true,
              category: true,
              college: { select: { id: true, name: true } },
              _count: { select: { applications: true } },
            },
          },
        },
      }),
    ]);

    return { total, users, page, limit, totalPages: Math.ceil(total / limit) || 1 };
  }

  async findUserById(userId) {
    return prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        collegeId: true,
        departmentId: true,
        college: { select: { id: true, name: true, code: true } },
        department: { select: { id: true, name: true, code: true } },
        studentProfile: {
          include: {
            college: true,
            applications: {
              select: {
                id: true,
                applicationNumber: true,
                status: true,
                academicYear: true,
                submittedAt: true,
                scholarship: { select: { name: true, code: true } },
              },
            },
          },
        },
      },
    });
  }

  async countActiveAdmins() {
    return prisma.user.count({
      where: { role: 'ADMIN', isActive: true },
    });
  }

  async updateUserStatus(userId, isActive) {
    return prisma.user.update({
      where: { id: userId },
      data: { isActive },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        updatedAt: true,
      },
    });
  }

  async createStaffUser({ email, passwordHash, role, collegeId, departmentId }) {
    return prisma.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        role,
        collegeId: collegeId || null,
        departmentId: departmentId || null,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        role: true,
        collegeId: true,
        departmentId: true,
        isActive: true,
        createdAt: true,
      },
    });
  }

  // ===========================================================================
  // 3. COLLEGE MASTER MANAGEMENT
  // ===========================================================================
  async findColleges({ search, isActive, page = 1, limit = 20 }) {
    const where = {};
    if (isActive !== undefined && isActive !== 'ALL') {
      where.isActive = isActive === 'true' || isActive === true;
    }
    if (search && search.trim()) {
      const term = search.trim();
      where.OR = [
        { code: { contains: term, mode: 'insensitive' } },
        { name: { contains: term, mode: 'insensitive' } },
        { university: { contains: term, mode: 'insensitive' } },
        { district: { contains: term, mode: 'insensitive' } },
      ];
    }

    const skip = (page - 1) * limit;

    const [total, colleges] = await Promise.all([
      prisma.college.count({ where }),
      prisma.college.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        include: {
          _count: {
            select: { students: true, users: true },
          },
        },
      }),
    ]);

    return { total, colleges, page, limit, totalPages: Math.ceil(total / limit) || 1 };
  }

  async findCollegeById(id) {
    return prisma.college.findUnique({
      where: { id },
      include: {
        users: {
          select: { id: true, email: true, role: true, isActive: true },
        },
        _count: {
          select: { students: true, users: true },
        },
      },
    });
  }

  async createCollege(data) {
    return prisma.college.create({
      data: {
        code: data.code.toUpperCase().trim(),
        name: data.name.trim(),
        university: data.university.trim(),
        district: data.district.trim(),
        taluka: data.taluka.trim(),
        isActive: data.isActive !== undefined ? data.isActive : true,
      },
    });
  }

  async updateCollege(id, data) {
    return prisma.college.update({
      where: { id },
      data: {
        name: data.name?.trim(),
        university: data.university?.trim(),
        district: data.district?.trim(),
        taluka: data.taluka?.trim(),
      },
    });
  }

  async updateCollegeStatus(id, isActive) {
    return prisma.college.update({
      where: { id },
      data: { isActive },
    });
  }

  async countCollegeReferences(id) {
    const [studentsCount, usersCount] = await Promise.all([
      prisma.studentProfile.count({ where: { collegeId: id } }),
      prisma.user.count({ where: { collegeId: id } }),
    ]);
    return studentsCount + usersCount;
  }

  // ===========================================================================
  // 4. DEPARTMENT MASTER MANAGEMENT
  // ===========================================================================
  async findDepartments({ search, isActive }) {
    const where = {};
    if (isActive !== undefined && isActive !== 'ALL') {
      where.isActive = isActive === 'true' || isActive === true;
    }
    if (search && search.trim()) {
      const term = search.trim();
      where.OR = [
        { code: { contains: term, mode: 'insensitive' } },
        { name: { contains: term, mode: 'insensitive' } },
      ];
    }

    return prisma.department.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { scholarships: true, users: true, paymentBatches: true },
        },
      },
    });
  }

  async findDepartmentById(id) {
    return prisma.department.findUnique({
      where: { id },
      include: {
        scholarships: {
          select: { id: true, code: true, name: true, academicYear: true, isActive: true },
        },
        users: {
          select: { id: true, email: true, role: true, isActive: true },
        },
        _count: {
          select: { scholarships: true, users: true, paymentBatches: true },
        },
      },
    });
  }

  async createDepartment(data) {
    return prisma.department.create({
      data: {
        code: data.code.toUpperCase().trim(),
        name: data.name.trim(),
        description: data.description ? data.description.trim() : null,
        isActive: data.isActive !== undefined ? data.isActive : true,
      },
    });
  }

  async updateDepartment(id, data) {
    return prisma.department.update({
      where: { id },
      data: {
        name: data.name?.trim(),
        description: data.description !== undefined ? data.description?.trim() : undefined,
      },
    });
  }

  async updateDepartmentStatus(id, isActive) {
    return prisma.department.update({
      where: { id },
      data: { isActive },
    });
  }

  async countDepartmentReferences(id) {
    const [scholarshipsCount, usersCount, batchesCount] = await Promise.all([
      prisma.scholarship.count({ where: { departmentId: id } }),
      prisma.user.count({ where: { departmentId: id } }),
      prisma.paymentBatch.count({ where: { departmentId: id } }),
    ]);
    return scholarshipsCount + usersCount + batchesCount;
  }

  // ===========================================================================
  // 5. SCHOLARSHIP SCHEME MANAGEMENT
  // ===========================================================================
  async findScholarships({ departmentId, academicYear, isActive, search, page = 1, limit = 20 }) {
    const where = {};
    if (departmentId) where.departmentId = departmentId;
    if (academicYear) where.academicYear = academicYear;
    if (isActive !== undefined && isActive !== 'ALL') {
      where.isActive = isActive === 'true' || isActive === true;
    }
    if (search && search.trim()) {
      const term = search.trim();
      where.OR = [
        { code: { contains: term, mode: 'insensitive' } },
        { name: { contains: term, mode: 'insensitive' } },
      ];
    }

    const skip = (page - 1) * limit;

    const [total, scholarships] = await Promise.all([
      prisma.scholarship.count({ where }),
      prisma.scholarship.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ academicYear: 'desc' }, { name: 'asc' }],
        include: {
          department: { select: { id: true, code: true, name: true } },
          _count: {
            select: { applications: true, rules: true, requiredDocuments: true },
          },
        },
      }),
    ]);

    return { total, scholarships, page, limit, totalPages: Math.ceil(total / limit) || 1 };
  }

  async findScholarshipById(id) {
    return prisma.scholarship.findUnique({
      where: { id },
      include: {
        department: true,
        rules: { orderBy: { createdAt: 'asc' } },
        requiredDocuments: { orderBy: { createdAt: 'asc' } },
        _count: {
          select: { applications: true },
        },
      },
    });
  }

  async createScholarship(data) {
    return prisma.scholarship.create({
      data: {
        departmentId: data.departmentId,
        code: data.code.toUpperCase().trim(),
        academicYear: data.academicYear.trim(),
        name: data.name.trim(),
        description: data.description.trim(),
        benefitAmount: Number(data.benefitAmount),
        applicationStartDate: new Date(data.applicationStartDate),
        applicationEndDate: new Date(data.applicationEndDate),
        isFreshAllowed: data.isFreshAllowed !== undefined ? Boolean(data.isFreshAllowed) : true,
        isRenewalAllowed: data.isRenewalAllowed !== undefined ? Boolean(data.isRenewalAllowed) : true,
        isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
      },
      include: {
        department: true,
      },
    });
  }

  async updateScholarship(id, data) {
    const updateData = {};
    if (data.name) updateData.name = data.name.trim();
    if (data.description) updateData.description = data.description.trim();
    if (data.benefitAmount !== undefined) updateData.benefitAmount = Number(data.benefitAmount);
    if (data.applicationStartDate) updateData.applicationStartDate = new Date(data.applicationStartDate);
    if (data.applicationEndDate) updateData.applicationEndDate = new Date(data.applicationEndDate);
    if (data.isFreshAllowed !== undefined) updateData.isFreshAllowed = Boolean(data.isFreshAllowed);
    if (data.isRenewalAllowed !== undefined) updateData.isRenewalAllowed = Boolean(data.isRenewalAllowed);
    if (data.isActive !== undefined) updateData.isActive = Boolean(data.isActive);

    return prisma.scholarship.update({
      where: { id },
      data: updateData,
      include: {
        department: true,
      },
    });
  }

  async updateScholarshipStatus(id, isActive) {
    return prisma.scholarship.update({
      where: { id },
      data: { isActive },
    });
  }

  async countScholarshipApplications(scholarshipId) {
    return prisma.application.count({
      where: { scholarshipId },
    });
  }

  // ===========================================================================
  // 6. ELIGIBILITY RULES & REQUIRED DOCUMENTS
  // ===========================================================================
  async createScholarshipRule({ scholarshipId, ruleGroup, fieldPath, operator, targetValue, failureReasonText }) {
    return prisma.scholarshipRule.create({
      data: {
        scholarshipId,
        ruleGroup: ruleGroup || 'DEFAULT',
        fieldPath,
        operator,
        targetValue,
        failureReasonText: failureReasonText.trim(),
      },
    });
  }

  async findScholarshipRuleById(ruleId) {
    return prisma.scholarshipRule.findUnique({
      where: { id: ruleId },
    });
  }

  async deleteScholarshipRule(ruleId) {
    return prisma.scholarshipRule.delete({
      where: { id: ruleId },
    });
  }

  async createScholarshipRequiredDoc({ scholarshipId, documentType, isMandatory, helpTitle, helpTextSimple }) {
    return prisma.scholarshipRequiredDoc.create({
      data: {
        scholarshipId,
        documentType,
        isMandatory: isMandatory !== undefined ? Boolean(isMandatory) : true,
        helpTitle: helpTitle.trim(),
        helpTextSimple: helpTextSimple.trim(),
      },
    });
  }

  async findScholarshipRequiredDocById(docId) {
    return prisma.scholarshipRequiredDoc.findUnique({
      where: { id: docId },
    });
  }

  async updateScholarshipRequiredDoc(docId, data) {
    return prisma.scholarshipRequiredDoc.update({
      where: { id: docId },
      data: {
        isMandatory: data.isMandatory !== undefined ? Boolean(data.isMandatory) : undefined,
        helpTitle: data.helpTitle?.trim(),
        helpTextSimple: data.helpTextSimple?.trim(),
      },
    });
  }

  async deleteScholarshipRequiredDoc(docId) {
    return prisma.scholarshipRequiredDoc.delete({
      where: { id: docId },
    });
  }

  // ===========================================================================
  // 7. APPLICATION MONITORING (STRICTLY READ-ONLY)
  // ===========================================================================
  async findApplications({
    departmentId,
    scholarshipId,
    collegeId,
    academicYear,
    status,
    search,
    page = 1,
    limit = 20,
  }) {
    const where = {};
    if (departmentId) where.scholarship = { departmentId };
    if (scholarshipId) where.scholarshipId = scholarshipId;
    if (academicYear) where.academicYear = academicYear;
    if (status && status !== 'ALL') where.status = status;
    if (collegeId) where.student = { collegeId };

    if (search && search.trim()) {
      const term = search.trim();
      where.OR = [
        { applicationNumber: { contains: term, mode: 'insensitive' } },
        { student: { fullName: { contains: term, mode: 'insensitive' } } },
        { student: { user: { email: { contains: term, mode: 'insensitive' } } } },
      ];
    }

    const skip = (page - 1) * limit;

    const [total, applications] = await Promise.all([
      prisma.application.count({ where }),
      prisma.application.findMany({
        where,
        skip,
        take: limit,
        orderBy: { submittedAt: 'desc' },
        include: {
          student: {
            include: {
              user: { select: { email: true } },
              college: { select: { id: true, name: true, code: true } },
            },
          },
          scholarship: {
            include: {
              department: { select: { id: true, code: true, name: true } },
            },
          },
          paymentRecord: {
            select: {
              id: true,
              status: true,
              simulationReference: true,
              disbursedAt: true,
              failureReason: true,
            },
          },
        },
      }),
    ]);

    return { total, applications, page, limit, totalPages: Math.ceil(total / limit) || 1 };
  }

  async findApplicationDetails(applicationId) {
    return prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        student: {
          include: {
            user: { select: { id: true, email: true, createdAt: true } },
            college: true,
          },
        },
        scholarship: {
          include: {
            department: true,
          },
        },
        snapshots: {
          orderBy: { cycleNumber: 'desc' },
        },
        documentSnapshots: {
          orderBy: { cycleNumber: 'desc' },
          include: {
            documentVersion: true,
          },
        },
        reviews: {
          orderBy: { cycleNumber: 'desc' },
          include: {
            reviewerUser: { select: { id: true, email: true, role: true } },
          },
        },
        correctionRequests: {
          orderBy: { cycleNumber: 'desc' },
          include: {
            resolvedDocumentVersion: true,
          },
        },
        auditLogs: {
          orderBy: { timestamp: 'desc' },
          include: {
            actorUser: { select: { id: true, email: true, role: true } },
          },
        },
        paymentRecord: {
          include: {
            batch: true,
          },
        },
      },
    });
  }

  // ===========================================================================
  // 8. GRIEVANCE MANAGEMENT
  // ===========================================================================
  async findGrievances({ status, category, assignedRole, search, page = 1, limit = 20 }) {
    const where = {};
    if (status && status !== 'ALL') where.status = status;
    if (category && category !== 'ALL') where.category = category;
    if (assignedRole && assignedRole !== 'ALL') where.assignedRole = assignedRole;

    if (search && search.trim()) {
      const term = search.trim();
      where.OR = [
        { ticketNumber: { contains: term, mode: 'insensitive' } },
        { subject: { contains: term, mode: 'insensitive' } },
        { student: { fullName: { contains: term, mode: 'insensitive' } } },
        { student: { user: { email: { contains: term, mode: 'insensitive' } } } },
      ];
    }

    const skip = (page - 1) * limit;

    const [total, grievances] = await Promise.all([
      prisma.grievance.count({ where }),
      prisma.grievance.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          student: {
            include: {
              user: { select: { email: true } },
              college: { select: { name: true, code: true } },
            },
          },
          application: {
            select: { id: true, applicationNumber: true, status: true },
          },
          resolvedByUser: {
            select: { id: true, email: true, role: true },
          },
        },
      }),
    ]);

    return { total, grievances, page, limit, totalPages: Math.ceil(total / limit) || 1 };
  }

  async findGrievanceById(id) {
    return prisma.grievance.findUnique({
      where: { id },
      include: {
        student: {
          include: {
            user: { select: { id: true, email: true } },
            college: true,
          },
        },
        application: {
          include: {
            scholarship: { select: { name: true, code: true, department: true } },
          },
        },
        resolvedByUser: {
          select: { id: true, email: true, role: true },
        },
      },
    });
  }

  async updateGrievanceStatus(id, { status, resolutionNotes, resolvedByUserId, resolvedAt }) {
    return prisma.grievance.update({
      where: { id },
      data: {
        status,
        resolutionNotes,
        resolvedByUserId,
        resolvedAt,
      },
      include: {
        student: { include: { user: true } },
      },
    });
  }

  async reassignGrievance(id, { assignedRole }) {
    return prisma.grievance.update({
      where: { id },
      data: { assignedRole },
      include: {
        student: { include: { user: true } },
      },
    });
  }

  // ===========================================================================
  // 9. NOTIFICATION MONITORING
  // ===========================================================================
  async findNotifications({ category, isRead, search, page = 1, limit = 20 }) {
    const where = {};
    if (category && category !== 'ALL') where.category = category;
    if (isRead !== undefined && isRead !== 'ALL') {
      where.isRead = isRead === 'true' || isRead === true;
    }
    if (search && search.trim()) {
      const term = search.trim();
      where.OR = [
        { title: { contains: term, mode: 'insensitive' } },
        { message: { contains: term, mode: 'insensitive' } },
        { user: { email: { contains: term, mode: 'insensitive' } } },
      ];
    }

    const skip = (page - 1) * limit;

    const [total, notifications] = await Promise.all([
      prisma.notification.count({ where }),
      prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, email: true, role: true },
          },
        },
      }),
    ]);

    return { total, notifications, page, limit, totalPages: Math.ceil(total / limit) || 1 };
  }

  // ===========================================================================
  // 10. SYSTEM ACTIVITY / AUDIT LOGS
  // ===========================================================================
  async findAuditLogs({ action, actorRole, search, page = 1, limit = 20 }) {
    const where = {};
    if (action && action !== 'ALL') where.action = action;
    if (actorRole && actorRole !== 'ALL') where.actorRole = actorRole;

    if (search && search.trim()) {
      const term = search.trim();
      where.OR = [
        { application: { applicationNumber: { contains: term, mode: 'insensitive' } } },
        { remarks: { contains: term, mode: 'insensitive' } },
        { actorUser: { email: { contains: term, mode: 'insensitive' } } },
      ];
    }

    const skip = (page - 1) * limit;

    const [total, logs] = await Promise.all([
      prisma.applicationAuditLog.count({ where }),
      prisma.applicationAuditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { timestamp: 'desc' },
        include: {
          application: {
            select: {
              id: true,
              applicationNumber: true,
              academicYear: true,
              student: { select: { fullName: true } },
              scholarship: { select: { name: true, code: true } },
            },
          },
          actorUser: {
            select: { id: true, email: true, role: true },
          },
        },
      }),
    ]);

    return { total, logs, page, limit, totalPages: Math.ceil(total / limit) || 1 };
  }
}

module.exports = new AdminRepository();
