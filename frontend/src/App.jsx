import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import MainLayout from './layouts/MainLayout';
import ProtectedRoute from './components/ProtectedRoute';

import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import CitizenDashboard from './pages/citizen/CitizenDashboard';
import CreateReport from './pages/citizen/CreateReport';
import ReportDetail from './pages/citizen/ReportDetail';
import NGODashboard from './pages/ngo/NGODashboard';
import CaseDiscovery from './pages/ngo/CaseDiscovery';
import AssignmentsList from './pages/ngo/AssignmentsList';
import AssignmentDetail from './pages/ngo/AssignmentDetail';
import AdminDashboard from './pages/admin/AdminDashboard';
import NotFound from './pages/NotFound';

const HomeRedirect = () => {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  if (user?.role === 'CITIZEN') return <Navigate to="/citizen/dashboard" replace />;
  if (user?.role === 'NGO') return <Navigate to="/ngo/dashboard" replace />;
  if (user?.role === 'ADMIN') return <Navigate to="/admin/dashboard" replace />;

  return <Navigate to="/login" replace />;
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route element={<MainLayout />}>
            {/* Public Routes */}
            <Route path="/" element={<HomeRedirect />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Citizen Protected Routes */}
            <Route element={<ProtectedRoute allowedRoles={['CITIZEN']} />}>
              <Route path="/citizen/dashboard" element={<CitizenDashboard />} />
              <Route path="/citizen/reports/create" element={<CreateReport />} />
              <Route path="/citizen/reports/:id" element={<ReportDetail />} />
            </Route>

            {/* NGO Protected Routes */}
            <Route element={<ProtectedRoute allowedRoles={['NGO']} />}>
              <Route path="/ngo/dashboard" element={<NGODashboard />} />
            </Route>
            <Route element={<ProtectedRoute allowedRoles={['NGO']} requireVerifiedNGO />}>
              <Route path="/ngo/reports" element={<CaseDiscovery />} />
              <Route path="/ngo/assignments" element={<AssignmentsList />} />
              <Route path="/ngo/assignments/:id" element={<AssignmentDetail />} />
            </Route>

            {/* Admin Protected Routes */}
            <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
            </Route>

            {/* 404 Catch-All */}
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
