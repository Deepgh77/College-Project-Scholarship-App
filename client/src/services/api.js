const API_BASE = '/api';

/**
 * Custom error class for API errors
 */
export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

/**
 * Base fetch wrapper ensuring credentials: 'include' for HTTP-only cookie handling
 */
async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const headers = {
    ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers || {}),
  };

  const config = {
    ...options,
    headers,
    credentials: 'include', // Ensure browser sends & accepts HTTP-only auth cookies
  };

  const response = await fetch(url, config);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const defaultMsg =
      response.status === 502 || response.status === 503 || response.status === 504
        ? 'Unable to connect to the backend server. Please ensure the backend service is running.'
        : 'An unexpected error occurred';
    throw new ApiError(data.message || defaultMsg, response.status, data);
  }

  return data;
}

export const api = {
  // Health
  getHealth: () => request('/health'),

  // Auth
  register: (payload) =>
    request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  login: (payload) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  logout: () =>
    request('/auth/logout', {
      method: 'POST',
    }),

  getCurrentUser: () => request('/auth/me'),

  // Student Profile & Dashboard
  getStudentDashboard: () => request('/student/dashboard'),
  getStudentProfile: () => request('/student/profile'),

  saveStudentProfile: (payload) =>
    request('/student/profile', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  getColleges: () => request('/student/colleges'),

  // Scholarships & Eligibility
  getScholarships: (params = {}) => {
    const searchParams = new URLSearchParams();
    if (params.departmentId) searchParams.append('departmentId', params.departmentId);
    if (params.academicYear) searchParams.append('academicYear', params.academicYear);
    if (params.search) searchParams.append('search', params.search);
    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return request(`/scholarships${query}`);
  },

  getScholarshipById: (id) => request(`/scholarships/${id}`),

  getDepartments: () => request('/scholarships/departments'),

  evaluateScholarship: (id) => request(`/scholarships/${id}/evaluate`),

  evaluateAllScholarships: () => request('/scholarships/evaluate-all'),

  // Documents Management (Phase 4)
  getMyDocuments: () => request('/documents'),

  getDocumentTypes: () => request('/documents/types'),

  getDocumentById: (id) => request(`/documents/${id}`),

  uploadDocument: (formData) =>
    request('/documents/upload', {
      method: 'POST',
      body: formData,
    }),

  deleteDocument: (id) =>
    request(`/documents/${id}`, {
      method: 'DELETE',
    }),

  getDocumentPreviewUrl: (id) => `/api/documents/${id}/preview`,

  getDocumentDownloadUrl: (id) => `/api/documents/${id}/download`,

  getVersionDownloadUrl: (id, versionId) => `/api/documents/${id}/versions/${versionId}/download`,

  getVersionPreviewUrl: (id, versionId) => `/api/documents/${id}/versions/${versionId}/preview`,

  getApplicationPdfUrl: (id, isDownload = false, cycle = null) => {
    const params = new URLSearchParams();
    if (isDownload) params.set('download', 'true');
    if (cycle) params.set('cycle', String(cycle));
    const qs = params.toString();
    return `/api/applications/${id}/pdf${qs ? `?${qs}` : ''}`;
  },

  getApplicationPdfPreviewUrl: (id) => `/api/applications/${id}/preview/pdf`,

  // Application Creation & Submission (Phase 5)
  startApplication: (scholarshipId) =>
    request('/applications/start', {
      method: 'POST',
      body: JSON.stringify({ scholarshipId }),
    }),

  getMyApplications: () => request('/applications'),

  getApplicationById: (id) => request(`/applications/${id}`),

  saveApplicationDraft: (id, payload) =>
    request(`/applications/${id}/draft`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  getApplicationReadiness: (id) => request(`/applications/${id}/readiness`),

  getApplicationPreview: (id) => request(`/applications/${id}/preview`),

  submitApplication: (id, payload = {}) =>
    request(`/applications/${id}/submit`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Application Tracking & Corrections (Phase 6)
  getApplicationTracking: (id) => request(`/applications/${id}/tracking`),

  getApplicationHistory: (id) => request(`/applications/${id}/history`),

  getApplicationCorrections: (id) => request(`/applications/${id}/corrections`),

  resolveCorrection: (applicationId, correctionId, payload) =>
    request(`/applications/${applicationId}/corrections/${correctionId}/resolve`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  resubmitApplication: (id, payload) =>
    request(`/applications/${id}/resubmit`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  cancelApplication: (id, payload = {}) =>
    request(`/applications/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  exerciseRightToGiveUp: (id, payload = {}) =>
    request(`/applications/${id}/right-to-give-up`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // College Panel (Phase 7)
  getCollegeDashboard: () => request('/college/dashboard'),

  getCollegeApplications: (params = {}) => {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.append('page', params.page);
    if (params.limit) searchParams.append('limit', params.limit);
    if (params.search) searchParams.append('search', params.search);
    if (params.status) searchParams.append('status', params.status);
    if (params.scholarshipId) searchParams.append('scholarshipId', params.scholarshipId);
    if (params.academicYear) searchParams.append('academicYear', params.academicYear);
    if (params.sortBy) searchParams.append('sortBy', params.sortBy);
    if (params.sortOrder) searchParams.append('sortOrder', params.sortOrder);
    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return request(`/college/applications${query}`);
  },

  getCollegeApplicationDetails: (id) => request(`/college/applications/${id}`),

  startCollegeReview: (id) =>
    request(`/college/applications/${id}/review/start`, {
      method: 'POST',
    }),

  submitCollegeReviewDecision: (id, payload) =>
    request(`/college/applications/${id}/review/decision`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  reviewCollegeCorrection: (applicationId, correctionId, payload) =>
    request(`/college/applications/${applicationId}/corrections/${correctionId}/review`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  getCollegeDocPreviewUrl: (applicationId, versionId) =>
    `/api/college/applications/${applicationId}/documents/${versionId}/preview`,

  getCollegeDocDownloadUrl: (applicationId, versionId) =>
    `/api/college/applications/${applicationId}/documents/${versionId}/download`,

  // Authority Panel (Phase 8)
  getAuthorityDashboard: () => request('/authority/dashboard'),

  getAuthorityFilterOptions: () => request('/authority/filters/options'),

  getAuthorityApplications: (params = {}) => {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.append('page', params.page);
    if (params.limit) searchParams.append('limit', params.limit);
    if (params.search) searchParams.append('search', params.search);
    if (params.status) searchParams.append('status', params.status);
    if (params.scholarshipId) searchParams.append('scholarshipId', params.scholarshipId);
    if (params.collegeId) searchParams.append('collegeId', params.collegeId);
    if (params.academicYear) searchParams.append('academicYear', params.academicYear);
    if (params.sortBy) searchParams.append('sortBy', params.sortBy);
    if (params.sortOrder) searchParams.append('sortOrder', params.sortOrder);
    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return request(`/authority/applications${query}`);
  },

  getAuthorityApplicationDetails: (id) => request(`/authority/applications/${id}`),

  startAuthorityReview: (id) =>
    request(`/authority/applications/${id}/review/start`, {
      method: 'POST',
    }),

  submitAuthorityReviewDecision: (id, payload) =>
    request(`/authority/applications/${id}/review/decision`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getAuthorityDocPreviewUrl: (applicationId, versionId) =>
    `/api/authority/applications/${applicationId}/documents/${versionId}/preview`,

  getAuthorityDocDownloadUrl: (applicationId, versionId) =>
    `/api/authority/applications/${applicationId}/documents/${versionId}/download`,

  // Administrative Payment Simulation (Phase 9)
  getAdminApprovedApplications: (params = {}) => {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.append('page', params.page);
    if (params.limit) searchParams.append('limit', params.limit);
    if (params.departmentId) searchParams.append('departmentId', params.departmentId);
    if (params.academicYear) searchParams.append('academicYear', params.academicYear);
    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return request(`/admin/payments/approved-applications${query}`);
  },

  getAdminPaymentBatches: (params = {}) => {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.append('page', params.page);
    if (params.limit) searchParams.append('limit', params.limit);
    if (params.departmentId) searchParams.append('departmentId', params.departmentId);
    if (params.academicYear) searchParams.append('academicYear', params.academicYear);
    if (params.status) searchParams.append('status', params.status);
    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return request(`/admin/payments/batches${query}`);
  },

  getAdminPaymentBatchById: (id) => request(`/admin/payments/batches/${id}`),

  createAdminPaymentBatch: (payload) =>
    request('/admin/payments/batches', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  initiateAdminPaymentBatch: (id) =>
    request(`/admin/payments/batches/${id}/initiate`, {
      method: 'POST',
    }),

  disburseAdminPaymentBatch: (id) =>
    request(`/admin/payments/batches/${id}/disburse`, {
      method: 'POST',
    }),

  failAdminPaymentRecord: (recordId, payload) =>
    request(`/admin/payments/records/${recordId}/fail`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Admin Portal (System Management & Configuration)
  getAdminDashboardStats: () => request('/admin/dashboard/stats'),

  getAdminUsers: (params = {}) => {
    const sp = new URLSearchParams();
    if (params.page) sp.append('page', params.page);
    if (params.limit) sp.append('limit', params.limit);
    if (params.role) sp.append('role', params.role);
    if (params.isActive !== undefined) sp.append('isActive', params.isActive);
    if (params.search) sp.append('search', params.search);
    const q = sp.toString() ? `?${sp.toString()}` : '';
    return request(`/admin/users${q}`);
  },

  getAdminUserById: (id) => request(`/admin/users/${id}`),

  updateAdminUserStatus: (id, isActive) =>
    request(`/admin/users/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive }),
    }),

  provisionAdminStaffUser: (payload) =>
    request('/admin/users/provision', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getAdminColleges: (params = {}) => {
    const sp = new URLSearchParams();
    if (params.page) sp.append('page', params.page);
    if (params.limit) sp.append('limit', params.limit);
    if (params.isActive !== undefined) sp.append('isActive', params.isActive);
    if (params.search) sp.append('search', params.search);
    const q = sp.toString() ? `?${sp.toString()}` : '';
    return request(`/admin/colleges${q}`);
  },

  getAdminCollegeById: (id) => request(`/admin/colleges/${id}`),

  createAdminCollege: (payload) =>
    request('/admin/colleges', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateAdminCollege: (id, payload) =>
    request(`/admin/colleges/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  updateAdminCollegeStatus: (id, isActive) =>
    request(`/admin/colleges/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive }),
    }),

  getAdminDepartments: (params = {}) => {
    const sp = new URLSearchParams();
    if (params.isActive !== undefined) sp.append('isActive', params.isActive);
    if (params.search) sp.append('search', params.search);
    const q = sp.toString() ? `?${sp.toString()}` : '';
    return request(`/admin/departments${q}`);
  },

  getAdminDepartmentById: (id) => request(`/admin/departments/${id}`),

  createAdminDepartment: (payload) =>
    request('/admin/departments', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateAdminDepartment: (id, payload) =>
    request(`/admin/departments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  updateAdminDepartmentStatus: (id, isActive) =>
    request(`/admin/departments/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive }),
    }),

  getAdminScholarships: (params = {}) => {
    const sp = new URLSearchParams();
    if (params.page) sp.append('page', params.page);
    if (params.limit) sp.append('limit', params.limit);
    if (params.departmentId) sp.append('departmentId', params.departmentId);
    if (params.academicYear) sp.append('academicYear', params.academicYear);
    if (params.isActive !== undefined) sp.append('isActive', params.isActive);
    if (params.search) sp.append('search', params.search);
    const q = sp.toString() ? `?${sp.toString()}` : '';
    return request(`/admin/scholarships${q}`);
  },

  getAdminScholarshipById: (id) => request(`/admin/scholarships/${id}`),

  createAdminScholarship: (payload) =>
    request('/admin/scholarships', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateAdminScholarship: (id, payload) =>
    request(`/admin/scholarships/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  updateAdminScholarshipStatus: (id, isActive) =>
    request(`/admin/scholarships/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive }),
    }),

  createAdminScholarshipRule: (scholarshipId, payload) =>
    request(`/admin/scholarships/${scholarshipId}/rules`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  deleteAdminScholarshipRule: (scholarshipId, ruleId) =>
    request(`/admin/scholarships/${scholarshipId}/rules/${ruleId}`, {
      method: 'DELETE',
    }),

  createAdminScholarshipRequiredDoc: (scholarshipId, payload) =>
    request(`/admin/scholarships/${scholarshipId}/documents`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateAdminScholarshipRequiredDoc: (scholarshipId, docId, payload) =>
    request(`/admin/scholarships/${scholarshipId}/documents/${docId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  deleteAdminScholarshipRequiredDoc: (scholarshipId, docId) =>
    request(`/admin/scholarships/${scholarshipId}/documents/${docId}`, {
      method: 'DELETE',
    }),

  getAdminApplications: (params = {}) => {
    const sp = new URLSearchParams();
    if (params.page) sp.append('page', params.page);
    if (params.limit) sp.append('limit', params.limit);
    if (params.departmentId) sp.append('departmentId', params.departmentId);
    if (params.scholarshipId) sp.append('scholarshipId', params.scholarshipId);
    if (params.collegeId) sp.append('collegeId', params.collegeId);
    if (params.academicYear) sp.append('academicYear', params.academicYear);
    if (params.status) sp.append('status', params.status);
    if (params.search) sp.append('search', params.search);
    const q = sp.toString() ? `?${sp.toString()}` : '';
    return request(`/admin/applications${q}`);
  },

  getAdminApplicationDetails: (id) => request(`/admin/applications/${id}`),

  getAdminGrievances: (params = {}) => {
    const sp = new URLSearchParams();
    if (params.page) sp.append('page', params.page);
    if (params.limit) sp.append('limit', params.limit);
    if (params.status) sp.append('status', params.status);
    if (params.category) sp.append('category', params.category);
    if (params.assignedRole) sp.append('assignedRole', params.assignedRole);
    if (params.search) sp.append('search', params.search);
    const q = sp.toString() ? `?${sp.toString()}` : '';
    return request(`/admin/grievances${q}`);
  },

  getAdminGrievanceById: (id) => request(`/admin/grievances/${id}`),

  updateAdminGrievanceStatus: (id, payload) =>
    request(`/admin/grievances/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  reassignAdminGrievance: (id, payload) =>
    request(`/admin/grievances/${id}/assign`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  getAdminNotifications: (params = {}) => {
    const sp = new URLSearchParams();
    if (params.page) sp.append('page', params.page);
    if (params.limit) sp.append('limit', params.limit);
    if (params.category) sp.append('category', params.category);
    if (params.isRead !== undefined) sp.append('isRead', params.isRead);
    if (params.search) sp.append('search', params.search);
    const q = sp.toString() ? `?${sp.toString()}` : '';
    return request(`/admin/notifications${q}`);
  },

  getAdminAuditLogs: (params = {}) => {
    const sp = new URLSearchParams();
    if (params.page) sp.append('page', params.page);
    if (params.limit) sp.append('limit', params.limit);
    if (params.action) sp.append('action', params.action);
    if (params.actorRole) sp.append('actorRole', params.actorRole);
    if (params.search) sp.append('search', params.search);
    const q = sp.toString() ? `?${sp.toString()}` : '';
    return request(`/admin/audit-logs${q}`);
  },
};
