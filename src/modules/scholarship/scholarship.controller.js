const scholarshipService = require('./scholarship.service');

class ScholarshipController {
  /**
   * List scholarships for discovery
   * GET /api/scholarships
   */
  async listScholarships(req, res, next) {
    try {
      const { departmentId, academicYear, search } = req.query;
      const studentUserId = req.user?.role === 'STUDENT' ? req.user.id : null;

      const result = await scholarshipService.getScholarships(
        { departmentId, academicYear, search },
        studentUserId
      );

      return res.status(200).json({
        success: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * List all departments for filtering
   * GET /api/scholarships/departments
   */
  async listDepartments(req, res, next) {
    try {
      const departments = await scholarshipService.getDepartments();
      return res.status(200).json({
        success: true,
        departments,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Batch evaluate all active scholarships for authenticated student
   * GET /api/scholarships/evaluate-all
   */
  async evaluateAll(req, res, next) {
    try {
      const result = await scholarshipService.evaluateAllScholarships(req.user.id);
      return res.status(200).json({
        success: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get single scholarship details
   * GET /api/scholarships/:id
   */
  async getScholarship(req, res, next) {
    try {
      const studentUserId = req.user?.role === 'STUDENT' ? req.user.id : null;
      const result = await scholarshipService.getScholarshipById(req.params.id, studentUserId);

      return res.status(200).json({
        success: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Evaluate eligibility for a specific scholarship
   * GET /api/scholarships/:id/evaluate
   */
  async evaluateEligibility(req, res, next) {
    try {
      const result = await scholarshipService.evaluateStudentEligibility(req.params.id, req.user.id);
      return res.status(200).json({
        success: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ScholarshipController();
