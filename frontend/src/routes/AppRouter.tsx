import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from '../pages/LoginPage';
import DashboardPage from '../pages/DashboardPage';
import ProtectedRoute from './ProtectedRoute';
import AdminRoute from './AdminRoute';
import MainLayout from '../layouts/MainLayout'; 
import ChatPage from '../pages/ChatPage';
import AssistantPage from '../pages/AssistantPage';
import SecurityPage from '../pages/SecurityPage';
import AdminUsersPage from '../pages/AdminUsersPage';
import AdminLogsPage from '../pages/AdminLogsPage';
import AdminSecurityAlertsPage from '../pages/AdminSecurityAlertsPage';
import AdminBroadcastPage from '../pages/AdminBroadcastPage';
import AdminRolesPage from '../pages/AdminRolesPage';
import SetInitialPasswordPage from '../pages/SetInitialPasswordPage';

const AppRouter: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        {/* ADD THIS NEW ROUTE */}
        <Route path="/set-initial-password" element={<SetInitialPasswordPage />} />

        {/* Protected Routes now use MainLayout */}
        <Route element={<ProtectedRoute />}>
          <Route element={<MainLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/chat" element={<ChatPage />} />
              <Route path="/assistant" element={<AssistantPage />} />
              <Route path="/security" element={<SecurityPage />} />
          </Route>
        </Route>

        {/* Admin Routes */}
        <Route element={<AdminRoute />}>
          <Route element={<MainLayout />}>
            <Route path="/admin/users" element={<AdminUsersPage />} />
            <Route path="/admin/roles" element={<AdminRolesPage />} />
            <Route path="/admin/logs" element={<AdminLogsPage />} />
            <Route path="/admin/security" element={<AdminSecurityAlertsPage />} />
            <Route path="/admin/broadcast" element={<AdminBroadcastPage />} />
          </Route>
        </Route>

        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
};

export default AppRouter;