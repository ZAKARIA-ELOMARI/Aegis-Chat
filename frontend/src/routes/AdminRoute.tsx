// src/routes/AdminRoute.tsx
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import useAuthStore from '../store/authStore';

const AdminRoute: React.FC = () => {
  const { isAuthenticated, role } = useAuthStore();

  // For this to work, your admin user in the database must have a role named 'Super Admin'
  if (!isAuthenticated || role !== 'Super Admin') {
    // Redirect non-admins to the dashboard
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />; // Render the admin child component
};

export default AdminRoute;