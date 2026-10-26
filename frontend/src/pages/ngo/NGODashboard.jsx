import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { fetchAssignmentsApi, fetchDiscoverReportsApi } from '../../api/ngo';
import FieldHeader from '../../components/FieldHeader';
import FieldStat from '../../components/FieldStat';
import FieldBadge from '../../components/FieldBadge';
import RescueSignal from '../../components/RescueSignal';
import RescueRadiusEmblem from '../../components/RescueRadiusEmblem';

const NGODashboard = () => {
  const { user, refreshUser } = useAuth();
  const ngoProfile = user?.ngo_profile;
  const isVerified = ngoProfile?.verification_status === 'VERIFIED';

  const [assignments, setAssignments] = useState([]);
  const [discoverReports, setDiscoverReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isPermissionRestricted, setIsPermissionRestricted] = useState(false);

  const loadDashboardData = useCallback(async () => {
    if (!isVerified) {
      setAssignments([]);
      setDiscoverReports([]);
      setIsPermissionRestricted(true);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    setIsPermissionRestricted(false);

    try {
      const [asgnResult, discoverResult] = await Promise.allSettled([
        fetchAssignmentsApi(),
        fetchDiscoverReportsApi(),
      ]);

      let permissionErrorFound = false;

      if (asgnResult.status === 'fulfilled') {
        setAssignments(Array.isArray(asgnResult.value) ? asgnResult.value : []);
      } else {
        const status = asgnResult.reason?.response?.status;
        if (status === 403) {
          permissionErrorFound = true;
        } else {
          setError(asgnResult.reason?.response?.data?.detail || 'Failed to load rescue assignments.');
        }
      }

      if (discoverResult.status === 'fulfilled') {
        setDiscoverReports(Array.isArray(discoverResult.value) ? discoverResult.value : []);
      } else {
        const status = discoverResult.reason?.response?.status;
        if (status === 403) {
          permissionErrorFound = true;
        }
      }

      if (permissionErrorFound) {
        setIsPermissionRestricted(true);
      }
    } catch (err) {
      console.error('Fetch NGO dashboard unexpected error:', err);
      setError('An unexpected error occurred while communicating with Field Station servers.');
    } finally {
      setLoading(false);
    }
  }, [isVerified]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const handleSync = async () => {
    if (refreshUser) {
      try {
        await refreshUser();
      } catch (e) {
        console.warn('Sync refreshUser failed:', e);
      }
    }
    loadDashboardData();
  };

  const totalAssignments = assignments.length;
  const activeCount = assignments.filter((a) => a.status === 'ACTIVE').length;
  const completedCount = assignments.filter((a) => a.status === 'COMPLETED').length;
  const nearbyCasesCount = discoverReports.length;

  return (
    <div className="space-y-6 sm:space-y-8 pb-12">
      {/* Header */}
      <FieldHeader
        badge="NGO FIELD DISPATCH STATION"
        title="Rescue Operations Center"
        subtitle={
          ngoProfile?.organization_name
            ? `Operational unit for ${ngoProfile.organization_name} (${user?.email}). Radar operating radius: ${ngoProfile.operating_radius_km} km.`
            : `Station dispatch center for ${user?.email}. Monitor active rescue missions and coordinate emergency responses.`
        }
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="hidden sm:inline-block">
              <FieldBadge status={ngoProfile?.verification_status || (isPermissionRestricted ? 'PENDING' : 'ACTIVE')} />
            </span>
            {isVerified && (
              <>
                <Link
                  to="/ngo/reports"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#D9480F] hover:bg-[#C23E0A] text-white font-mono font-bold text-xs uppercase tracking-wider shadow-sm transition-colors"
                >
                  <RescueRadiusEmblem className="w-3.5 h-3.5 text-white" />
                  <span>Radar Discovery ({nearbyCasesCount})</span>
                </Link>
                <Link
                  to="/ngo/assignments"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#143627] hover:bg-[#1B4532] text-white font-mono font-bold text-xs uppercase tracking-wider shadow-sm transition-colors"
                >
                  <span>🚑</span>
                  <span>Active Missions ({activeCount})</span>
                </Link>
              </>
            )}
            <button
              onClick={handleSync}
              className="px-3 py-2 rounded-xl border border-[#D5D1C3] bg-white text-xs font-mono uppercase tracking-wider text-slate-700 hover:text-slate-900 hover:bg-[#F6F4EE] transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <span>🔄</span>
              <span>Sync</span>
            </button>
          </div>
        }
      />

      {/* Profile Verification Notice when account is pending or restricted */}
      {(isPermissionRestricted || (!loading && !isVerified)) && (
        <div className="bg-white border border-amber-300 rounded-2xl p-6 sm:p-7 shadow-xs overflow-hidden relative">
          <div className="flex items-start gap-4 sm:gap-5">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-2xl shrink-0 text-amber-700">
              {ngoProfile?.verification_status === 'REJECTED' ? '❌' : ngoProfile?.verification_status === 'SUSPENDED' ? '🛑' : '⏳'}
            </div>
            <div className="space-y-3 flex-1 min-w-0">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-amber-800 font-bold bg-amber-100/70 px-2 py-0.5 rounded border border-amber-200">
                    FIELD CONTROL STATUS // {ngoProfile?.verification_status === 'REJECTED' ? 'APPLICATION REJECTED' : ngoProfile?.verification_status === 'SUSPENDED' ? 'ACCOUNT SUSPENDED' : 'REVIEW IN PROGRESS'}
                  </span>
                  <FieldBadge status={ngoProfile?.verification_status || 'PENDING'} />
                </div>
                <h3 className="font-serif text-xl font-bold text-[#143627]">
                  {ngoProfile?.verification_status === 'REJECTED'
                    ? 'Organization Registration Rejected'
                    : ngoProfile?.verification_status === 'SUSPENDED'
                    ? 'Organization Privileges Suspended'
                    : 'Organization Profile Awaiting Field Control Verification'}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 font-sans mt-1 leading-relaxed max-w-3xl">
                  {ngoProfile?.verification_status === 'REJECTED'
                    ? 'Your organization registration was reviewed and not approved by central administrators. Please contact Field Control support if you believe this is in error.'
                    : ngoProfile?.verification_status === 'SUSPENDED'
                    ? 'Your organization operations are currently suspended. Discovery radar and active rescue claim features are disabled.'
                    : ngoProfile?.organization_name
                    ? `Your organization profile for "${ngoProfile.organization_name}" has been registered and is currently pending verification by central administrators. Discovery radar and rescue claims will unlock immediately once approved.`
                    : 'Your account is registered as an NGO responder. Organization verification by central administrators is required before case discovery radar and mission claims are activated.'}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2 text-xs font-mono">
                <div className="bg-[#FAF9F5] p-3 rounded-xl border border-[#E5E2D6]">
                  <span className="text-[10px] text-slate-500 block uppercase">STATION ACCOUNT</span>
                  <span className="font-bold text-slate-900 truncate block mt-0.5">{user?.email}</span>
                </div>
                <div className="bg-[#FAF9F5] p-3 rounded-xl border border-[#E5E2D6]">
                  <span className="text-[10px] text-slate-500 block uppercase">ORGANIZATION</span>
                  <span className="font-bold text-slate-900 truncate block mt-0.5">{ngoProfile?.organization_name || 'Pending Onboarding'}</span>
                </div>
                <div className="bg-[#FAF9F5] p-3 rounded-xl border border-[#E5E2D6]">
                  <span className="text-[10px] text-slate-500 block uppercase">RADAR ACCESS</span>
                  <span className="font-bold text-amber-700 block mt-0.5">Unlocks Upon Verification</span>
                </div>
                <div className="bg-[#FAF9F5] p-3 rounded-xl border border-[#E5E2D6]">
                  <span className="text-[10px] text-slate-500 block uppercase">OPERATING RADIUS</span>
                  <span className="font-bold text-slate-900 block mt-0.5">
                    {ngoProfile?.operating_radius_km ? `${ngoProfile.operating_radius_km} km` : '10 km'}
                  </span>
                </div>
              </div>

              {ngoProfile && (
                <div className="pt-2 border-t border-amber-200/70 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-mono text-slate-600">
                  {ngoProfile.phone && (
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase">Phone</span>
                      <span className="font-medium text-slate-800">{ngoProfile.phone}</span>
                    </div>
                  )}
                  {ngoProfile.email && (
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase">Contact Email</span>
                      <span className="font-medium text-slate-800 truncate block">{ngoProfile.email}</span>
                    </div>
                  )}
                  {ngoProfile.address && (
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase">Station Address</span>
                      <span className="font-medium text-slate-800 truncate block">{ngoProfile.address}</span>
                    </div>
                  )}
                </div>
              )}

              <p className="text-[11px] text-slate-500 font-sans italic pt-1">
                Notice: If you are an administrator testing this station, you can approve this profile in the Central Command Center (Admin Dashboard).
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Operational Radar Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <FieldStat
          label="Nearby In Radius"
          value={isVerified ? nearbyCasesCount : '—'}
          subtext={isVerified ? 'Verified reports available to claim' : 'Requires verified profile'}
          icon="📍"
          highlight={isVerified && nearbyCasesCount > 0 ? 'vermilion' : 'default'}
        />
        <FieldStat
          label="Active Missions"
          value={isVerified ? activeCount : '—'}
          subtext={isVerified ? 'Units deployed or claimed' : 'Pending activation'}
          icon="🚑"
          highlight={isVerified && activeCount > 0 ? 'amber' : 'default'}
        />
        <FieldStat
          label="Completed Rescues"
          value={isVerified ? completedCount : '—'}
          subtext={isVerified ? 'Animals safely secured' : 'Cumulative tally'}
          icon="🐾"
          highlight="forest"
        />
        <FieldStat
          label="Total All-Time Claims"
          value={isVerified ? totalAssignments : '—'}
          subtext="Cumulative missions"
          icon="📋"
          highlight="default"
        />
      </div>

      {error && !isPermissionRestricted && (
        <div className="p-4 bg-rose-50 border border-rose-300 rounded-xl text-rose-900 text-xs font-mono flex items-center gap-2">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* Recent Missions Manifest */}
      <div className="bg-white border border-[#E5E2D6] rounded-2xl shadow-xs overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-[#EFECE3] flex items-center justify-between">
          <div>
            <h2 className="font-serif text-lg font-bold text-[#143627]">
              Current Mission Dispatches
            </h2>
            <p className="text-xs text-slate-500 font-sans mt-0.5">
              Active and recently concluded missions assigned to your organization.
            </p>
          </div>
          <button
            onClick={loadDashboardData}
            className="px-3 py-1.5 rounded-lg border border-[#D5D1C3] text-xs font-mono uppercase tracking-wider text-slate-700 hover:text-slate-900 hover:bg-[#F6F4EE] transition-colors flex items-center gap-1.5"
          >
            <span>🔄</span>
            <span>Refresh</span>
          </button>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-500 flex flex-col items-center justify-center space-y-3">
            <svg className="animate-spin h-6 w-6 text-[#143627]" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            <span className="text-xs font-mono uppercase tracking-wider text-slate-500">
              Syncing operational data...
            </span>
          </div>
        ) : assignments.length === 0 ? (
          <div className="py-16 px-4 text-center max-w-md mx-auto space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-[#F6F4EE] border border-[#E5E2D6] flex items-center justify-center text-2xl mx-auto text-[#143627]">
              🚑
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold text-[#143627]">
                {isVerified ? 'No Assigned Missions' : 'Rescue Missions Locked'}
              </h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed font-sans">
                {isVerified
                  ? 'Your organization does not currently have active rescue assignments. Explore the Field Atlas discovery map to identify verified distress reports within your operating radius.'
                  : 'Incident discovery radar and mission claim workflows are locked while your organization profile is under review by central administrators.'}
              </p>
            </div>
            {isVerified && (
              <div className="pt-2">
                <Link
                  to="/ngo/reports"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#D9480F] hover:bg-[#C23E0A] text-white font-mono font-bold text-xs uppercase tracking-wider shadow-sm transition-colors"
                >
                  <RescueRadiusEmblem className="w-4 h-4 text-white" />
                  <span>Discover Nearby Cases Now</span>
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="divide-y divide-[#EFECE3]">
            {assignments.slice(0, 6).map((asgn) => {
              const report = asgn.report;
              const primaryImage = report?.images?.find((img) => img.is_primary)?.image || report?.images?.[0]?.image;

              return (
                <div
                  key={asgn.id}
                  className="p-5 sm:p-6 hover:bg-[#FAF9F5] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-xl border border-[#E5E2D6] overflow-hidden bg-[#F6F4EE] shrink-0 flex items-center justify-center">
                      {primaryImage ? (
                        <img
                          src={primaryImage}
                          alt={report?.animal?.species || 'Animal'}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-xl">🐾</span>
                      )}
                    </div>

                    <div className="space-y-1.5 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold text-[#143627]">
                          #ASGN-{String(asgn.id).padStart(4, '0')}
                        </span>
                        <span className="font-serif font-bold text-slate-900 text-base">
                          {report?.animal?.species || 'Animal'}
                          {report?.animal?.breed ? ` (${report.animal.breed})` : ''}
                        </span>
                        <FieldBadge status={asgn.status} />
                        {report?.urgency && (
                          <RescueSignal urgency={report.urgency} variant="compact" />
                        )}
                      </div>

                      <p className="text-xs text-slate-600 line-clamp-1 max-w-xl font-sans">
                        {report?.description}
                      </p>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-mono text-slate-500 pt-0.5">
                        {report?.address && (
                          <span className="flex items-center gap-1 text-slate-700">
                            <span>📍</span>
                            <span className="truncate max-w-xs">{report.address}</span>
                          </span>
                        )}
                        <span>
                          Claimed {new Date(asgn.claimed_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#EFECE3]">
                    <Link
                      to={`/ngo/assignments/${asgn.id}`}
                      className="px-3.5 py-1.5 rounded-lg bg-[#FAF9F5] group-hover:bg-[#143627] text-slate-700 group-hover:text-white border border-[#D5D1C3] group-hover:border-[#143627] text-xs font-mono uppercase tracking-wider font-semibold transition-all inline-flex items-center gap-1.5"
                    >
                      <span>Mission Log</span>
                      <span>→</span>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default NGODashboard;
