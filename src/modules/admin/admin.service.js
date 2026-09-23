const bcrypt = require('bcryptjs');
const adminRepository = require('./admin.repository');
const { prisma } = require('../../config/prisma');
const {
  ALLOWED_FIELD_PATHS,
  validateRuleTarget,
} = require('../scholarship/eligibility.engine');

const PERMITTED_STAFF_ROLES = ['COLLEGE', 'AUTHORITY', 'ADMIN'];
const VALID_DOCUMENT_TYPES = [
  'INCOME_CERT',
  'CASTE_CERT',
  'DOMICILE_CERT',
  'MARKSHEET_PREV',
  'FEE_RECEIPT',
  'RATION_CARD',
  'DISABILITY_CERT',
  'OTHER',
];
const VALID_GRIEVANCE_ROLES = ['COLLEGE', 'AUTHORITY', 'ADMIN'];
const VALID_GRIEVANCE_STATUSES = ['OPEN', 'UNDER_REVIEW', 'RESOLVED', 'CLOSED'];

class AdminService {
  // ===========================================================================
  // 1. DASHBOARD STATS
  // ===========================================================================
  async getDashboardStats() {
    return adminRepository.getDashboardStats();
  }

  // ===========================================================================
  // 2. USER MANAGEMENT
  // ===========================================================================
  async getUsers(query) {
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));

    return adminRepository.findUsers({
      role: query.role,
      isActive: query.isActive,
      search: query.search,
      page,
      limit,
    });
  }

  async getUserById(userId) {
    const user = await adminRepository.findUserById(userId);
    if (!user) {
      const err = new Error('User not found.');
      err.statusCode = 404;
      throw err;
    }
    return user;
  }

  async updateUserStatus(currentAdmin, userId, { isActive }) {
    if (typeof isActive !== 'boolean') {
      const err = new Error('Field isActive must be a boolean.');
      err.statusCode = 400;
      throw err;
    }

    // Protection 1: Admin cannot deactivate their own active account
    if (currentAdmin.id === userId && isActive === false) {
      const err = new Error('You cannot deactivate your own administrative account.');
      err.statusCode = 400;
      throw err;
    }

    // Protection 2: Target user lookup
    const targetUser = await adminRepository.findUserById(userId);
    if (!targetUser) {
      const err = new Error('User not found.');
      err.statusCode = 404;
      throw err;
    }

    // Protection 3: Last active admin protection
    if (targetUser.role === 'ADMIN' && isActive === false) {
      const activeAdminCount = await adminRepository.countActiveAdmins();
      if (activeAdminCount <= 1) {
        const err = new Error('Cannot deactivate the only remaining active Administrator account.');
        err.statusCode = 400;
        throw err;
      }
    }

    return adminRepository.updateUserStatus(userId, isActive);
  }

  async provisionStaffUser(currentAdmin, { email, password, role, collegeId, departmentId }) {
    if (!email || !email.includes('@')) {
      const err = new Error('A valid email address is required.');
      err.statusCode = 400;
      throw err;
    }

    const normalizedEmail = email.toLowerCase().trim();

    if (!password || password.length < 8) {
      const err = new Error('Password must be at least 8 characters long.');
      err.statusCode = 400;
      throw err;
    }

    if (!PERMITTED_STAFF_ROLES.includes(role)) {
      const err = new Error(`Role must be one of: ${PERMITTED_STAFF_ROLES.join(', ')}.`);
      err.statusCode = 400;
      throw err;
    }

    // Validate role-specific linkages
    if (role === 'COLLEGE') {
      if (!collegeId) {
        const err = new Error('College Officer account requires a valid collegeId.');
        err.statusCode = 400;
        throw err;
      }
      const college = await prisma.college.findUnique({ where: { id: collegeId } });
      if (!college) {
        const err = new Error('Target college not found.');
        err.statusCode = 404;
        throw err;
      }
    }

    if (role === 'AUTHORITY' && departmentId) {
      const dept = await prisma.department.findUnique({ where: { id: departmentId } });
      if (!dept) {
        const err = new Error('Target department not found.');
        err.statusCode = 404;
        throw err;
      }
    }

    // Check email uniqueness
    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      const err = new Error('A user with this email address already exists.');
      err.statusCode = 409;
      throw err;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    return adminRepository.createStaffUser({
      email: normalizedEmail,
      passwordHash,
      role,
      collegeId: role === 'COLLEGE' ? collegeId : null,
      departmentId: role === 'AUTHORITY' ? departmentId : null,
    });
  }

  // ===========================================================================
  // 3. COLLEGE MASTER MANAGEMENT
  // ===========================================================================
  async getColleges(query) {
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));

    return adminRepository.findColleges({
      search: query.search,
      isActive: query.isActive,
      page,
      limit,
    });
  }

  async getCollegeById(id) {
    const college = await adminRepository.findCollegeById(id);
    if (!college) {
      const err = new Error('College not found.');
      err.statusCode = 404;
      throw err;
    }
    return college;
  }

  async createCollege({ code, name, university, district, taluka, isActive }) {
    if (!code || !name || !university || !district || !taluka) {
      const err = new Error('All college fields (code, name, university, district, taluka) are required.');
      err.statusCode = 400;
      throw err;
    }

    const upperCode = code.toUpperCase().trim();
    const existing = await prisma.college.findUnique({ where: { code: upperCode } });
    if (existing) {
      const err = new Error(`A college with code "${upperCode}" already exists.`);
      err.statusCode = 409;
      throw err;
    }

    return adminRepository.createCollege({
      code: upperCode,
      name,
      university,
      district,
      taluka,
      isActive,
    });
  }

  async updateCollege(id, data) {
    const college = await adminRepository.findCollegeById(id);
    if (!college) {
      const err = new Error('College not found.');
      err.statusCode = 404;
      throw err;
    }

    return adminRepository.updateCollege(id, data);
  }

  async updateCollegeStatus(id, { isActive }) {
    if (typeof isActive !== 'boolean') {
      const err = new Error('Field isActive must be a boolean.');
      err.statusCode = 400;
      throw err;
    }

    const college = await adminRepository.findCollegeById(id);
    if (!college) {
      const err = new Error('College not found.');
      err.statusCode = 404;
      throw err;
    }

    return adminRepository.updateCollegeStatus(id, isActive);
  }

  // ===========================================================================
  // 4. DEPARTMENT MASTER MANAGEMENT
  // ===========================================================================
  async getDepartments(query) {
    return adminRepository.findDepartments({
      search: query.search,
      isActive: query.isActive,
    });
  }

  async getDepartmentById(id) {
    const dept = await adminRepository.findDepartmentById(id);
    if (!dept) {
      const err = new Error('Department not found.');
      err.statusCode = 404;
      throw err;
    }
    return dept;
  }

  async createDepartment({ code, name, description, isActive }) {
    if (!code || !name) {
      const err = new Error('Department code and name are required.');
      err.statusCode = 400;
      throw err;
    }

    const upperCode = code.toUpperCase().trim();
    const existingCode = await prisma.department.findUnique({ where: { code: upperCode } });
    if (existingCode) {
      const err = new Error(`A department with code "${upperCode}" already exists.`);
      err.statusCode = 409;
      throw err;
    }

    const existingName = await prisma.department.findUnique({ where: { name: name.trim() } });
    if (existingName) {
      const err = new Error(`A department with name "${name.trim()}" already exists.`);
      err.statusCode = 409;
      throw err;
    }

    return adminRepository.createDepartment({
      code: upperCode,
      name,
      description,
      isActive,
    });
  }

  async updateDepartment(id, data) {
    const dept = await adminRepository.findDepartmentById(id);
    if (!dept) {
      const err = new Error('Department not found.');
      err.statusCode = 404;
      throw err;
    }

    return adminRepository.updateDepartment(id, data);
  }

  async updateDepartmentStatus(id, { isActive }) {
    if (typeof isActive !== 'boolean') {
      const err = new Error('Field isActive must be a boolean.');
      err.statusCode = 400;
      throw err;
    }

    const dept = await adminRepository.findDepartmentById(id);
    if (!dept) {
      const err = new Error('Department not found.');
      err.statusCode = 404;
      throw err;
    }

    return adminRepository.updateDepartmentStatus(id, isActive);
  }

  // ===========================================================================
  // 5. SCHOLARSHIP SCHEME MANAGEMENT
  // ===========================================================================
  async getScholarships(query) {
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));

    return adminRepository.findScholarships({
      departmentId: query.departmentId,
      academicYear: query.academicYear,
      isActive: query.isActive,
      search: query.search,
      page,
      limit,
    });
  }

  async getScholarshipById(id) {
    const sch = await adminRepository.findScholarshipById(id);
    if (!sch) {
      const err = new Error('Scholarship not found.');
      err.statusCode = 404;
      throw err;
    }
    return sch;
  }

  async createScholarship(data) {
    if (
      !data.departmentId ||
      !data.code ||
      !data.academicYear ||
      !data.name ||
      !data.benefitAmount ||
      !data.applicationStartDate ||
      !data.applicationEndDate
    ) {
      const err = new Error(
        'Required fields: departmentId, code, academicYear, name, benefitAmount, applicationStartDate, applicationEndDate.'
      );
      err.statusCode = 400;
      throw err;
    }

    const dept = await adminRepository.findDepartmentById(data.departmentId);
    if (!dept) {
      const err = new Error('Target department not found.');
      err.statusCode = 404;
      throw err;
    }

    const amount = Number(data.benefitAmount);
    if (isNaN(amount) || amount <= 0) {
      const err = new Error('Benefit amount must be a positive number.');
      err.statusCode = 400;
      throw err;
    }

    const startDate = new Date(data.applicationStartDate);
    const endDate = new Date(data.applicationEndDate);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      const err = new Error('Invalid start or end date.');
      err.statusCode = 400;
      throw err;
    }

    if (startDate > endDate) {
      const err = new Error('Application start date cannot be after end date.');
      err.statusCode = 400;
      throw err;
    }

    const code = data.code.toUpperCase().trim();
    const academicYear = data.academicYear.trim();

    const existing = await prisma.scholarship.findUnique({
      where: {
        code_academicYear: {
          code,
          academicYear,
        },
      },
    });

    if (existing) {
      const err = new Error(
        `Scholarship with code "${code}" already exists for academic year "${academicYear}".`
      );
      err.statusCode = 409;
      throw err;
    }

    return adminRepository.createScholarship(data);
  }

  async updateScholarship(id, data) {
    const sch = await adminRepository.findScholarshipById(id);
    if (!sch) {
      const err = new Error('Scholarship not found.');
      err.statusCode = 404;
      throw err;
    }

    if (data.benefitAmount !== undefined) {
      const amount = Number(data.benefitAmount);
      if (isNaN(amount) || amount <= 0) {
        const err = new Error('Benefit amount must be a positive number.');
        err.statusCode = 400;
        throw err;
      }
    }

    return adminRepository.updateScholarship(id, data);
  }

  async updateScholarshipStatus(id, { isActive }) {
    if (typeof isActive !== 'boolean') {
      const err = new Error('Field isActive must be a boolean.');
      err.statusCode = 400;
      throw err;
    }

    const sch = await adminRepository.findScholarshipById(id);
    if (!sch) {
      const err = new Error('Scholarship not found.');
      err.statusCode = 404;
      throw err;
    }

    return adminRepository.updateScholarshipStatus(id, isActive);
  }

  // ===========================================================================
  // 6. ELIGIBILITY RULES & REQUIRED DOCUMENTS
  // ===========================================================================
  async createScholarshipRule(scholarshipId, { ruleGroup, fieldPath, operator, targetValue, failureReasonText }) {
    const sch = await adminRepository.findScholarshipById(scholarshipId);
    if (!sch) {
      const err = new Error('Scholarship not found.');
      err.statusCode = 404;
      throw err;
    }

    if (!ALLOWED_FIELD_PATHS.includes(fieldPath)) {
      const err = new Error(
        `Invalid fieldPath "${fieldPath}". Permitted fields: ${ALLOWED_FIELD_PATHS.join(', ')}.`
      );
      err.statusCode = 400;
      throw err;
    }

    if (!['LTE', 'GTE', 'EQ', 'NEQ', 'IN'].includes(operator)) {
      const err = new Error(`Invalid operator "${operator}". Permitted: LTE, GTE, EQ, NEQ, IN.`);
      err.statusCode = 400;
      throw err;
    }

    if (!validateRuleTarget(operator, targetValue)) {
      const err = new Error(
        `Target value "${JSON.stringify(targetValue)}" is incompatible with operator "${operator}".`
      );
      err.statusCode = 400;
      throw err;
    }

    if (!failureReasonText || failureReasonText.trim().length < 5) {
      const err = new Error('Failure reason text must be at least 5 characters.');
      err.statusCode = 400;
      throw err;
    }

    return adminRepository.createScholarshipRule({
      scholarshipId,
      ruleGroup: ruleGroup || 'DEFAULT',
      fieldPath,
      operator,
      targetValue,
      failureReasonText,
    });
  }

  async deleteScholarshipRule(ruleId) {
    const rule = await adminRepository.findScholarshipRuleById(ruleId);
    if (!rule) {
      const err = new Error('Scholarship rule not found.');
      err.statusCode = 404;
      throw err;
    }

    // Historical Integrity Protection (User Correction #2)
    const appsCount = await adminRepository.countScholarshipApplications(rule.scholarshipId);
    if (appsCount > 0) {
      const err = new Error(
        'Cannot delete eligibility rule from a scholarship with existing applications. Historical rule configuration must be preserved for application reproducibility.'
      );
      err.statusCode = 400;
      throw err;
    }

    return adminRepository.deleteScholarshipRule(ruleId);
  }

  async createScholarshipRequiredDoc(scholarshipId, { documentType, isMandatory, helpTitle, helpTextSimple }) {
    const sch = await adminRepository.findScholarshipById(scholarshipId);
    if (!sch) {
      const err = new Error('Scholarship not found.');
      err.statusCode = 404;
      throw err;
    }

    if (!VALID_DOCUMENT_TYPES.includes(documentType)) {
      const err = new Error(`Invalid documentType. Permitted: ${VALID_DOCUMENT_TYPES.join(', ')}.`);
      err.statusCode = 400;
      throw err;
    }

    if (!helpTitle || helpTitle.trim().length < 3) {
      const err = new Error('helpTitle must be at least 3 characters.');
      err.statusCode = 400;
      throw err;
    }

    if (!helpTextSimple || helpTextSimple.trim().length < 5) {
      const err = new Error('helpTextSimple must be at least 5 characters.');
      err.statusCode = 400;
      throw err;
    }

    return adminRepository.createScholarshipRequiredDoc({
      scholarshipId,
      documentType,
      isMandatory,
      helpTitle,
      helpTextSimple,
    });
  }

  async updateScholarshipRequiredDoc(docId, data) {
    const doc = await adminRepository.findScholarshipRequiredDocById(docId);
    if (!doc) {
      const err = new Error('Document requirement not found.');
      err.statusCode = 404;
      throw err;
    }

    return adminRepository.updateScholarshipRequiredDoc(docId, data);
  }

  async deleteScholarshipRequiredDoc(docId) {
    const doc = await adminRepository.findScholarshipRequiredDocById(docId);
    if (!doc) {
      const err = new Error('Document requirement not found.');
      err.statusCode = 404;
      throw err;
    }

    // Historical Integrity Protection (User Correction #2)
    const appsCount = await adminRepository.countScholarshipApplications(doc.scholarshipId);
    if (appsCount > 0) {
      const err = new Error(
        'Cannot delete document requirement from a scholarship with existing applications. Historical document requirements must be preserved for application reproducibility.'
      );
      err.statusCode = 400;
      throw err;
    }

    return adminRepository.deleteScholarshipRequiredDoc(docId);
  }

  // ===========================================================================
  // 7. APPLICATION MONITORING (STRICTLY READ-ONLY)
  // ===========================================================================
  async getApplications(query) {
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));

    return adminRepository.findApplications({
      departmentId: query.departmentId,
      scholarshipId: query.scholarshipId,
      collegeId: query.collegeId,
      academicYear: query.academicYear,
      status: query.status,
      search: query.search,
      page,
      limit,
    });
  }

  async getApplicationDetails(applicationId) {
    const app = await adminRepository.findApplicationDetails(applicationId);
    if (!app) {
      const err = new Error('Application not found.');
      err.statusCode = 404;
      throw err;
    }
    return app;
  }

  // ===========================================================================
  // 8. GRIEVANCE MANAGEMENT
  // ===========================================================================
  async getGrievances(query) {
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));

    return adminRepository.findGrievances({
      status: query.status,
      category: query.category,
      assignedRole: query.assignedRole,
      search: query.search,
      page,
      limit,
    });
  }

  async getGrievanceById(id) {
    const g = await adminRepository.findGrievanceById(id);
    if (!g) {
      const err = new Error('Grievance not found.');
      err.statusCode = 404;
      throw err;
    }
    return g;
  }

  async updateGrievanceStatus(currentAdmin, id, { status, resolutionNotes }) {
    const g = await adminRepository.findGrievanceById(id);
    if (!g) {
      const err = new Error('Grievance not found.');
      err.statusCode = 404;
      throw err;
    }

    if (!VALID_GRIEVANCE_STATUSES.includes(status)) {
      const err = new Error(`Invalid status. Permitted: ${VALID_GRIEVANCE_STATUSES.join(', ')}.`);
      err.statusCode = 400;
      throw err;
    }

    if (['RESOLVED', 'CLOSED'].includes(status) && (!resolutionNotes || resolutionNotes.trim().length < 10)) {
      const err = new Error('Resolution notes of at least 10 characters are required when resolving or closing a grievance.');
      err.statusCode = 400;
      throw err;
    }

    const resolvedAt = ['RESOLVED', 'CLOSED'].includes(status) ? new Date() : null;
    const resolvedByUserId = ['RESOLVED', 'CLOSED'].includes(status) ? currentAdmin.id : null;

    const updated = await adminRepository.updateGrievanceStatus(id, {
      status,
      resolutionNotes: resolutionNotes ? resolutionNotes.trim() : null,
      resolvedByUserId,
      resolvedAt,
    });

    // Notify student of resolution
    if (['RESOLVED', 'CLOSED'].includes(status) && updated.student?.user?.id) {
      await prisma.notification.create({
        data: {
          userId: updated.student.user.id,
          title: `Grievance Ticket ${g.ticketNumber} ${status === 'RESOLVED' ? 'Resolved' : 'Closed'}`,
          message: `Your grievance "${g.subject}" has been marked as ${status.toLowerCase()} by administration: ${resolutionNotes.trim()}`,
          category: 'GRIEVANCE',
          actionUrl: g.applicationId ? `/applications/${g.applicationId}/tracking` : undefined,
        },
      });
    }

    return updated;
  }

  async reassignGrievance(id, { assignedRole }) {
    const g = await adminRepository.findGrievanceById(id);
    if (!g) {
      const err = new Error('Grievance not found.');
      err.statusCode = 404;
      throw err;
    }

    if (!VALID_GRIEVANCE_ROLES.includes(assignedRole)) {
      const err = new Error(`Invalid assignedRole. Permitted: ${VALID_GRIEVANCE_ROLES.join(', ')}.`);
      err.statusCode = 400;
      throw err;
    }

    if (['RESOLVED', 'CLOSED'].includes(g.status)) {
      const err = new Error('Cannot reassign an already resolved or closed grievance ticket.');
      err.statusCode = 400;
      throw err;
    }

    return adminRepository.reassignGrievance(id, { assignedRole });
  }

  // ===========================================================================
  // 9. NOTIFICATION MONITORING
  // ===========================================================================
  async getNotifications(query) {
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));

    return adminRepository.findNotifications({
      category: query.category,
      isRead: query.isRead,
      search: query.search,
      page,
      limit,
    });
  }

  // ===========================================================================
  // 10. SYSTEM ACTIVITY / AUDIT LOGS
  // ===========================================================================
  async getAuditLogs(query) {
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));

    return adminRepository.findAuditLogs({
      action: query.action,
      actorRole: query.actorRole,
      search: query.search,
      page,
      limit,
    });
  }
}

module.exports = new AdminService();
