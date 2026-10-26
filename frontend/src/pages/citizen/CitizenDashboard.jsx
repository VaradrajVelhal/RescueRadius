import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { fetchReportsApi } from '../../api/reports';
import FieldHeader from '../../components/FieldHeader';
import FieldBadge from '../../components/FieldBadge';
import RescueSignal from '../../components/RescueSignal';

const CitizenDashboard = () => {
  const { user } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadReports = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchReportsApi();
      setReports(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Fetch reports error:', err);
      setError(err.response?.data?.detail || 'Failed to load your field reports.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const totalCount = reports.length;
  const activeCount = reports.filter((r) =>
    ['REPORTED', 'VERIFIED', 'CLAIMED', 'IN_PROGRESS'].includes(r.status)
  ).length;
  const rescuedCount = reports.filter((r) => r.status === 'RESCUED').length;
  const closedCount = reports.filter((r) => r.status === 'CLOSED').length;

  return (
    <div className="space-y-6 sm:space-y-8 pb-12">
      {/* Header */}
      <FieldHeader
        badge="CITIZEN RESCUE STATION"
        title="My Field Activity Center"
        subtitle={`Welcome back, ${user?.email}. Monitor live status on reported animals, coordinate with responder units, or log a new distress incident.`}
        actions={
          <Link
            to="/citizen/reports/create"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#D9480F] hover:bg-[#C23E0A] text-white font-mono font-bold text-xs uppercase tracking-wider shadow-sm transition-colors"
          >
            <span className="text-base leading-none">+</span>
            <span>Report Animal in Distress</span>
          </Link>
        }
      />

      {/* Citizen Personal Overview & Quick Action */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Quick Report Distress Banner */}
        <div className="lg:col-span-7 bg-[#143627] text-white rounded-2xl p-6 sm:p-7 flex flex-col justify-between relative overflow-hidden shadow-xs">
          <div className="absolute inset-0 bg-carto-dots opacity-15 pointer-events-none" />
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-[#1E4935] border border-emerald-400/30 text-[10px] font-mono text-emerald-300 uppercase tracking-widest mb-3">
              <span>●</span>
              <span>EMERGENCY DISPATCH INITIATION</span>
            </div>
            <h2 className="font-serif text-2xl font-bold text-[#FAF9F5] leading-snug">
              Spotted an animal requiring emergency rescue?
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-[#D2D9CC] font-sans max-w-xl leading-relaxed">
              Submit a photo distress report with automatic GPS coordinates to alert verified wildlife and domestic animal rescue organizations in your vicinity.
            </p>
          </div>
          <div className="relative z-10 pt-5 mt-4 border-t border-[#1E4935] flex flex-wrap items-center justify-between gap-3">
            <span className="text-[11px] font-mono text-emerald-300/80">
              Avg dispatch response time: &lt; 15 mins
            </span>
            <Link
              to="/citizen/reports/create"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#D9480F] hover:bg-[#C23E0A] text-white font-mono font-bold text-xs uppercase tracking-wider shadow-sm transition-all"
            >
              <span className="text-sm">🚨</span>
              <span>Report Animal Now →</span>
            </Link>
          </div>
        </div>

        {/* Compact Personal Activity Strip */}
        <div className="lg:col-span-5 grid grid-cols-2 gap-3">
          <div className="bg-white border border-[#E5E2D6] rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-2xs">
            <div className="flex items-center justify-between text-xs font-mono uppercase tracking-wider text-slate-500">
              <span>Active Cases</span>
              <span className="text-base">🚑</span>
            </div>
            <div className="my-2">
              <span className="text-3xl font-mono font-bold text-amber-900">{activeCount}</span>
              <span className="text-xs text-slate-500 font-sans block mt-0.5">Under field response</span>
            </div>
            <div className="text-[10px] font-mono text-amber-700 uppercase tracking-widest pt-1 border-t border-[#EFECE3]">
              {activeCount > 0 ? 'Teams mobilized' : 'All clear'}
            </div>
          </div>

          <div className="bg-white border border-[#E5E2D6] rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-2xs">
            <div className="flex items-center justify-between text-xs font-mono uppercase tracking-wider text-slate-500">
              <span>Rescued Safe</span>
              <span className="text-base">🐾</span>
            </div>
            <div className="my-2">
              <span className="text-3xl font-mono font-bold text-emerald-900">{rescuedCount}</span>
              <span className="text-xs text-slate-500 font-sans block mt-0.5">Secured in sanctuary</span>
            </div>
            <div className="text-[10px] font-mono text-emerald-700 uppercase tracking-widest pt-1 border-t border-[#EFECE3]">
              Post-care logged
            </div>
          </div>

          <div className="col-span-2 bg-[#FAF9F5] border border-[#E5E2D6] rounded-2xl p-4 flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white border border-[#D5D1C3] flex items-center justify-center text-sm font-mono font-bold text-[#143627]">
                {totalCount}
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-900 font-sans">
                  Total Dispatches Submitted
                </div>
                <div className="text-[11px] text-slate-500 font-mono">
                  {closedCount} archived & closed
                </div>
              </div>
            </div>
            <button
              onClick={loadReports}
              className="px-3 py-1.5 rounded-lg border border-[#D5D1C3] text-xs font-mono uppercase tracking-wider text-slate-700 hover:text-slate-900 hover:bg-white transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <span>🔄</span>
              <span>Sync</span>
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-300 rounded-xl text-rose-900 text-xs font-mono flex items-center gap-2">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* Reports Incident Manifest */}
      <div className="bg-white border border-[#E5E2D6] rounded-2xl shadow-xs overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-[#EFECE3] flex items-center justify-between">
          <div>
            <h2 className="font-serif text-lg font-bold text-[#143627]">
              Incident Dispatch Log
            </h2>
            <p className="text-xs text-slate-500 font-sans mt-0.5">
              Real-time rescue tracking for animals reported from your device.
            </p>
          </div>
          <span className="text-xs font-mono text-slate-400">
            {reports.length} {reports.length === 1 ? 'RECORD' : 'RECORDS'}
          </span>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-500 flex flex-col items-center justify-center space-y-3">
            <svg className="animate-spin h-6 w-6 text-[#143627]" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            <span className="text-xs font-mono uppercase tracking-wider text-slate-500">
              Synchronizing incident logs...
            </span>
          </div>
        ) : reports.length === 0 ? (
          <div className="py-16 px-4 text-center max-w-md mx-auto space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-[#F6F4EE] border border-[#E5E2D6] flex items-center justify-center text-2xl mx-auto text-[#143627]">
              🐾
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold text-[#143627]">
                No Incident Dispatches Recorded
              </h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed font-sans">
                You haven't submitted any animal distress reports yet. When you notice an injured or abandoned stray, submit a dispatch to notify nearby rescue sanctuaries.
              </p>
            </div>
            <div className="pt-2">
              <Link
                to="/citizen/reports/create"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#D9480F] hover:bg-[#C23E0A] text-white font-mono font-bold text-xs uppercase tracking-wider shadow-sm transition-colors"
              >
                <span>+ Report First Incident</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-[#EFECE3]">
            {reports.map((report) => {
              const primaryImage = report.images?.find((img) => img.is_primary)?.image || report.images?.[0]?.image;

              return (
                <div
                  key={report.id}
                  className="p-5 sm:p-6 hover:bg-[#FAF9F5] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                >
                  <div className="flex items-start gap-4 sm:gap-5 min-w-0">
                    {/* Prominent animal thumbnail */}
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl border border-[#E5E2D6] overflow-hidden bg-[#F6F4EE] shrink-0 flex items-center justify-center relative shadow-2xs group-hover:border-[#143627] transition-all">
                      {primaryImage ? (
                        <img
                          src={primaryImage}
                          alt={report.animal?.species || 'Animal'}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="text-center p-2 text-slate-400 font-mono text-[10px]">
                          <span className="text-2xl block mb-0.5">🐾</span>
                          <span>No Photo</span>
                        </div>
                      )}
                      {report.images && report.images.length > 1 && (
                        <span className="absolute bottom-1.5 right-1.5 bg-[#143627]/80 text-white font-mono text-[9px] px-1.5 py-0.5 rounded backdrop-blur-xs">
                          +{report.images.length - 1}
                        </span>
                      )}
                    </div>

                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold text-[#143627] bg-[#FAF9F5] px-2 py-0.5 rounded border border-[#E5E2D6]">
                          #REP-{String(report.id).padStart(4, '0')}
                        </span>
                        <span className="font-serif font-bold text-slate-900 text-base sm:text-lg">
                          {report.animal?.species || 'Animal'}
                          {report.animal?.breed ? ` • ${report.animal.breed}` : ''}
                        </span>
                        <FieldBadge status={report.status} />
                        <RescueSignal urgency={report.urgency} variant="compact" />
                      </div>

                      <p className="text-xs text-slate-700 line-clamp-2 max-w-2xl font-sans leading-relaxed">
                        {report.description}
                      </p>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-mono text-slate-500 pt-1">
                        {report.address && (
                          <span className="flex items-center gap-1 text-slate-800 font-medium">
                            <span>📍</span>
                            <span className="truncate max-w-xs">{report.address}</span>
                          </span>
                        )}
                        {report.location && (
                          <span className="text-slate-400">
                            {Number(report.location.latitude).toFixed(4)}°N, {Number(report.location.longitude).toFixed(4)}°E
                          </span>
                        )}
                        <span className="text-slate-400">
                          {new Date(report.reported_at).toLocaleDateString()} • {new Date(report.reported_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#EFECE3]">
                    <Link
                      to={`/citizen/reports/${report.id}`}
                      className="px-4 py-2 rounded-xl bg-white group-hover:bg-[#143627] text-slate-700 group-hover:text-white border border-[#D5D1C3] group-hover:border-[#143627] text-xs font-mono uppercase tracking-wider font-semibold transition-all inline-flex items-center gap-1.5 shadow-2xs"
                    >
                      <span>Track Dispatch</span>
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

export default CitizenDashboard;
