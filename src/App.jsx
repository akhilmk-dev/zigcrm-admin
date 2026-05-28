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
           <Route path="tenants" element={<Tenants />} />
           <Route path="tenants/:id" element={<TenantDetail />} />
           <Route path="plans" element={<Plans />} />
           <Route path="users" element={<Users />} />
           <Route path="users/analytics" element={<UserAnalytics />} />
           <Route path="users/:id" element={<UserDetail />} />
           <Route path="roles" element={<Roles />} />
           <Route path="roles/:id" element={<RoleDetail />} />
           <Route path="contacts" element={<Contacts />} />
           <Route path="contacts/:id" element={<ContactDetail />} />
           <Route path="deals" element={<Deals />} />
           <Route path="deals/:id" element={<DealDetail />} />
           <Route path="tasks" element={<Tasks />} />
           <Route path="tasks/:id" element={<TaskDetail />} />
           <Route path="profile" element={<Profile />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}

export default App;
