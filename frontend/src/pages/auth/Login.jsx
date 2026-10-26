import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import RescueRadiusEmblem from '../../components/RescueRadiusEmblem';

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await login(formData.email, formData.password);
      const userRole = res.user?.role;

      if (userRole === 'CITIZEN') navigate('/citizen/dashboard');
      else if (userRole === 'NGO') navigate('/ngo/dashboard');
      else if (userRole === 'ADMIN') navigate('/admin/dashboard');
      else navigate('/');
    } catch (err) {
      console.error('Login error:', err);
      const msg = err.response?.data?.detail || 'Invalid email or password. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto my-6 sm:my-12">
      <div className="bg-white border border-[#E5E2D6] rounded-2xl shadow-sm overflow-hidden grid grid-cols-1 md:grid-cols-12">
        {/* Left Side: Field Dispatch Insignia & Context */}
        <div className="md:col-span-5 bg-[#143627] text-white p-8 sm:p-10 flex flex-col justify-between relative overflow-hidden">
          {/* Subtle grid pattern background */}
          <div className="absolute inset-0 bg-carto-dots opacity-20 pointer-events-none" />

          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-[#1E4935] border border-emerald-400/30 flex items-center justify-center text-emerald-300 shadow-2xs">
                <RescueRadiusEmblem size={24} variant="mark" className="text-emerald-300" />
              </div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#1E4935] border border-emerald-400/30 text-[11px] font-mono text-emerald-300 uppercase tracking-widest">
                <span>●</span>
                <span>STATION AUTH</span>
              </div>
            </div>

            <h2 className="font-serif text-3xl font-bold text-[#FAF9F5] leading-tight">
              Field Atlas Rescue Network
            </h2>

            <p className="mt-3 text-sm text-[#D2D9CC] font-sans leading-relaxed">
              Coordinated domestic and wildlife emergency response. Connect citizen dispatches with verified rescue sanctuaries and field control.
            </p>
          </div>

          <div className="relative z-10 mt-8 pt-6 border-t border-[#1E4935] font-mono text-[11px] text-[#A2B3A6] space-y-1.5">
            <div className="flex justify-between">
              <span>SECURITY PROTOCOL:</span>
              <span className="text-white">JWT Bearer Auth</span>
            </div>
            <div className="flex justify-between">
              <span>SYSTEM CADENCE:</span>
              <span className="text-emerald-300">Continuous 24/7</span>
            </div>
            <div className="flex justify-between">
              <span>LOCATION SYSTEM:</span>
              <span className="text-white">GEOSPATIAL</span>
            </div>
          </div>
        </div>

        {/* Right Side: Form */}
        <div className="md:col-span-7 p-8 sm:p-10 flex flex-col justify-center bg-white">
          <div className="mb-6">
            <div className="text-xs font-mono uppercase tracking-widest text-[#76847C] mb-1">
              OPERATIONAL ACCESS
            </div>
            <h1 className="font-serif text-2xl font-bold text-[#143627]">
              Sign In to Your Station
            </h1>
            <p className="text-sm text-slate-600 mt-1 font-sans">
              Enter credentials to access dispatch tools and response logs.
            </p>
          </div>

          {error && (
            <div className="mb-6 p-3.5 bg-rose-50 border border-rose-300 rounded-xl text-rose-900 text-xs font-mono flex items-center space-x-2.5">
              <span className="text-base">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-mono font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                placeholder="dispatcher@rescueradius.org"
                className="w-full bg-[#FAF9F5] border border-[#D5D1C3] rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#143627] focus:ring-1 focus:ring-[#143627] transition-all font-sans"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-mono font-semibold uppercase tracking-wider text-slate-700">
                  Password
                </label>
              </div>
              <input
                type="password"
                name="password"
                required
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••••••"
                className="w-full bg-[#FAF9F5] border border-[#D5D1C3] rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#143627] focus:ring-1 focus:ring-[#143627] transition-all font-sans"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-[#143627] hover:bg-[#1B4532] text-white font-mono font-bold text-xs uppercase tracking-wider py-3 rounded-xl shadow-xs transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  <span>Authenticating Station...</span>
                </span>
              ) : (
                <span>Authenticate & Access →</span>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-[#EFECE3] text-center text-xs text-slate-600 font-sans">
            Need a field registration?{' '}
            <Link to="/register" className="text-[#143627] font-semibold hover:underline">
              Register as Citizen or NGO Responder
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
