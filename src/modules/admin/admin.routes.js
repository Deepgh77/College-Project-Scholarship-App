const { Router } = require('express');
const adminController = require('./admin.controller');
const { requireAuth, requireRole } = require('../auth/auth.middleware');

const router = Router();

// Strict RBAC: Guard all admin endpoints to ADMIN role
router.use(requireAuth);
router.use(requireRole('ADMIN'));

// 1. Dashboard Stats
router.get('/dashboard/stats', (req, res, next) =>
  adminController.getDashboardStats(req, res, next)
);

// 2. User Management
router.get('/users', (req, res, next) =>
  adminController.getUsers(req, res, next)
);
router.get('/users/:id', (req, res, next) =>
  adminController.getUserById(req, res, next)
);
router.patch('/users/:id/status', (req, res, next) =>
  adminController.updateUserStatus(req, res, next)
);
router.post('/users/provision', (req, res, next) =>
  adminController.provisionStaffUser(req, res, next)
);

// 3. College Master Management
router.get('/colleges', (req, res, next) =>
  adminController.getColleges(req, res, next)
);
router.get('/colleges/:id', (req, res, next) =>
  adminController.getCollegeById(req, res, next)
);
router.post('/colleges', (req, res, next) =>
  adminController.createCollege(req, res, next)
);
router.put('/colleges/:id', (req, res, next) =>
  adminController.updateCollege(req, res, next)
);
router.patch('/colleges/:id/status', (req, res, next) =>
  adminController.updateCollegeStatus(req, res, next)
);

// 4. Department Master Management
router.get('/departments', (req, res, next) =>
  adminController.getDepartments(req, res, next)
);
router.get('/departments/:id', (req, res, next) =>
  adminController.getDepartmentById(req, res, next)
);
router.post('/departments', (req, res, next) =>
  adminController.createDepartment(req, res, next)
);
router.put('/departments/:id', (req, res, next) =>
  adminController.updateDepartment(req, res, next)
);
router.patch('/departments/:id/status', (req, res, next) =>
  adminController.updateDepartmentStatus(req, res, next)
);

// 5. Scholarship Scheme Management
router.get('/scholarships', (req, res, next) =>
  adminController.getScholarships(req, res, next)
);
router.get('/scholarships/:id', (req, res, next) =>
  adminController.getScholarshipById(req, res, next)
);
router.post('/scholarships', (req, res, next) =>
  adminController.createScholarship(req, res, next)
);
router.put('/scholarships/:id', (req, res, next) =>
  adminController.updateScholarship(req, res, next)
);
router.patch('/scholarships/:id/status', (req, res, next) =>
  adminController.updateScholarshipStatus(req, res, next)
);

// 6. Rules & Required Documents
router.post('/scholarships/:id/rules', (req, res, next) =>
  adminController.createScholarshipRule(req, res, next)
);
router.delete('/scholarships/:id/rules/:ruleId', (req, res, next) =>
  adminController.deleteScholarshipRule(req, res, next)
);
router.post('/scholarships/:id/documents', (req, res, next) =>
  adminController.createScholarshipRequiredDoc(req, res, next)
);
router.put('/scholarships/:id/documents/:docId', (req, res, next) =>
  adminController.updateScholarshipRequiredDoc(req, res, next)
);
router.delete('/scholarships/:id/documents/:docId', (req, res, next) =>
  adminController.deleteScholarshipRequiredDoc(req, res, next)
);

// 7. Applications Monitoring (Read-Only)
router.get('/applications', (req, res, next) =>
  adminController.getApplications(req, res, next)
);
router.get('/applications/:id', (req, res, next) =>
  adminController.getApplicationDetails(req, res, next)
);

// 8. Grievance Management
router.get('/grievances', (req, res, next) =>
  adminController.getGrievances(req, res, next)
);
router.get('/grievances/:id', (req, res, next) =>
  adminController.getGrievanceById(req, res, next)
);
router.patch('/grievances/:id/status', (req, res, next) =>
  adminController.updateGrievanceStatus(req, res, next)
);
router.patch('/grievances/:id/assign', (req, res, next) =>
  adminController.reassignGrievance(req, res, next)
);

// 9. Notification Monitoring
router.get('/notifications', (req, res, next) =>
  adminController.getNotifications(req, res, next)
);

// 10. System Activity / Audit Logs
router.get('/audit-logs', (req, res, next) =>
  adminController.getAuditLogs(req, res, next)
);

module.exports = router;
