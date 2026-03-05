import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthContext } from '../context/AuthContext';

import LoginEmployee from '../pages/LoginEmployee';
import LoginAdmin from '../pages/LoginAdmin';
import Register from '../pages/Register';
import CheckIn from '../pages/CheckIn';
import Tasks from '../pages/Tasks';
import MyStats from '../pages/MyStats';
import AdminDashboard from '../pages/admin/AdminDashboard';
import Employees from '../pages/admin/Employees';
import Analytics from '../pages/admin/Analytics';
import Attempts from '../pages/admin/Attempts';

const PrivateRoute: React.FC<{ children: React.ReactNode; role?: 'admin' | 'employee' }> = ({ children, role }) => {
  const { isAuthenticated, user } = useAuthContext();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (role && user?.role !== role) {
    return <Navigate to={user?.role === 'admin' ? '/admin' : '/check-in'} replace />;
  }
  return <>{children}</>;
};

const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, user } = useAuthContext();
  if (isAuthenticated) {
    return <Navigate to={user?.role === 'admin' ? '/admin' : '/check-in'} replace />;
  }
  return <>{children}</>;
};

const AppRoutes: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<PublicRoute><LoginEmployee /></PublicRoute>} />
        <Route path="/admin/login" element={<PublicRoute><LoginAdmin /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

        {/* Employee routes */}
        <Route path="/check-in" element={<PrivateRoute role="employee"><CheckIn /></PrivateRoute>} />
        <Route path="/tasks" element={<PrivateRoute role="employee"><Tasks /></PrivateRoute>} />
        <Route path="/stats" element={<PrivateRoute role="employee"><MyStats /></PrivateRoute>} />

        {/* Admin routes */}
        <Route path="/admin" element={<PrivateRoute role="admin"><AdminDashboard /></PrivateRoute>} />
        <Route path="/admin/employees" element={<PrivateRoute role="admin"><Employees /></PrivateRoute>} />
        <Route path="/admin/analytics" element={<PrivateRoute role="admin"><Analytics /></PrivateRoute>} />
        <Route path="/admin/attempts" element={<PrivateRoute role="admin"><Attempts /></PrivateRoute>} />

        {/* Default redirect */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRoutes;
