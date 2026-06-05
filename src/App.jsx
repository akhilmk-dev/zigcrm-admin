import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import DashboardLayout from './layouts/DashboardLayout';
import Home from './pages/Home';
import Tenants from './pages/Tenants';
import Users from './pages/Users';
import Roles from './pages/Roles';
import RoleDetail from './pages/RoleDetail';
import Contacts from './pages/Contacts';
import Deals from './pages/Deals';
import Tasks from './pages/Tasks';
import TaskDetail from './pages/TaskDetail';
import Profile from './pages/Profile';
import Plans from './pages/Plans';
import ContactDetail from './pages/ContactDetail';
import DealDetail from './pages/DealDetail';
import ForgotPassword from './pages/ForgotPassword';
import NotFound from './pages/NotFound';
import UserDetail from './pages/UserDetail';
import TenantDetail from './pages/TenantDetail';
import UserAnalytics from './pages/UserAnalytics';

import { Toaster } from 'react-hot-toast';

function ProtectedRoute({ children, permission, requirePlatformAdmin }) {
  const user = (() => {
    try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
  })();

  if (!user) return <Navigate to="/login" replace />;

  const isSuperAdmin = user.isSuperAdmin;
  const isPlatformAdmin = isSuperAdmin || user.isAdmin;

  if (requirePlatformAdmin && !isPlatformAdmin) return <Navigate to="/" replace />;

  if (permission) {
    const allowed = isSuperAdmin || user.permissions?.includes('*') || user.permissions?.includes(permission);
    if (!allowed) return <Navigate to="/" replace />;
  }

  return children;
}

function App() {
  const isAuthenticated = !!localStorage.getItem('accessToken');

  return (
    <Router>
      <Toaster position="top-right" reverseOrder={false} />
      <Routes>
        <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/" />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        
        {/* Protected Routes Setup */}
        <Route path="/" element={isAuthenticated ? <DashboardLayout /> : <Navigate to="/login" />}>
           <Route index element={<Home />} />
           <Route path="tenants" element={<ProtectedRoute requirePlatformAdmin><Tenants /></ProtectedRoute>} />
           <Route path="tenants/:id" element={<ProtectedRoute requirePlatformAdmin><TenantDetail /></ProtectedRoute>} />
           <Route path="plans" element={<ProtectedRoute requirePlatformAdmin><Plans /></ProtectedRoute>} />
           <Route path="users" element={<ProtectedRoute permission="users.manage"><Users /></ProtectedRoute>} />
           <Route path="users/analytics" element={<ProtectedRoute permission="users.manage"><UserAnalytics /></ProtectedRoute>} />
           <Route path="users/:id" element={<ProtectedRoute permission="users.manage"><UserDetail /></ProtectedRoute>} />
           <Route path="roles" element={<ProtectedRoute permission="roles.manage"><Roles /></ProtectedRoute>} />
           <Route path="roles/:id" element={<ProtectedRoute permission="roles.manage"><RoleDetail /></ProtectedRoute>} />
           <Route path="contacts" element={<ProtectedRoute permission="contacts.read"><Contacts /></ProtectedRoute>} />
           <Route path="contacts/:id" element={<ProtectedRoute permission="contacts.read"><ContactDetail /></ProtectedRoute>} />
           <Route path="deals" element={<ProtectedRoute permission="deals.read"><Deals /></ProtectedRoute>} />
           <Route path="deals/:id" element={<ProtectedRoute permission="deals.read"><DealDetail /></ProtectedRoute>} />
           <Route path="tasks" element={<ProtectedRoute permission="tasks.read"><Tasks /></ProtectedRoute>} />
           <Route path="tasks/:id" element={<ProtectedRoute permission="tasks.read"><TaskDetail /></ProtectedRoute>} />
           <Route path="profile" element={<Profile />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}

export default App;
