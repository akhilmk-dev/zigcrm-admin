import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import DashboardLayout from './layouts/DashboardLayout';
import Home from './pages/Home';
import Tenants from './pages/Tenants';
import Users from './pages/Users';
import Roles from './pages/Roles';
import Contacts from './pages/Contacts';
import Deals from './pages/Deals';
import Tasks from './pages/Tasks';
import Profile from './pages/Profile';

function App() {
  const isAuthenticated = !!localStorage.getItem('accessToken');

  return (
    <Router>
      <Routes>
        <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/" />} />
        
        {/* Protected Routes Setup */}
        <Route path="/" element={isAuthenticated ? <DashboardLayout /> : <Navigate to="/login" />}>
           <Route index element={<Home />} />
           <Route path="tenants" element={<Tenants />} />
           <Route path="users" element={<Users />} />
           <Route path="roles" element={<Roles />} />
           <Route path="contacts" element={<Contacts />} />
           <Route path="deals" element={<Deals />} />
           <Route path="tasks" element={<Tasks />} />
           <Route path="profile" element={<Profile />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;
