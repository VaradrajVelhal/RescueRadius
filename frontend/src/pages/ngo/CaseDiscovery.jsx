import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { fetchDiscoverReportsApi, claimReportApi } from '../../api/ngo';
import { useAuth } from '../../context/AuthContext';
import FieldHeader from '../../components/FieldHeader';
import RescueSignal from '../../components/RescueSignal';
import RescueRadiusEmblem from '../../components/RescueRadiusEmblem';

const URGENCY_COLORS = {
  CRITICAL: { pin: '#D92626', ring: '#FFA8A8', text: '#720909' },
  HIGH: { pin: '#E8590C', ring: '#FFD8A8', text: '#7D2D00' },
  MEDIUM: { pin: '#C67D0A', ring: '#FFE8A8', text: '#693E00' },
  LOW: { pin: '#2B7A53', ring: '#C7DECFA', text: '#0E3B24' },
};

const createAtlasMarkerIcon = (urgency = 'MEDIUM', isSelected = false) => {
  const color = URGENCY_COLORS[urgency] || URGENCY_COLORS.MEDIUM;

  const html = `
    <div style="
      position: relative;
      width: ${isSelected ? '38px' : '30px'};
      height: ${isSelected ? '38px' : '30px'};
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
      transform: translate(-50%, -50%);
    ">
      <div style="
        position: absolute;
        inset: -4px;
        border-radius: 50%;
        border: ${isSelected ? '2.5px solid ' + color.pin : '2px dashed ' + color.pin};
        opacity: ${isSelected ? '0.95' : '0.4'};
        background-color: ${isSelected ? color.ring + '40' : 'transparent'};
      "></div>
      <div style="
        width: 100%;
        height: 100%;
        border-radius: 50%;
        background-color: ${color.pin};
        border: 2.5px solid #FFFFFF;
        box-shadow: 0 4px 14px rgba(20, 54, 39, 0.4);
        display: flex;
        align-items: center;
        justify-content: center;
        color: #FFFFFF;
        font-family: 'JetBrains Mono', monospace;
        font-weight: 700;
        font-size: ${isSelected ? '12px' : '10px'};
      ">
        📍
      </div>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-map-marker',
    iconSize: [38, 38],
    iconAnchor: [0, 0],
    popupAnchor: [0, -20],
  });
};

// Component to dynamically fit map bounds to markers or center on selected report
const MapController = ({ reports, selectedReport }) => {
  const map = useMap();

  useEffect(() => {
    if (selectedReport?.location?.latitude && selectedReport?.location?.longitude) {
      map.setView([selectedReport.location.latitude, selectedReport.location.longitude], 15, {
        animate: true,
      });
      return;
    }

    if (reports.length > 0) {
      const validCoords = reports
        .filter((r) => r.location?.latitude && r.location?.longitude)
        .map((r) => [r.location.latitude, r.location.longitude]);

      if (validCoords.length > 0) {
        const bounds = L.latLngBounds(validCoords);
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
      }
    }
  }, [reports, selectedReport, map]);

  return null;
};

const CaseDiscovery = () => {
  const { user } = useAuth();
  const ngoProfile = user?.ngo_profile;

  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isPermissionRestricted, setIsPermissionRestricted] = useState(false);
  const [urgencyFilter, setUrgencyFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('DISTANCE'); // 'DISTANCE' | 'URGENCY'
  const [selectedReport, setSelectedReport] = useState(null);

  // Claim modal state
  const [claimingReport, setClaimingReport] = useState(null);
  const [claiming, setClaiming] = useState(false);
  const [claimSuccess, setClaimSuccess] = useState('');
  const [claimError, setClaimError] = useState('');

  const isVerified = ngoProfile?.verification_status === 'VERIFIED';

  const loadReports = useCallback(async () => {
    if (!isVerified) {
      setReports([]);
      setLoading(false);
      setIsPermissionRestricted(true);
      setError('Your organization profile must be verified by Field Control before accessing discovery radar.');
      return;
    }

    setLoading(true);
    setError('');
    setIsPermissionRestricted(false);
    try {
      const data = await fetchDiscoverReportsApi();
      setReports(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Fetch discovery reports error:', err);
      const is403 = err.response?.status === 403;
      if (is403) {
        setIsPermissionRestricted(true);
      }
      setError(
        err.response?.data?.detail ||
          'Failed to load nearby rescue cases. Ensure your organization profile is verified by Field Control.'
      );
    } finally {
      setLoading(false);
    }
  }, [isVerified]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const handleClaimSubmit = async () => {
    if (!claimingReport) return;
    setClaiming(true);
    setClaimError('');
    setClaimSuccess('');

    try {
      await claimReportApi(claimingReport.id);
      setClaimSuccess(`Report #REP-${String(claimingReport.id).padStart(4, '0')} assigned to your organization!`);
      setTimeout(() => {
        setClaimingReport(null);
        setClaimSuccess('');
        loadReports();
      }, 1400);
    } catch (err) {
      console.error('Claim report error:', err);
      setClaimError(
        err.response?.data?.detail || 'Failed to claim case. It may have already been claimed by another responder.'
      );
    } finally {
      setClaiming(false);
    }
  };

  // Filter & Sort
  const filteredReports = reports.filter((r) => {
    if (urgencyFilter !== 'ALL' && r.urgency !== urgencyFilter) return false;
    return true;
  });

  const urgencyPriority = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };

  filteredReports.sort((a, b) => {
    if (sortBy === 'URGENCY') {
      const prioA = urgencyPriority[a.urgency] || 0;
      const prioB = urgencyPriority[b.urgency] || 0;
      if (prioB !== prioA) return prioB - prioA;
    }
    const distA = a.distance_meters ?? Infinity;
    const distB = b.distance_meters ?? Infinity;
    return distA - distB;
  });

  const defaultCenter =
    reports.length > 0 && reports[0].location?.latitude && reports[0].location?.longitude
      ? [reports[0].location.latitude, reports[0].location.longitude]
      : [12.9716, 77.5946];

  return (
    <div className="space-y-6 sm:space-y-8 pb-12">
      {/* Signature Header */}
      <FieldHeader
        badge="GEOSPATIAL RADAR DISCOVERY"
        title="Field Atlas Case Discovery"
        subtitle="Verified distress incidents detected within your NGO's operating radius. Inspect spatial coordinates, review photographs, and lock assignments to mobilize responders."
        backTo="/ngo/dashboard"
        backLabel="Back to Dispatch Portal"
        actions={
          <button
            onClick={loadReports}
            className="px-4 py-2.5 rounded-xl bg-white hover:bg-[#F6F4EE] border border-[#D5D1C3] text-xs font-mono uppercase tracking-wider text-slate-700 font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <span>🔄</span>
            <span>Rescan Radar</span>
          </button>
        }
      />

      {/* Filter & Sorting Controls */}
      <div className="bg-white border border-[#E5E2D6] rounded-2xl p-4 sm:p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        {/* Urgency Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500 mr-1">
            URGENCY:
          </span>
          {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((filterKey) => {
            const isCurrent = urgencyFilter === filterKey;
            const count =
              filterKey === 'ALL'
                ? reports.length
                : reports.filter((r) => r.urgency === filterKey).length;

            return (
              <button
                key={filterKey}
                onClick={() => setUrgencyFilter(filterKey)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                  isCurrent
                    ? 'bg-[#143627] text-white shadow-2xs'
                    : 'bg-[#FAF9F5] hover:bg-[#F4F3EB] text-slate-700 border border-[#E5E2D6]'
                }`}
              >
                <span>{filterKey}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isCurrent ? 'bg-[#1E4935] text-emerald-200' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Sort Controls */}
        <div className="flex items-center gap-2 text-xs font-mono text-slate-600">
          <span className="text-slate-400">SORT BY:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-[#FAF9F5] border border-[#D5D1C3] rounded-lg px-2.5 py-1 text-xs text-slate-900 focus:outline-none focus:border-[#143627]"
          >
            <option value="DISTANCE">Nearest Distance First</option>
            <option value="URGENCY">Highest Urgency First</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-300 rounded-xl text-rose-900 text-xs font-mono flex items-center gap-2">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* Main Spatial Layout: Map + Incident List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Spatial Leaflet Map Container */}
        <div className="lg:col-span-7 bg-white border border-[#E5E2D6] rounded-2xl p-2 shadow-xs overflow-hidden">
          <div className="h-[460px] sm:h-[580px] w-full rounded-xl overflow-hidden relative">
            <MapContainer
              center={defaultCenter}
              zoom={13}
              scrollWheelZoom={true}
              className="h-full w-full z-10"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              <MapController reports={filteredReports} selectedReport={selectedReport} />

              {filteredReports.map((report) => {
                if (!report.location?.latitude || !report.location?.longitude) return null;

                const isSelected = selectedReport?.id === report.id;
                const icon = createAtlasMarkerIcon(report.urgency, isSelected);

                return (
                  <Marker
                    key={report.id}
                    position={[report.location.latitude, report.location.longitude]}
                    icon={icon}
                    eventHandlers={{
                      click: () => {
                        setSelectedReport(report);
                        const card = document.getElementById(`case-card-${report.id}`);
                        if (card) {
                          card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                        }
                      },
                    }}
                  >
                    <Popup className="field-atlas-popup">
                      <div className="p-1 space-y-2 font-sans max-w-[220px]">
                        <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                          <span className="font-mono text-[10px] font-bold text-[#143627]">
                            #REP-{String(report.id).padStart(4, '0')}
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-900 font-bold">
                            {report.distance_km ? `${report.distance_km} km away` : 'Nearby'}
                          </span>
                        </div>

                        <div>
                          <h4 className="font-serif font-bold text-slate-900 text-sm">
                            {report.animal?.species || 'Animal'}
                          </h4>
                          <p className="text-[11px] text-slate-600 line-clamp-2 mt-0.5">
                            {report.description}
                          </p>
                        </div>

                        <button
                          onClick={() => setClaimingReport(report)}
                          className="w-full mt-2 py-1.5 px-3 rounded-lg bg-[#D9480F] hover:bg-[#C23E0A] text-white text-[11px] font-mono font-bold uppercase tracking-wider transition-colors cursor-pointer"
                        >
                          Claim Case Now
                        </button>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>

            {/* Map Legend Overlay */}
            <div className="absolute bottom-3 left-3 z-20 bg-white/95 backdrop-blur-xs border border-[#E5E2D6] rounded-xl px-3 py-2 text-[10px] font-mono shadow-sm hidden sm:flex items-center gap-3">
              <span className="font-bold text-slate-700">BEACON SIGNALS:</span>
              <span className="flex items-center gap-1 text-rose-800">
                <span className="w-2 h-2 rounded-full bg-rose-600" /> Critical
              </span>
              <span className="flex items-center gap-1 text-orange-800">
                <span className="w-2 h-2 rounded-full bg-orange-500" /> High
              </span>
              <span className="flex items-center gap-1 text-amber-800">
                <span className="w-2 h-2 rounded-full bg-amber-500" /> Medium
              </span>
              <span className="flex items-center gap-1 text-emerald-800">
                <span className="w-2 h-2 rounded-full bg-emerald-600" /> Low
              </span>
            </div>
          </div>
        </div>

        {/* Incident Radar List Panel */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-mono uppercase tracking-wider text-slate-500">
              RADAR TARGETS ({filteredReports.length})
            </span>
            <span className="text-[11px] font-mono text-slate-400">
              CLICK TARGET TO LOCATE ON MAP
            </span>
          </div>

          {/* Active Target Quick Dock */}
          {selectedReport && (
            <div className="bg-[#FAF9F5] border border-[#143627] rounded-xl p-3 flex items-center justify-between gap-3 text-xs shadow-2xs">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2 h-2 rounded-full bg-[#D9480F] animate-ping shrink-0" />
                <span className="font-mono font-bold text-[#143627] shrink-0">
                  #REP-{String(selectedReport.id).padStart(4, '0')}
                </span>
                <span className="font-serif font-bold text-slate-900 truncate">
                  {selectedReport.animal?.species}
                </span>
                {selectedReport.distance_km != null && (
                  <span className="text-[10px] font-mono text-emerald-800 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 shrink-0">
                    {selectedReport.distance_km} km
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setClaimingReport(selectedReport)}
                className="px-3 py-1 rounded-lg bg-[#D9480F] hover:bg-[#C23E0A] text-white font-mono text-[11px] font-bold uppercase tracking-wider transition-colors shrink-0 shadow-2xs cursor-pointer"
              >
                Claim Now →
              </button>
            </div>
          )}

          {loading ? (
            <div className="bg-white border border-[#E5E2D6] rounded-2xl p-12 text-center text-slate-500 flex flex-col items-center justify-center space-y-2">
              <svg className="animate-spin h-6 w-6 text-[#143627]" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              <span className="text-xs font-mono uppercase tracking-wider">
                Scanning radius for verified cases...
              </span>
            </div>
          ) : isPermissionRestricted ? (
            <div className="bg-white border border-amber-300 rounded-2xl p-6 sm:p-7 text-center space-y-3 shadow-xs">
              <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-2xl mx-auto text-amber-700">
                ⏳
              </div>
              <h3 className="font-serif text-base font-bold text-[#143627]">
                Radar Access Requires Verified Profile
              </h3>
              <p className="text-xs text-slate-600 font-sans leading-relaxed max-w-sm mx-auto">
                Live radar case discovery and incident claiming are reserved for verified NGO stations. Central Field Control is currently reviewing your organization credentials.
              </p>
              <div className="pt-2">
                <Link
                  to="/ngo/dashboard"
                  className="inline-flex items-center px-4 py-2 bg-[#143627] hover:bg-[#1B4532] text-white font-mono text-xs font-bold uppercase tracking-wider rounded-xl transition-colors"
                >
                  Return to Dispatch Portal
                </Link>
              </div>
            </div>
          ) : filteredReports.length === 0 && reports.length > 0 ? (
            <div className="bg-white border border-[#E5E2D6] rounded-2xl p-8 text-center space-y-3">
              <div className="text-2xl">🔍</div>
              <h3 className="font-serif text-base font-bold text-[#143627]">
                No Cases Match Urgency: {urgencyFilter}
              </h3>
              <p className="text-xs text-slate-600 font-sans leading-relaxed max-w-sm mx-auto">
                There are {reports.length} total active incidents in your radar perimeter. Clear or switch filters to view available cases.
              </p>
              <div className="pt-2">
                <button
                  onClick={() => setUrgencyFilter('ALL')}
                  className="px-3.5 py-1.5 rounded-lg bg-[#143627] text-white text-xs font-mono uppercase tracking-wider font-semibold transition-colors cursor-pointer"
                >
                  Show All {reports.length} Cases
                </button>
              </div>
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="bg-white border border-[#E5E2D6] rounded-2xl p-8 sm:p-10 text-center space-y-3 shadow-2xs">
              <div className="w-12 h-12 rounded-xl bg-[#FAF9F5] border border-[#E5E2D6] flex items-center justify-center mx-auto text-[#143627]">
                <RescueRadiusEmblem size={28} variant="mark" className="text-[#143627]" />
              </div>
              <h3 className="font-serif text-base font-bold text-[#143627]">
                All Clear in Radar Perimeter
              </h3>
              <p className="text-xs text-slate-600 font-sans leading-relaxed max-w-sm mx-auto">
                No verified distress incidents currently match your radius ({ngoProfile?.operating_radius_km || 10} km). Keep station radar open to capture new emergency dispatches.
              </p>
              <div className="pt-2">
                <button
                  onClick={loadReports}
                  className="px-3.5 py-1.5 rounded-lg border border-[#D5D1C3] bg-[#FAF9F5] hover:bg-[#F4F3EB] text-xs font-mono uppercase tracking-wider text-slate-700 transition-colors cursor-pointer"
                >
                  Rescan Radar Horizon
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3 max-h-[580px] overflow-y-auto pr-1">
              {filteredReports.map((report) => {
                const isSelected = selectedReport?.id === report.id;
                const primaryImage =
                  report.images?.find((img) => img.is_primary)?.image || report.images?.[0]?.image;

                return (
                  <div
                    key={report.id}
                    id={`case-card-${report.id}`}
                    onClick={() => setSelectedReport(report)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-amber-50/70 border-amber-400 ring-2 ring-amber-400/40 shadow-xs'
                        : 'bg-white border-[#E5E2D6] hover:bg-[#FAF9F5] hover:border-[#D5D1C3]'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-14 h-14 rounded-lg border border-[#E5E2D6] overflow-hidden bg-[#FAF9F5] shrink-0 flex items-center justify-center">
                        {primaryImage ? (
                          <img
                            src={primaryImage}
                            alt={report.animal?.species || 'Animal'}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-xl">🐾</span>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-xs font-bold text-[#143627]">
                              #REP-{String(report.id).padStart(4, '0')}
                            </span>
                            <span className="font-serif font-bold text-slate-900 text-sm truncate">
                              {report.animal?.species}
                            </span>
                          </div>
                          <RescueSignal urgency={report.urgency} variant="compact" />
                        </div>

                        <p className="text-xs text-slate-600 line-clamp-2 font-sans">
                          {report.description}
                        </p>

                        <div className="mt-2 pt-2 border-t border-[#EFECE3] flex items-center justify-between text-[11px] font-mono">
                          <span className="text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            {report.distance_km != null ? `📏 ${report.distance_km} km` : 'Nearby'}
                          </span>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setClaimingReport(report);
                            }}
                            className="px-3 py-1 rounded-lg bg-[#D9480F] hover:bg-[#C23E0A] text-white font-mono text-[11px] font-bold uppercase tracking-wider transition-colors shadow-2xs cursor-pointer"
                          >
                            Claim Case →
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Claim Confirmation Modal */}
      {claimingReport && (
        <div className="fixed inset-0 z-50 bg-[#101814]/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E5E2D6] rounded-2xl max-w-lg w-full p-6 sm:p-8 space-y-5 shadow-2xl">
            <div className="border-b border-[#EFECE3] pb-3">
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#D9480F] font-bold block mb-1">
                OPERATIONAL LOCK CONFIRMATION
              </span>
              <h3 className="font-serif text-2xl font-bold text-[#143627]">
                Claim Case #REP-{String(claimingReport.id).padStart(4, '0')}
              </h3>
            </div>

            {claimError && (
              <div className="p-3.5 bg-rose-50 border border-rose-300 rounded-xl text-rose-950 text-xs font-mono flex items-center gap-2">
                <span>⚠️</span>
                <span>{claimError}</span>
              </div>
            )}

            {claimSuccess && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-950 text-xs font-mono flex items-center gap-2">
                <span>✓</span>
                <span>{claimSuccess}</span>
              </div>
            )}

            <div className="bg-[#FAF9F5] p-4 rounded-xl border border-[#E5E2D6] space-y-2 text-xs font-sans">
              <div className="flex justify-between">
                <span className="text-slate-500 font-mono">SPECIMEN:</span>
                <span className="font-bold text-slate-900">{claimingReport.animal?.species} ({claimingReport.animal?.breed || 'Unknown'})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-mono">URGENCY SIGNAL:</span>
                <span className="font-bold text-[#D9480F]">{claimingReport.urgency}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-mono">CALCULATED DISTANCE:</span>
                <span className="font-mono font-bold text-slate-900">{claimingReport.distance_km ? `${claimingReport.distance_km} km` : 'In Range'}</span>
              </div>
              {claimingReport.address && (
                <div className="pt-2 border-t border-[#EAE6DA]">
                  <span className="text-slate-500 font-mono block text-[10px]">ADDRESS / LANDMARK:</span>
                  <span className="text-slate-800">{claimingReport.address}</span>
                </div>
              )}
            </div>

            <p className="text-xs text-slate-600 font-sans leading-relaxed">
              Claiming this incident transitions its status from <strong>VERIFIED</strong> to <strong>CLAIMED</strong> and locks assignment exclusively to your NGO organization via atomic database transaction.
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setClaimingReport(null)}
                disabled={claiming}
                className="px-4 py-2 text-xs font-mono uppercase tracking-wider text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClaimSubmit}
                disabled={claiming}
                className="px-6 py-2.5 rounded-xl bg-[#D9480F] hover:bg-[#C23E0A] text-white font-mono font-bold text-xs uppercase tracking-wider shadow-sm transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-2"
              >
                {claiming ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    <span>Locking Assignment...</span>
                  </>
                ) : (
                  <span>Confirm and Claim Case →</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CaseDiscovery;
