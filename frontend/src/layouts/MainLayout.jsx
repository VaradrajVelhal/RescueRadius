import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import RescueRadiusEmblem from '../components/RescueRadiusEmblem';

const MainLayout = () => {
  const { user, isAuthenticated } = useAuth();
  const ngoProfile = user?.ngo_profile;

  return (
    <div className="min-h-screen bg-[#FBFBF7] text-[#19241E] flex flex-col font-sans selection:bg-emerald-100 selection:text-emerald-950">
      <Navbar />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        <Outlet />
      </main>

      {/* Field Station Footer */}
      <footer className="border-t border-[#E5E2D6] bg-[#F5F4EC] py-6 mt-12 text-slate-600 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono">
          <div className="flex items-center space-x-2.5">
            <RescueRadiusEmblem size={16} variant="mark" className="text-[#143627]" />
            <span className="font-bold text-[#143627]">RESCUERADIUS // FIELD ATLAS</span>
            <span className="text-slate-400">
              &mdash;{' '}
              {isAuthenticated
                ? user?.role === 'NGO' && ngoProfile?.verification_status === 'VERIFIED'
                  ? `Verified Unit // ${ngoProfile.organization_name}`
                  : user?.role === 'ADMIN'
                  ? 'Central Field Control'
                  : 'Citizen Dispatch Active'
                : 'Animal Rescue Coordination Network'}
            </span>
          </div>

          <div className="text-slate-500 text-[11px] flex flex-wrap items-center gap-4">
            {ngoProfile?.location ? (
              <span>
                STATION COORD {Number(ngoProfile.location.latitude).toFixed(4)}°N / {Number(ngoProfile.location.longitude).toFixed(4)}°E (RAD {ngoProfile.operating_radius_km}KM)
              </span>
            ) : (
              <span className="text-slate-400 tracking-wider">
                FIELD COORDINATION PLATFORM
              </span>
            )}
            <span>&copy; {new Date().getFullYear()} RescueRadius</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default MainLayout;
