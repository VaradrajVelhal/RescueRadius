import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import FieldBadge from './FieldBadge';
import RescueRadiusEmblem from './RescueRadiusEmblem';

const Navbar = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  const navLinkClass = (path) =>
    `text-xs font-mono uppercase tracking-wider font-semibold px-3 py-2 rounded-lg transition-all ${
      isActive(path)
        ? 'bg-[#1E4935] text-white ring-1 ring-emerald-400/40'
        : 'text-[#E5E9E1] hover:text-white hover:bg-[#1C4532]'
    }`;

  return (
    <nav className="bg-[#143627] text-white border-b border-[#0F291E] sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Brand & Crest */}
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 rounded-xl bg-[#1E4935] border border-emerald-400/30 flex items-center justify-center text-emerald-300 shadow-2xs group-hover:border-emerald-300 transition-all">
              <RescueRadiusEmblem size={24} variant="mark" className="text-emerald-300 group-hover:scale-105 transition-transform" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-serif text-lg font-bold tracking-tight text-[#FAF9F5]">
                  Rescue<span className="text-emerald-300 font-serif italic">Radius</span>
                </span>
                <span className="hidden sm:inline-block text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800">
                  FIELD ATLAS
                </span>
              </div>
              <span className="hidden md:block text-[10px] font-mono text-emerald-300/80 tracking-widest uppercase">
                Wildlife & Domestic Incident Response
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          {isAuthenticated ? (
            <div className="flex items-center space-x-4">
              <div className="hidden md:flex items-center space-x-2">
                {user?.role === 'CITIZEN' && (
                  <>
                    <Link to="/citizen/dashboard" className={navLinkClass('/citizen/dashboard')}>
                      Dashboard
                    </Link>
                    <Link to="/citizen/reports/create" className={navLinkClass('/citizen/reports/create')}>
                      + Report Incident
                    </Link>
                  </>
                )}

                {user?.role === 'NGO' && (
                  <>
                    <Link to="/ngo/dashboard" className={navLinkClass('/ngo/dashboard')}>
                      Dispatch Portal
                    </Link>
                    {user?.ngo_profile?.verification_status === 'VERIFIED' && (
                      <>
                        <Link to="/ngo/reports" className={navLinkClass('/ngo/reports')}>
                          Atlas Map Discovery
                        </Link>
                        <Link to="/ngo/assignments" className={navLinkClass('/ngo/assignments')}>
                          Assignments
                        </Link>
                      </>
                    )}
                  </>
                )}

                {user?.role === 'ADMIN' && (
                  <>
                    <Link to="/admin/dashboard" className={navLinkClass('/admin/dashboard')}>
                      Command Center
                    </Link>
                    <a
                      href="http://localhost:8000/admin/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-mono uppercase tracking-wider px-2.5 py-1.5 rounded-lg bg-[#0F291E] text-emerald-300 border border-emerald-700/50 hover:bg-[#1A3D2D] transition-colors flex items-center gap-1.5"
                    >
                      <span>Django DB</span>
                      <span className="text-[10px]">↗</span>
                    </a>
                  </>
                )}
              </div>

              {/* User Identity / Role Pill */}
              <div className="hidden sm:flex items-center gap-3 pl-2 border-l border-emerald-800/60">
                <div className="text-right">
                  <div className="text-xs font-mono text-[#F4F3EB] truncate max-w-[160px]">
                    {user?.email}
                  </div>
                  <div className="mt-0.5 flex items-center justify-end gap-1">
                    <FieldBadge status={user?.role} size="sm" />
                    {user?.role === 'NGO' && user?.ngo_profile?.verification_status && (
                      <FieldBadge status={user.ngo_profile.verification_status} size="sm" />
                    )}
                  </div>
                </div>

                <button
                  onClick={handleLogout}
                  className="px-3 py-1.5 rounded-lg border border-emerald-800/80 text-xs font-mono uppercase tracking-wider text-emerald-200 hover:text-white hover:bg-[#1A3D2D] transition-colors"
                >
                  Logout
                </button>
              </div>

              {/* Mobile Menu Button */}
              <div className="md:hidden flex items-center">
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="p-2 rounded-lg text-emerald-200 hover:text-white hover:bg-[#1E4935] focus:outline-none"
                  aria-label="Toggle navigation menu"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {mobileMenuOpen ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    )}
                  </svg>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center space-x-3">
              <Link
                to="/login"
                className="text-xs font-mono uppercase tracking-wider text-emerald-200 hover:text-white px-3 py-2 transition-colors"
              >
                Log In
              </Link>
              <Link
                to="/register"
                className="inline-flex items-center px-4 py-2 text-xs font-mono font-bold uppercase tracking-wider rounded-lg text-[#143627] bg-[#E8EFEA] hover:bg-white shadow-sm transition-colors"
              >
                Join Dispatch
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && isAuthenticated && (
        <div className="md:hidden border-t border-[#1C4532] bg-[#102D20] px-4 pt-3 pb-4 space-y-2">
          <div className="pb-2 border-b border-emerald-900/60 flex items-center justify-between text-xs font-mono text-emerald-300">
            <span>{user?.email}</span>
            <FieldBadge status={user?.role} size="sm" />
          </div>

          {user?.role === 'CITIZEN' && (
            <div className="flex flex-col space-y-1">
              <Link
                to="/citizen/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="text-xs font-mono px-3 py-2 rounded-lg text-white hover:bg-[#1E4935]"
              >
                Dashboard
              </Link>
              <Link
                to="/citizen/reports/create"
                onClick={() => setMobileMenuOpen(false)}
                className="text-xs font-mono px-3 py-2 rounded-lg text-white hover:bg-[#1E4935]"
              >
                + Report Incident
              </Link>
            </div>
          )}

          {user?.role === 'NGO' && (
            <div className="flex flex-col space-y-1">
              <Link
                to="/ngo/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="text-xs font-mono px-3 py-2 rounded-lg text-white hover:bg-[#1E4935]"
              >
                Dispatch Portal
              </Link>
              {user?.ngo_profile?.verification_status === 'VERIFIED' && (
                <>
                  <Link
                    to="/ngo/reports"
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-xs font-mono px-3 py-2 rounded-lg text-white hover:bg-[#1E4935]"
                  >
                    Atlas Map Discovery
                  </Link>
                  <Link
                    to="/ngo/assignments"
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-xs font-mono px-3 py-2 rounded-lg text-white hover:bg-[#1E4935]"
                  >
                    Assignments
                  </Link>
                </>
              )}
            </div>
          )}

          {user?.role === 'ADMIN' && (
            <div className="flex flex-col space-y-1">
              <Link
                to="/admin/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="text-xs font-mono px-3 py-2 rounded-lg text-white hover:bg-[#1E4935]"
              >
                Command Center
              </Link>
            </div>
          )}

          <div className="pt-2 border-t border-emerald-900/60">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                handleLogout();
              }}
              className="w-full text-left text-xs font-mono uppercase tracking-wider text-rose-300 px-3 py-2 rounded-lg hover:bg-[#1E4935]"
            >
              Sign Out
            </button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
