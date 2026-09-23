const { prisma } = require('../../config/prisma');

class StudentProfileRepository {
  /**
   * Find profile by user ID with college information
   */
  async findByUserId(userId) {
    return prisma.studentProfile.findUnique({
      where: { userId },
      include: {
        college: {
          select: {
            id: true,
            code: true,
            name: true,
            university: true,
            district: true,
            taluka: true,
          },
        },
      },
    });
  }

  /**
   * Upsert student profile
   */
  async upsertProfile(userId, profileData) {
    return prisma.studentProfile.upsert({
      where: { userId },
      create: {
        userId,
        ...profileData,
      },
      update: {
        ...profileData,
      },
      include: {
        college: {
          select: {
            id: true,
            code: true,
            name: true,
            university: true,
            district: true,
            taluka: true,
          },
        },
      },
    });
  }

  /**
   * List all active colleges directly from the database.
   * Note: The Student Profile module NEVER seeds or creates College records.
   */
  async findAllColleges() {
    return prisma.college.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }
}

module.exports = new StudentProfileRepository();
