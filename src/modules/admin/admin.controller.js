const adminService = require('./admin.service');

class AdminController {
  // 1. Dashboard
  async getDashboardStats(req, res, next) {
    try {
      const stats = await adminService.getDashboardStats();
      res.status(200).json({ success: true, ...stats });
    } catch (err) {
      next(err);
    }
  }

  // 2. Users
  async getUsers(req, res, next) {
    try {
      const data = await adminService.getUsers(req.query);
      res.status(200).json({ success: true, ...data });
    } catch (err) {
      next(err);
    }
  }

  async getUserById(req, res, next) {
    try {
      const user = await adminService.getUserById(req.params.id);
      res.status(200).json({ success: true, user });
    } catch (err) {
      next(err);
    }
  }

  async updateUserStatus(req, res, next) {
    try {
      const user = await adminService.updateUserStatus(req.user, req.params.id, req.body);
      res.status(200).json({
        success: true,
        message: `User status updated to ${user.isActive ? 'Active' : 'Inactive'}.`,
        user,
      });
    } catch (err) {
      next(err);
    }
  }

  async provisionStaffUser(req, res, next) {
    try {
      const user = await adminService.provisionStaffUser(req.user, req.body);
      res.status(201).json({
        success: true,
        message: `Staff account (${user.role}) provisioned successfully for ${user.email}.`,
        user,
      });
    } catch (err) {
      next(err);
    }
  }

  // 3. Colleges
  async getColleges(req, res, next) {
    try {
      const data = await adminService.getColleges(req.query);
      res.status(200).json({ success: true, ...data });
    } catch (err) {
      next(err);
    }
  }

  async getCollegeById(req, res, next) {
    try {
      const college = await adminService.getCollegeById(req.params.id);
      res.status(200).json({ success: true, college });
    } catch (err) {
      next(err);
    }
  }

  async createCollege(req, res, next) {
    try {
      const college = await adminService.createCollege(req.body);
      res.status(201).json({
        success: true,
        message: `College "${college.name}" created successfully.`,
        college,
      });
    } catch (err) {
      next(err);
    }
  }

  async updateCollege(req, res, next) {
    try {
      const college = await adminService.updateCollege(req.params.id, req.body);
      res.status(200).json({
        success: true,
        message: `College "${college.name}" updated successfully.`,
        college,
      });
    } catch (err) {
      next(err);
    }
  }

  async updateCollegeStatus(req, res, next) {
    try {
      const college = await adminService.updateCollegeStatus(req.params.id, req.body);
      res.status(200).json({
        success: true,
        message: `College status updated to ${college.isActive ? 'Active' : 'Inactive'}.`,
        college,
      });
    } catch (err) {
      next(err);
    }
  }

  // 4. Departments
  async getDepartments(req, res, next) {
    try {
      const departments = await adminService.getDepartments(req.query);
      res.status(200).json({ success: true, departments });
    } catch (err) {
      next(err);
    }
  }

  async getDepartmentById(req, res, next) {
    try {
      const department = await adminService.getDepartmentById(req.params.id);
      res.status(200).json({ success: true, department });
    } catch (err) {
      next(err);
    }
  }

  async createDepartment(req, res, next) {
    try {
      const department = await adminService.createDepartment(req.body);
      res.status(201).json({
        success: true,
        message: `Department "${department.name}" created successfully.`,
        department,
      });
    } catch (err) {
      next(err);
    }
  }

  async updateDepartment(req, res, next) {
    try {
      const department = await adminService.updateDepartment(req.params.id, req.body);
      res.status(200).json({
        success: true,
        message: `Department "${department.name}" updated successfully.`,
        department,
      });
    } catch (err) {
      next(err);
    }
  }

  async updateDepartmentStatus(req, res, next) {
    try {
      const department = await adminService.updateDepartmentStatus(req.params.id, req.body);
      res.status(200).json({
        success: true,
        message: `Department status updated to ${department.isActive ? 'Active' : 'Inactive'}.`,
        department,
      });
    } catch (err) {
      next(err);
    }
  }

  // 5. Scholarships
  async getScholarships(req, res, next) {
    try {
      const data = await adminService.getScholarships(req.query);
      res.status(200).json({ success: true, ...data });
    } catch (err) {
      next(err);
    }
  }

  async getScholarshipById(req, res, next) {
    try {
      const scholarship = await adminService.getScholarshipById(req.params.id);
      res.status(200).json({ success: true, scholarship });
    } catch (err) {
      next(err);
    }
  }

  async createScholarship(req, res, next) {
    try {
      const scholarship = await adminService.createScholarship(req.body);
      res.status(201).json({
        success: true,
        message: `Scholarship scheme "${scholarship.name}" created successfully.`,
        scholarship,
      });
    } catch (err) {
      next(err);
    }
  }

  async updateScholarship(req, res, next) {
    try {
      const scholarship = await adminService.updateScholarship(req.params.id, req.body);
      res.status(200).json({
        success: true,
        message: `Scholarship scheme "${scholarship.name}" updated successfully.`,
        scholarship,
      });
    } catch (err) {
      next(err);
    }
  }

  async updateScholarshipStatus(req, res, next) {
    try {
      const scholarship = await adminService.updateScholarshipStatus(req.params.id, req.body);
      res.status(200).json({
        success: true,
        message: `Scholarship status updated to ${scholarship.isActive ? 'Active' : 'Inactive'}.`,
        scholarship,
      });
    } catch (err) {
      next(err);
    }
  }

  // 6. Rules & Required Documents
  async createScholarshipRule(req, res, next) {
    try {
      const rule = await adminService.createScholarshipRule(req.params.id, req.body);
      res.status(201).json({
        success: true,
        message: 'Eligibility rule added successfully.',
        rule,
      });
    } catch (err) {
      next(err);
    }
  }

  async deleteScholarshipRule(req, res, next) {
    try {
      await adminService.deleteScholarshipRule(req.params.ruleId);
      res.status(200).json({
        success: true,
        message: 'Eligibility rule removed successfully.',
      });
    } catch (err) {
      next(err);
    }
  }

  async createScholarshipRequiredDoc(req, res, next) {
    try {
      const doc = await adminService.createScholarshipRequiredDoc(req.params.id, req.body);
      res.status(201).json({
        success: true,
        message: 'Document requirement added successfully.',
        doc,
      });
    } catch (err) {
      next(err);
    }
  }

  async updateScholarshipRequiredDoc(req, res, next) {
    try {
      const doc = await adminService.updateScholarshipRequiredDoc(req.params.docId, req.body);
      res.status(200).json({
        success: true,
        message: 'Document requirement updated successfully.',
        doc,
      });
    } catch (err) {
      next(err);
    }
  }

  async deleteScholarshipRequiredDoc(req, res, next) {
    try {
      await adminService.deleteScholarshipRequiredDoc(req.params.docId);
      res.status(200).json({
        success: true,
        message: 'Document requirement removed successfully.',
      });
    } catch (err) {
      next(err);
    }
  }

  // 7. Applications Monitoring (Read-Only)
  async getApplications(req, res, next) {
    try {
      const data = await adminService.getApplications(req.query);
      res.status(200).json({ success: true, ...data });
    } catch (err) {
      next(err);
    }
  }

  async getApplicationDetails(req, res, next) {
    try {
      const application = await adminService.getApplicationDetails(req.params.id);
      res.status(200).json({ success: true, application });
    } catch (err) {
      next(err);
    }
  }

  // 8. Grievances
  async getGrievances(req, res, next) {
    try {
      const data = await adminService.getGrievances(req.query);
      res.status(200).json({ success: true, ...data });
    } catch (err) {
      next(err);
    }
  }

  async getGrievanceById(req, res, next) {
    try {
      const grievance = await adminService.getGrievanceById(req.params.id);
      res.status(200).json({ success: true, grievance });
    } catch (err) {
      next(err);
    }
  }

  async updateGrievanceStatus(req, res, next) {
    try {
      const grievance = await adminService.updateGrievanceStatus(req.user, req.params.id, req.body);
      res.status(200).json({
        success: true,
        message: `Grievance status updated to ${grievance.status}.`,
        grievance,
      });
    } catch (err) {
      next(err);
    }
  }

  async reassignGrievance(req, res, next) {
    try {
      const grievance = await adminService.reassignGrievance(req.params.id, req.body);
      res.status(200).json({
        success: true,
        message: `Grievance reassigned to ${grievance.assignedRole}.`,
        grievance,
      });
    } catch (err) {
      next(err);
    }
  }

  // 9. Notifications
  async getNotifications(req, res, next) {
    try {
      const data = await adminService.getNotifications(req.query);
      res.status(200).json({ success: true, ...data });
    } catch (err) {
      next(err);
    }
  }

  // 10. System Activity / Audit Logs
  async getAuditLogs(req, res, next) {
    try {
      const data = await adminService.getAuditLogs(req.query);
      res.status(200).json({ success: true, ...data });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AdminController();
