import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import RescueRadiusEmblem from './RescueRadiusEmblem';


const ProtectedRoute = ({ allowedRoles = [], requireVerifiedNGO = false }) => {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FBFBF7] flex items-center justify-center">
        <div className="flex flex-col items-center space-y-3 text-[#143627]">
          <div className="relative animate-pulse">
            <RescueRadiusEmblem size={36} variant="mark" className="text-[#143627]" />
          </div>
          <span className="font-mono text-xs uppercase tracking-wider text-slate-600">
            Calibrating RescueRadius Station...
          </span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
    if (user?.role === 'CITIZEN') return <Navigate to="/citizen/dashboard" replace />;
    if (user?.role === 'NGO') return <Navigate to="/ngo/dashboard" replace />;
    if (user?.role === 'ADMIN') return <Navigate to="/admin/dashboard" replace />;
    return <Navigate to="/login" replace />;
  }

  if (requireVerifiedNGO && user?.role === 'NGO') {
    const isVerified = user?.ngo_profile?.verification_status === 'VERIFIED';
    if (!isVerified) {
      return <Navigate to="/ngo/dashboard" replace />;
    }
  }

  return <Outlet />;
};

export default ProtectedRoute;
