import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPlaceholder } from './pages/DashboardPlaceholder';
import { StudentProfilePage } from './pages/StudentProfilePage';
import { ScholarshipCatalogPage } from './pages/ScholarshipCatalogPage';
import { ScholarshipDetailPage } from './pages/ScholarshipDetailPage';
import { MyDocumentsPage } from './pages/MyDocumentsPage';
import { MyApplicationsPage } from './pages/MyApplicationsPage';
import { ApplicationWizardPage } from './pages/ApplicationWizardPage';
import { ApplicationTrackerPage } from './pages/ApplicationTrackerPage';
import { CollegeDashboardPage } from './pages/CollegeDashboardPage';
import { CollegeApplicationsQueuePage } from './pages/CollegeApplicationsQueuePage';
import { CollegeApplicationReviewPage } from './pages/CollegeApplicationReviewPage';
import { AuthorityDashboardPage } from './pages/AuthorityDashboardPage';
import { AuthorityApplicationsQueuePage } from './pages/AuthorityApplicationsQueuePage';
import { AuthorityApplicationReviewPage } from './pages/AuthorityApplicationReviewPage';
import { AdminPaymentSimulationPage } from './pages/AdminPaymentSimulationPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { AdminUsersPage } from './pages/AdminUsersPage';
import { AdminCollegesPage } from './pages/AdminCollegesPage';
import { AdminDepartmentsPage } from './pages/AdminDepartmentsPage';
import { AdminScholarshipsPage } from './pages/AdminScholarshipsPage';
import { AdminApplicationsPage } from './pages/AdminApplicationsPage';
import { AdminGrievancesPage } from './pages/AdminGrievancesPage';
import { AdminNotificationsPage } from './pages/AdminNotificationsPage';
import { AdminAuditLogsPage } from './pages/AdminAuditLogsPage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Authentication Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Scholarship Discovery Routes (Public / Personalizable) */}
          <Route path="/scholarships" element={<ScholarshipCatalogPage />} />
          <Route path="/scholarships/:id" element={<ScholarshipDetailPage />} />

          {/* Protected Area */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPlaceholder />
              </ProtectedRoute>
            }
          />

          <Route
            path="/profile"
            element={
              <ProtectedRoute allowedRoles={['STUDENT']}>
                <StudentProfilePage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/documents"
            element={
              <ProtectedRoute allowedRoles={['STUDENT']}>
                <MyDocumentsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/applications"
            element={
              <ProtectedRoute allowedRoles={['STUDENT']}>
                <MyApplicationsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/applications/:id/wizard"
            element={
              <ProtectedRoute allowedRoles={['STUDENT']}>
                <ApplicationWizardPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/applications/:id"
            element={
              <ProtectedRoute allowedRoles={['STUDENT']}>
                <ApplicationTrackerPage />
              </ProtectedRoute>
            }
          />

          {/* College Processing Portal Routes */}
          <Route
            path="/college/dashboard"
            element={
              <ProtectedRoute allowedRoles={['COLLEGE']}>
                <CollegeDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/college/applications"
            element={
              <ProtectedRoute allowedRoles={['COLLEGE']}>
                <CollegeApplicationsQueuePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/college/applications/:id"
            element={
              <ProtectedRoute allowedRoles={['COLLEGE']}>
                <CollegeApplicationReviewPage />
              </ProtectedRoute>
            }
          />

          {/* Department / Authority Portal Routes */}
          <Route
            path="/authority/dashboard"
            element={
              <ProtectedRoute allowedRoles={['AUTHORITY']}>
                <AuthorityDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/authority/applications"
            element={
              <ProtectedRoute allowedRoles={['AUTHORITY']}>
                <AuthorityApplicationsQueuePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/authority/applications/:id"
            element={
              <ProtectedRoute allowedRoles={['AUTHORITY']}>
                <AuthorityApplicationReviewPage />
              </ProtectedRoute>
            }
          />

          {/* Admin System Management Portal Routes */}
          <Route
            path="/admin"
            element={<Navigate to="/admin/dashboard" replace />}
          />
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AdminDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AdminUsersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/colleges"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AdminCollegesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/departments"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AdminDepartmentsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/scholarships"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AdminScholarshipsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/applications"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AdminApplicationsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/payments"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AdminPaymentSimulationPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/grievances"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AdminGrievancesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/notifications"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AdminNotificationsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/audit-logs"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AdminAuditLogsPage />
              </ProtectedRoute>
            }
          />

          {/* Fallbacks */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
