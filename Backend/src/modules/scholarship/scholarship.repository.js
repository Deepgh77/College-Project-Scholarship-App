const { prisma } = require('../../config/prisma');

class ScholarshipRepository {
  /**
   * Find active scholarships with optional search and department filters
   */
  async findAll({ departmentId, academicYear, search, includeInactive = false } = {}) {
    const where = {};

    if (!includeInactive) {
      where.isActive = true;
    }

    if (departmentId) {
      where.departmentId = departmentId;
    }

    if (academicYear) {
      where.academicYear = academicYear;
    }

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { code: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ];
    }

    return prisma.scholarship.findMany({
      where,
      include: {
        department: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        rules: {
          select: {
            id: true,
            ruleGroup: true,
            fieldPath: true,
            operator: true,
            targetValue: true,
            failureReasonText: true,
          },
        },
        requiredDocuments: {
          select: {
            id: true,
            documentType: true,
            isMandatory: true,
            helpTitle: true,
            helpTextSimple: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  /**
   * Find scholarship by ID with department, rules, and required documents
   */
  async findById(id) {
    return prisma.scholarship.findUnique({
      where: { id },
      include: {
        department: {
          select: {
            id: true,
            code: true,
            name: true,
            description: true,
          },
        },
        rules: {
          select: {
            id: true,
            ruleGroup: true,
            fieldPath: true,
            operator: true,
            targetValue: true,
            failureReasonText: true,
          },
          orderBy: {
            ruleGroup: 'asc',
          },
        },
        requiredDocuments: {
          select: {
            id: true,
            documentType: true,
            isMandatory: true,
            helpTitle: true,
            helpTextSimple: true,
          },
          orderBy: {
            isMandatory: 'desc',
          },
        },
      },
    });
  }

  /**
   * Find all active departments for catalog filter selection
   */
  async findAllDepartments() {
    return prisma.department.findMany({
      where: { isActive: true },
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  /**
   * Find student profile by user ID for eligibility checking
   */
  async findStudentProfileByUserId(userId) {
    return prisma.studentProfile.findUnique({
      where: { userId },
    });
  }
}

module.exports = new ScholarshipRepository();
