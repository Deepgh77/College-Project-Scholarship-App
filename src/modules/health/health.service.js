const { checkDatabaseConnection } = require('../../config/prisma');
const config = require('../../config/env');

/**
 * Health Service
 * Provides health check metrics and database connectivity verification.
 */
class HealthService {
  async getHealthStatus() {
    const dbStatus = await checkDatabaseConnection();

    return {
      status: dbStatus.connected ? 'healthy' : 'degraded',
      service: 'scholarship-management-system-backend',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      environment: config.nodeEnv,
      database: {
        status: dbStatus.connected ? 'connected' : 'disconnected',
        ...(dbStatus.latencyMs !== undefined ? { latencyMs: dbStatus.latencyMs } : {}),
      },
    };
  }
}

module.exports = new HealthService();
