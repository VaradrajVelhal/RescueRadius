import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import RescueRadiusEmblem from '../../components/RescueRadiusEmblem';

const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    password_confirm: '',
    first_name: '',
    last_name: '',
    role: 'CITIZEN',
    // NGO details
    organization_name: '',
    description: '',
    phone: '',
    organization_email: '',
    address: '',
    latitude: '',
    longitude: '',
    operating_radius_km: '10',
  });

  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState('');
  const [geoSuccess, setGeoSuccess] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
    if (error) setError('');
  };

  const handleGeolocation = () => {
    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported by your browser.');
      return;
    }

    setGeoLoading(true);
    setGeoError('');
    setGeoSuccess(false);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData((prev) => ({
          ...prev,
          latitude: position.coords.latitude.toFixed(6),
          longitude: position.coords.longitude.toFixed(6),
        }));
        setGeoLoading(false);
        setGeoSuccess(true);
      },
      (err) => {
        console.error('Station geolocation error:', err);
        setGeoError('Could not acquire automatic GPS fix. Please enter station coordinates manually.');
        setGeoLoading(false);
      },
      { timeout: 12000, enableHighAccuracy: true }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.password_confirm) {
      setError('Passwords do not match.');
      return;
    }

    if (formData.role === 'ADMIN') {
      setError('Public registration as ADMIN is strictly prohibited.');
      return;
    }

    if (formData.role === 'NGO') {
      if (!formData.organization_name.trim()) {
        setError('Organization name is required for NGO registration.');
        return;
      }
      if (!formData.phone.trim()) {
        setError('Contact phone number is required for NGO registration.');
        return;
      }
      if (!formData.address.trim()) {
        setError('Sanctuary or station address is required for NGO registration.');
        return;
      }

      const lat = parseFloat(formData.latitude);
      const lng = parseFloat(formData.longitude);

      if (isNaN(lat) || lat < -90 || lat > 90) {
        setError('Station latitude must be a valid coordinate between -90 and 90 degrees.');
        return;
      }

      if (isNaN(lng) || lng < -180 || lng > 180) {
        setError('Station longitude must be a valid coordinate between -180 and 180 degrees.');
        return;
      }

      const radius = parseInt(formData.operating_radius_km, 10);
      if (isNaN(radius) || radius < 1 || radius > 100) {
        setError('Operating radius must be between 1 and 100 km.');
        return;
      }
    }

    setLoading(true);

    try {
      const payload = {
        email: formData.email.trim(),
        password: formData.password,
        password_confirm: formData.password_confirm,
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        role: formData.role,
      };

      if (formData.role === 'NGO') {
        payload.organization_name = formData.organization_name.trim();
        payload.description = formData.description.trim();
        payload.phone = formData.phone.trim();
        payload.organization_email = formData.organization_email.trim() || formData.email.trim();
        payload.address = formData.address.trim();
        payload.latitude = parseFloat(formData.latitude);
        payload.longitude = parseFloat(formData.longitude);
        payload.operating_radius_km = parseInt(formData.operating_radius_km, 10) || 10;
      }

      await register(payload);

      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 1800);
    } catch (err) {
      console.error('Registration error:', err);
      const data = err.response?.data;
      if (data) {
        if (typeof data === 'object') {
          const firstKey = Object.keys(data)[0];
          const firstErr = Array.isArray(data[firstKey]) ? data[firstKey][0] : data[firstKey];
          setError(`${firstKey}: ${firstErr}`);
        } else {
          setError(String(data));
        }
      } else {
        setError(err.message || 'Registration failed. Please check your inputs.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto my-6 sm:my-10">
      <div className="bg-white border border-[#E5E2D6] rounded-2xl shadow-sm overflow-hidden grid grid-cols-1 md:grid-cols-12">
        {/* Left Side: Brand Narrative */}
        <div className="md:col-span-5 bg-[#143627] text-white p-8 sm:p-10 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute inset-0 bg-carto-dots opacity-20 pointer-events-none" />

          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-[#1E4935] border border-emerald-400/30 flex items-center justify-center text-emerald-300 shadow-2xs">
                <RescueRadiusEmblem size={24} variant="mark" className="text-emerald-300" />
              </div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#1E4935] border border-emerald-400/30 text-[11px] font-mono text-emerald-300 uppercase tracking-widest">
                <span>●</span>
                <span>DISPATCH ENROLLMENT</span>
              </div>
            </div>

            <h2 className="font-serif text-3xl font-bold text-[#FAF9F5] leading-tight">
              Join the Rescue Network
            </h2>

            <p className="mt-3 text-sm text-[#D2D9CC] font-sans leading-relaxed">
              Whether you are an individual citizen reporting an injured stray or a verified wildlife NGO coordinating rescues, your station account links directly to active field operations.
            </p>
          </div>

          <div className="relative z-10 mt-8 pt-6 border-t border-[#1E4935] space-y-3 font-sans text-xs text-[#D2D9CC]">
            <div className="flex items-start gap-2.5">
              <span className="text-emerald-400 font-mono">01.</span>
              <span><strong>Citizen Reporters:</strong> Instant GPS distress submission and photo documentation.</span>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="text-emerald-400 font-mono">02.</span>
              <span><strong>NGO Responders:</strong> Field Atlas geospatial radar and radius case claiming upon admin verification.</span>
            </div>
          </div>
        </div>

        {/* Right Side: Form */}
        <div className="md:col-span-7 p-8 sm:p-10 bg-white flex flex-col justify-center">
          <div className="mb-6">
            <div className="text-xs font-mono uppercase tracking-widest text-[#76847C] mb-1">
              FIELD REGISTRATION
            </div>
            <h1 className="font-serif text-2xl font-bold text-[#143627]">
              Create Your Station Account
            </h1>
            <p className="text-sm text-slate-600 mt-1 font-sans">
              Enter your details to initiate animal rescue access.
            </p>
          </div>

          {error && (
            <div className="mb-6 p-3.5 bg-rose-50 border border-rose-300 rounded-xl text-rose-900 text-xs font-mono flex items-center space-x-2.5">
              <span className="text-base">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-6 p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-950 text-xs font-mono flex items-center space-x-2.5">
              <span className="text-base">✓</span>
              <span>
                {formData.role === 'NGO'
                  ? 'Sanctuary application submitted for field review! Redirecting to station login...'
                  : 'Registration confirmed! Redirecting to station login...'}
              </span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-mono font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                  First Name
                </label>
                <input
                  type="text"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  placeholder="Aarav"
                  className="w-full bg-[#FAF9F5] border border-[#D5D1C3] rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#143627] focus:ring-1 focus:ring-[#143627] transition-all font-sans"
                />
              </div>
              <div>
                <label className="block text-xs font-mono font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                  Last Name
                </label>
                <input
                  type="text"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  placeholder="Sharma"
                  className="w-full bg-[#FAF9F5] border border-[#D5D1C3] rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#143627] focus:ring-1 focus:ring-[#143627] transition-all font-sans"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                Account Email Address *
              </label>
              <input
                type="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                placeholder="user@domain.com"
                className="w-full bg-[#FAF9F5] border border-[#D5D1C3] rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#143627] focus:ring-1 focus:ring-[#143627] transition-all font-sans"
              />
            </div>

            <div>
              <label className="block text-xs font-mono font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                Operational Role *
              </label>
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="w-full bg-[#FAF9F5] border border-[#D5D1C3] rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-[#143627] focus:ring-1 focus:ring-[#143627] transition-all font-sans"
              >
                <option value="CITIZEN">Citizen / Distress Reporter</option>
                <option value="NGO">Rescue Organization / Sanctuary (NGO)</option>
              </select>
            </div>

            {/* NGO Organization Credentials Section */}
            {formData.role === 'NGO' && (
              <div className="pt-3 pb-1 border-t border-[#EFECE3] space-y-4">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-[#143627] font-bold block mb-0.5">
                    FIELD ATLAS // SANCTUARY PROFILE
                  </span>
                  <h3 className="font-serif text-base font-bold text-[#143627]">
                    Organization & Operational Coordinates
                  </h3>
                  <p className="text-xs text-slate-500 font-sans mt-0.5">
                    Your profile will enter pending status awaiting Field Control approval before radar dispatch access is granted.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-mono font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                    Organization / Sanctuary Name *
                  </label>
                  <input
                    type="text"
                    name="organization_name"
                    required={formData.role === 'NGO'}
                    value={formData.organization_name}
                    onChange={handleChange}
                    placeholder="e.g. Wildlife SOS Rescue Station"
                    className="w-full bg-[#FAF9F5] border border-[#D5D1C3] rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#143627] font-sans"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-mono font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                      Contact Phone Number *
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      required={formData.role === 'NGO'}
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="+91 98765 43210"
                      className="w-full bg-[#FAF9F5] border border-[#D5D1C3] rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#143627] font-sans"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                      Organization Contact Email
                    </label>
                    <input
                      type="email"
                      name="organization_email"
                      value={formData.organization_email}
                      onChange={handleChange}
                      placeholder="Optional, defaults to account email"
                      className="w-full bg-[#FAF9F5] border border-[#D5D1C3] rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#143627] font-sans"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                    Sanctuary / Dispatch Address *
                  </label>
                  <textarea
                    rows={2}
                    name="address"
                    required={formData.role === 'NGO'}
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="Physical sanctuary address, base station, or central facility location..."
                    className="w-full bg-[#FAF9F5] border border-[#D5D1C3] rounded-xl p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#143627] font-sans"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                    Organization Mission / Description
                  </label>
                  <textarea
                    rows={2}
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="Brief description of facilities, vet resources, or rescue capabilities..."
                    className="w-full bg-[#FAF9F5] border border-[#D5D1C3] rounded-xl p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#143627] font-sans"
                  />
                </div>

                <div className="bg-[#FAF9F5] border border-[#E5E2D6] rounded-xl p-4 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="text-xs font-mono font-bold text-[#143627] uppercase">
                      Station Geospatial Anchor
                    </span>
                    <button
                      type="button"
                      onClick={handleGeolocation}
                      disabled={geoLoading}
                      className="px-3 py-1.5 rounded-lg bg-[#143627] hover:bg-[#1B4532] text-white text-xs font-mono uppercase tracking-wider transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50"
                    >
                      <span>📍</span>
                      <span>{geoLoading ? 'Acquiring GPS...' : 'Capture GPS Coordinates'}</span>
                    </button>
                  </div>

                  {geoSuccess && (
                    <div className="p-2.5 bg-emerald-50 border border-emerald-300 rounded-lg text-emerald-950 text-xs font-mono flex items-center gap-1.5">
                      <span>✓</span>
                      <span>GPS coordinates captured from current device.</span>
                    </div>
                  )}

                  {geoError && (
                    <div className="p-2.5 bg-amber-50 border border-amber-300 rounded-lg text-amber-950 text-xs font-mono flex items-center gap-1.5">
                      <span>⚠️</span>
                      <span>{geoError}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-mono text-slate-600 uppercase mb-1">
                        Latitude * (-90° to 90°)
                      </label>
                      <input
                        type="number"
                        step="any"
                        name="latitude"
                        required={formData.role === 'NGO'}
                        value={formData.latitude}
                        onChange={handleChange}
                        placeholder="18.5204"
                        className="w-full bg-white border border-[#D5D1C3] rounded-lg px-3 py-1.5 text-xs text-slate-900 font-mono focus:outline-none focus:border-[#143627]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-mono text-slate-600 uppercase mb-1">
                        Longitude * (-180° to 180°)
                      </label>
                      <input
                        type="number"
                        step="any"
                        name="longitude"
                        required={formData.role === 'NGO'}
                        value={formData.longitude}
                        onChange={handleChange}
                        placeholder="73.8567"
                        className="w-full bg-white border border-[#D5D1C3] rounded-lg px-3 py-1.5 text-xs text-slate-900 font-mono focus:outline-none focus:border-[#143627]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono text-slate-600 uppercase mb-1">
                      Operating Radar Radius (1 - 100 km) *
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min="1"
                        max="100"
                        name="operating_radius_km"
                        value={formData.operating_radius_km}
                        onChange={handleChange}
                        className="flex-1 accent-[#143627]"
                      />
                      <span className="font-mono text-xs font-bold text-[#143627] bg-white border border-[#D5D1C3] px-2.5 py-1 rounded-md min-w-[64px] text-center">
                        {formData.operating_radius_km} km
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-mono font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                  Password (8+ chars) *
                </label>
                <input
                  type="password"
                  name="password"
                  required
                  minLength={8}
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••••••"
                  className="w-full bg-[#FAF9F5] border border-[#D5D1C3] rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#143627] focus:ring-1 focus:ring-[#143627] transition-all font-sans"
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                  Confirm Password *
                </label>
                <input
                  type="password"
                  name="password_confirm"
                  required
                  value={formData.password_confirm}
                  onChange={handleChange}
                  placeholder="••••••••••••"
                  className="w-full bg-[#FAF9F5] border border-[#D5D1C3] rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#143627] focus:ring-1 focus:ring-[#143627] transition-all font-sans"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || success}
              className="w-full mt-2 bg-[#143627] hover:bg-[#1B4532] text-white font-mono font-bold text-xs uppercase tracking-wider py-3.5 rounded-xl shadow-xs transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  <span>Registering Station Account...</span>
                </span>
              ) : (
                <span>
                  {formData.role === 'NGO'
                    ? 'Submit Sanctuary Application →'
                    : 'Register & Open Station →'}
                </span>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-[#EFECE3] text-center text-xs text-slate-600 font-sans">
            Already registered with an operational station?{' '}
            <Link to="/login" className="text-[#143627] font-semibold hover:underline">
              Sign In Here
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
