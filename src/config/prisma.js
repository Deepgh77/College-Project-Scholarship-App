const { PrismaClient } = require('@prisma/client');

// PrismaClient singleton instance
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});

/**
 * Verifies that the database is reachable and accepting queries.
 * Does not expose sensitive database credentials in responses.
 */
async function checkDatabaseConnection() {
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1 as connected`;
    const latencyMs = Date.now() - start;
    return {
      connected: true,
      latencyMs,
    };
  } catch (error) {
    return {
      connected: false,
      error: 'Database connection failed',
    };
  }
}

module.exports = {
  prisma,
  checkDatabaseConnection,
};
