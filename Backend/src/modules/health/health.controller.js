const healthService = require('./health.service');

/**
 * Health Controller
 */
class HealthController {
  async getHealth(req, res, next) {
    try {
      const health = await healthService.getHealthStatus();
      const httpStatus = health.status === 'healthy' ? 200 : 503;
      return res.status(httpStatus).json(health);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new HealthController();
