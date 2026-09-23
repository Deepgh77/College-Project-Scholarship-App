const { prisma } = require('../../config/prisma');

/**
 * Authentication Repository
 * Interacts with the User table using Prisma.
 */
class AuthRepository {
  /**
   * Look up user by normalized email (returns passwordHash for verification)
   */
  async findByEmail(email) {
    return prisma.user.findUnique({
      where: { email },
    });
  }

  /**
   * Look up user by ID (safe fields only, excludes passwordHash)
   */
  async findById(id) {
    return prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        role: true,
        collegeId: true,
        departmentId: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  /**
   * Create a new user record
   */
  async createUser({ email, passwordHash, role }) {
    return prisma.user.create({
      data: {
        email,
        passwordHash,
        role,
      },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });
  }
}

module.exports = new AuthRepository();
