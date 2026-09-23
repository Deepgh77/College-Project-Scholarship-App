import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { StudentDashboardPage } from './StudentDashboardPage';

export function DashboardPlaceholder() {
  const { user } = useAuth();

  if (user?.role === 'COLLEGE') {
    return <Navigate to="/college/dashboard" replace />;
  }

  if (user?.role === 'AUTHORITY') {
    return <Navigate to="/authority/dashboard" replace />;
  }

  if (user?.role === 'ADMIN') {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return <StudentDashboardPage />;
}
