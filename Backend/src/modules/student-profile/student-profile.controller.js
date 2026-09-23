const studentProfileService = require('./student-profile.service');
const { studentProfileSchema } = require('./student-profile.validation');

class StudentProfileController {
  /**
   * Get authenticated student's profile
   * GET /api/student/profile
   */
  async getProfile(req, res, next) {
    try {
      const result = await studentProfileService.getProfile(req.user.id);
      return res.status(200).json({
        success: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create or update authenticated student's profile
   * PUT /api/student/profile
   */
  async saveProfile(req, res, next) {
    try {
      const parseResult = studentProfileSchema.safeParse(req.body);
      if (!parseResult.success) {
        const issues = parseResult.error.issues || parseResult.error.errors || [];
        const errorMessages = issues.map((err) => err.message).join('; ');
        return res.status(400).json({
          success: false,
          message: errorMessages,
        });
      }

      const result = await studentProfileService.saveProfile(req.user.id, parseResult.data);
      return res.status(200).json({
        success: true,
        message: 'Profile saved successfully.',
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * List available colleges for profile selection
   * GET /api/student/colleges
   */
  async getColleges(req, res, next) {
    try {
      const colleges = await studentProfileService.getColleges();
      return res.status(200).json({
        success: true,
        colleges,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get consolidated student dashboard overview
   * GET /api/student/dashboard
   */
  async getDashboard(req, res, next) {
    try {
      const data = await studentProfileService.getDashboardData(req.user.id);
      return res.status(200).json({
        success: true,
        ...data,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new StudentProfileController();
