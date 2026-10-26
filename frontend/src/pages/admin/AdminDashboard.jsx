import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { fetchReportsApi, closeReportApi, verifyReportApi } from '../../api/reports';
import {
  fetchAdminNGOsApi,
  verifyNGOApi,
  rejectNGOApi,
  suspendNGOApi,
} from '../../api/admin';
import FieldHeader from '../../components/FieldHeader';
import FieldStat from '../../components/FieldStat';
import FieldBadge from '../../components/FieldBadge';
import RescueSignal from '../../components/RescueSignal';

const AdminDashboard = () => {
  const { user } = useAuth();

  // Active Navigation Tab: 'reports' | 'ngos' | 'api'
  const [activeTab, setActiveTab] = useState('reports');

  // Reports state
  const [reports, setReports] = useState([]);
  const [reportsLoading, setReportsLoading] = useState(true);
  const [reportsError, setReportsError] = useState(null);
  const [reportStatusFilter, setReportStatusFilter] = useState('ALL');
  const [reportSearchQuery, setReportSearchQuery] = useState('');

  // NGOs state
  const [ngos, setNgos] = useState([]);
  const [ngosLoading, setNgosLoading] = useState(true);
  const [ngosError, setNgosError] = useState(null);
  const [ngoStatusFilter, setNgoStatusFilter] = useState('ALL');
  const [ngoSearchQuery, setNgoSearchQuery] = useState('');

  // Actions & Modals state
  const [actionMessage, setActionMessage] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [verifyReportModal, setVerifyReportModal] = useState(null);
  const [verifyComment, setVerifyComment] = useState('');
  const [closeComment, setCloseComment] = useState('');
  const [confirmModal, setConfirmModal] = useState(null); // { title, message, onConfirm, confirmText, confirmClass }

  const loadReports = useCallback(async () => {
    try {
      setReportsLoading(true);
      setReportsError(null);
      const data = await fetchReportsApi();
      setReports(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load reports:', err);
      setReportsError(err.response?.data?.detail || 'Failed to fetch platform reports.');
    } finally {
      setReportsLoading(false);
    }
  }, []);

  const loadNGOs = useCallback(async () => {
    try {
      setNgosLoading(true);
      setNgosError(null);
      const data = await fetchAdminNGOsApi();
      setNgos(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load NGOs:', err);
      setNgosError(err.response?.data?.detail || 'Failed to fetch NGO profile applications.');
    } finally {
      setNgosLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReports();
    loadNGOs();
  }, [loadReports, loadNGOs]);

  // Report Actions
  const handleVerifyReport = async () => {
    if (!verifyReportModal) return;
    try {
      setActionLoading(true);
      setActionMessage(null);
      await verifyReportApi(verifyReportModal.id, verifyComment);
      setActionMessage({ type: 'success', text: `Report #REP-${String(verifyReportModal.id).padStart(4, '0')} verified successfully.` });
      setVerifyReportModal(null);
      setVerifyComment('');
      await loadReports();
    } catch (err) {
      console.error('Failed to verify report:', err);
      setActionMessage({
        type: 'error',
        text: err.response?.data?.detail || 'Failed to verify report.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCloseReport = async (reportId) => {
    try {
      setActionLoading(true);
      setActionMessage(null);
      await closeReportApi(reportId, closeComment);
      setActionMessage({ type: 'success', text: `Report #REP-${String(reportId).padStart(4, '0')} closed successfully.` });
      setCloseComment('');
      await loadReports();
    } catch (err) {
      console.error('Failed to close report:', err);
      setActionMessage({
        type: 'error',
        text: err.response?.data?.detail || 'Failed to close report.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  // NGO Actions
  const executeVerifyNGO = async (ngoId) => {
    try {
      setActionLoading(true);
      setActionMessage(null);
      await verifyNGOApi(ngoId);
      setActionMessage({ type: 'success', text: `NGO application #${ngoId} verified successfully!` });
      setConfirmModal(null);
      await loadNGOs();
    } catch (err) {
      console.error('Failed to verify NGO:', err);
      setActionMessage({
        type: 'error',
        text: err.response?.data?.detail || 'Failed to verify NGO application.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const executeRejectNGO = async (ngoId) => {
    try {
      setActionLoading(true);
      setActionMessage(null);
      await rejectNGOApi(ngoId);
      setActionMessage({ type: 'success', text: `NGO application #${ngoId} rejected.` });
      setConfirmModal(null);
      await loadNGOs();
    } catch (err) {
      console.error('Failed to reject NGO:', err);
      setActionMessage({
        type: 'error',
        text: err.response?.data?.detail || 'Failed to reject NGO application.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const executeSuspendNGO = async (ngoId) => {
    try {
      setActionLoading(true);
      setActionMessage(null);
      await suspendNGOApi(ngoId);
      setActionMessage({ type: 'success', text: `NGO #${ngoId} has been suspended.` });
      setConfirmModal(null);
      await loadNGOs();
    } catch (err) {
      console.error('Failed to suspend NGO:', err);
      setActionMessage({
        type: 'error',
        text: err.response?.data?.detail || 'Failed to suspend NGO profile.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Statistics
  const pendingVerificationCount = reports.filter((r) => r.status === 'REPORTED').length;
  const activeRescuesCount = reports.filter((r) => r.status === 'CLAIMED' || r.status === 'IN_PROGRESS').length;
  const pendingNGOsCount = ngos.filter((n) => n.verification_status === 'PENDING').length;
  const verifiedNGOsCount = ngos.filter((n) => n.verification_status === 'VERIFIED').length;

  // Filtered Lists
  const filteredReports = reports.filter((r) => {
    const matchesStatus =
      reportStatusFilter === 'ALL' ||
      (reportStatusFilter === 'REPORTED' && r.status === 'REPORTED') ||
      (reportStatusFilter === 'ACTIVE' && (r.status === 'CLAIMED' || r.status === 'IN_PROGRESS')) ||
      (reportStatusFilter === 'RESCUED' && r.status === 'RESCUED') ||
      (reportStatusFilter === 'CLOSED' && r.status === 'CLOSED');

    const query = reportSearchQuery.toLowerCase().trim();
    const matchesSearch =
      !query ||
      r.id.toString().includes(query) ||
      r.animal?.species?.toLowerCase().includes(query) ||
      r.animal?.breed?.toLowerCase().includes(query) ||
      r.reporter?.email?.toLowerCase().includes(query) ||
      r.description?.toLowerCase().includes(query) ||
      r.address?.toLowerCase().includes(query);

    return matchesStatus && matchesSearch;
  });

  const filteredNGOs = ngos.filter((n) => {
    const matchesStatus =
      ngoStatusFilter === 'ALL' || n.verification_status === ngoStatusFilter;

    const query = ngoSearchQuery.toLowerCase().trim();
    const matchesSearch =
      !query ||
      n.id.toString().includes(query) ||
      n.organization_name?.toLowerCase().includes(query) ||
      n.email?.toLowerCase().includes(query) ||
      n.phone?.includes(query) ||
      n.address?.toLowerCase().includes(query);

    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6 sm:space-y-8 pb-12">
      <FieldHeader
        badge="CENTRAL FIELD CONTROL // ROOT"
        title="Command & Moderation Center"
        subtitle={`System operator: ${user?.email}. Review incoming citizen dispatches, approve registered rescue sanctuaries, and monitor platform integrity.`}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                loadReports();
                loadNGOs();
              }}
              className="px-3.5 py-2 rounded-xl bg-white hover:bg-[#F6F4EE] border border-[#D5D1C3] text-xs font-mono uppercase tracking-wider text-slate-700 font-semibold transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <span>🔄</span>
              <span>Sync All Registers</span>
            </button>
            <a
              href="http://localhost:8000/admin/"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2 rounded-xl bg-[#143627] hover:bg-[#1B4532] text-white text-xs font-mono uppercase tracking-wider font-semibold transition-colors flex items-center gap-1 shadow-2xs"
            >
              <span>Django Admin</span>
              <span className="text-[10px]">↗</span>
            </a>
          </div>
        }
      />

      {/* Operational Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <FieldStat
          label="Pending Verification"
          value={pendingVerificationCount}
          subtext="Requires admin review"
          icon="⏳"
          highlight={pendingVerificationCount > 0 ? 'vermilion' : 'default'}
        />
        <FieldStat
          label="Active Field Operations"
          value={activeRescuesCount}
          subtext="Claimed or in progress"
          icon="🚑"
          highlight="amber"
        />
        <FieldStat
          label="Pending Sanctuaries"
          value={pendingNGOsCount}
          subtext="Awaiting organization check"
          icon="📋"
          highlight={pendingNGOsCount > 0 ? 'amber' : 'default'}
        />
        <FieldStat
          label="Verified Responders"
          value={verifiedNGOsCount}
          subtext="Active in operating radius"
          icon="🌿"
          highlight="forest"
        />
      </div>

      {actionMessage && (
        <div
          className={`p-4 rounded-xl border text-xs font-mono flex items-center justify-between ${
            actionMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
              : 'bg-rose-50 border-rose-300 text-rose-950'
          }`}
        >
          <div className="flex items-center gap-2">
            <span>{actionMessage.type === 'success' ? '✓' : '⚠️'}</span>
            <span>{actionMessage.text}</span>
          </div>
          <button
            onClick={() => setActionMessage(null)}
            className="text-slate-500 hover:text-slate-900 font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Segmented Tab Navigation */}
      <div className="border-b border-[#E5E2D6] pb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex p-1 bg-[#F4F1EA] rounded-xl border border-[#E5E2D6] gap-1">
          <button
            onClick={() => setActiveTab('reports')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-mono uppercase tracking-wider font-semibold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'reports'
                ? 'bg-white text-[#143627] shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Incident Manifests</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono leading-none ${
                pendingVerificationCount > 0
                  ? 'bg-rose-100 text-rose-800 font-bold'
                  : 'bg-slate-200/70 text-slate-700'
              }`}
            >
              {reports.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('ngos')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-mono uppercase tracking-wider font-semibold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'ngos'
                ? 'bg-white text-[#143627] shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>NGO Sanctuaries</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono leading-none ${
                pendingNGOsCount > 0
                  ? 'bg-amber-100 text-amber-900 font-bold'
                  : 'bg-slate-200/70 text-slate-700'
              }`}
            >
              {ngos.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('api')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-mono uppercase tracking-wider font-semibold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'api'
                ? 'bg-white text-[#143627] shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>API Telemetry</span>
          </button>
        </div>

        <div className="text-[11px] font-mono text-slate-500">
          Field Status: <span className="font-bold text-[#143627]">ONLINE</span> • Root Mode Active
        </div>
      </div>

      {/* TAB 1: REPORTS MODERATION */}
      {activeTab === 'reports' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="bg-white border border-[#E5E2D6] rounded-2xl p-3.5 sm:p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
              <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500 mr-1 hidden sm:inline">
                Status:
              </span>
              {['ALL', 'REPORTED', 'ACTIVE', 'RESCUED', 'CLOSED'].map((filterKey) => (
                <button
                  key={filterKey}
                  onClick={() => setReportStatusFilter(filterKey)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-mono uppercase tracking-wider transition-all cursor-pointer ${
                    reportStatusFilter === filterKey
                      ? 'bg-[#143627] text-white font-bold'
                      : 'bg-[#FAF9F5] text-slate-700 border border-[#E5E2D6] hover:bg-[#F4F3EB]'
                  }`}
                >
                  {filterKey}
                </button>
              ))}
            </div>

            <div className="w-full sm:w-72 relative">
              <input
                type="text"
                placeholder="Search species, id, reporter..."
                value={reportSearchQuery}
                onChange={(e) => setReportSearchQuery(e.target.value)}
                className="w-full bg-[#FAF9F5] border border-[#D5D1C3] rounded-xl px-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#143627] font-sans"
              />
              {reportSearchQuery && (
                <button
                  onClick={() => setReportSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 text-xs cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {reportsError && (
            <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-rose-950 text-xs font-mono flex items-center gap-2">
              <span>⚠️</span>
              <span>{reportsError}</span>
            </div>
          )}

          {/* Reports Table */}
          <div className="bg-white border border-[#E5E2D6] rounded-2xl shadow-xs overflow-hidden">
            {reportsLoading ? (
              <div className="py-16 text-center text-slate-500 flex flex-col items-center justify-center space-y-2">
                <svg className="animate-spin h-6 w-6 text-[#143627]" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <span className="text-xs font-mono uppercase tracking-wider">
                  Loading incident manifests...
                </span>
              </div>
            ) : filteredReports.length === 0 ? (
              <div className="py-16 text-center text-slate-500 space-y-2">
                <div className="text-3xl">📋</div>
                <h4 className="font-serif text-base font-bold text-slate-800">
                  No Matching Reports
                </h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto font-sans">
                  No reports correspond to status '{reportStatusFilter}' and query '{reportSearchQuery}'.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#FAF9F5] border-b border-[#E5E2D6] font-mono text-[11px] text-slate-600 uppercase tracking-wider">
                      <th className="py-3 px-4 font-semibold">Incident ID</th>
                      <th className="py-3 px-4 font-semibold">Animal Specimen</th>
                      <th className="py-3 px-4 font-semibold">Urgency</th>
                      <th className="py-3 px-4 font-semibold">Status</th>
                      <th className="py-3 px-4 font-semibold">Reporter</th>
                      <th className="py-3 px-4 font-semibold">Date</th>
                      <th className="py-3 px-4 font-semibold text-right">Moderation Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EFECE3] font-sans">
                    {filteredReports.map((report) => {
                      const primaryImage =
                        report.images?.find((img) => img.is_primary)?.image ||
                        report.images?.[0]?.image ||
                        report.image_url;

                      return (
                        <tr
                          key={report.id}
                          className="hover:bg-[#FAF9F5]/70 transition-colors group"
                        >
                          <td className="py-3 px-4 font-mono font-bold text-[#143627] whitespace-nowrap">
                            <Link
                              to={`/reports/${report.id}`}
                              className="hover:underline flex items-center gap-1"
                            >
                              <span>#REP-{String(report.id).padStart(4, '0')}</span>
                              <span className="text-[10px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                ↗
                              </span>
                            </Link>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg border border-[#E5E2D6] overflow-hidden bg-[#F6F4EE] shrink-0 flex items-center justify-center">
                                {primaryImage ? (
                                  <img
                                    src={primaryImage}
                                    alt={report.animal?.species || 'Animal'}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <span className="text-base text-slate-400">🐾</span>
                                )}
                              </div>
                              <div className="min-w-0">
                                <span className="font-bold text-slate-900 block font-serif text-sm leading-snug">
                                  {report.animal?.species || 'Animal'}
                                  {report.animal?.breed && (
                                    <span className="font-sans font-normal text-slate-500 text-xs ml-1.5">
                                      ({report.animal.breed})
                                    </span>
                                  )}
                                </span>
                                <span className="text-[11px] text-slate-500 truncate max-w-xs block font-sans">
                                  {report.description}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <RescueSignal urgency={report.urgency} variant="compact" />
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <FieldBadge status={report.status} />
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-700 whitespace-nowrap">
                            <div className="text-[11px]">{report.reporter?.email}</div>
                            {report.address && (
                              <div className="text-[10px] text-slate-400 truncate max-w-[160px] font-sans">
                                {report.address}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-500 text-[11px] whitespace-nowrap">
                            {new Date(report.reported_at).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap space-x-1.5">
                            {report.status === 'REPORTED' && (
                              <button
                                onClick={() => {
                                  setVerifyReportModal(report);
                                  setVerifyComment('');
                                }}
                                className="px-2.5 py-1 rounded bg-[#143627] hover:bg-[#1B4532] text-white font-mono text-[11px] font-bold uppercase tracking-wider transition-colors cursor-pointer inline-flex items-center gap-1 shadow-2xs"
                              >
                                <span>✓</span>
                                <span>Verify</span>
                              </button>
                            )}
                            {report.status === 'RESCUED' && (
                              <button
                                onClick={() => handleCloseReport(report.id)}
                                className="px-2.5 py-1 rounded bg-slate-700 hover:bg-slate-800 text-white font-mono text-[11px] font-bold uppercase tracking-wider transition-colors cursor-pointer shadow-2xs"
                              >
                                Archive & Close
                              </button>
                            )}
                            <Link
                              to={`/reports/${report.id}`}
                              className="px-2.5 py-1 rounded bg-[#FAF9F5] hover:bg-[#F4F3EB] text-slate-700 border border-[#D5D1C3] font-mono text-[11px] font-medium uppercase tracking-wider transition-colors inline-block"
                            >
                              Dossier
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: NGO APPLICATION MODERATION */}
      {activeTab === 'ngos' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="bg-white border border-[#E5E2D6] rounded-2xl p-3.5 sm:p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
              <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500 mr-1 hidden sm:inline">
                Status:
              </span>
              {['ALL', 'PENDING', 'VERIFIED', 'REJECTED', 'SUSPENDED'].map((filterKey) => (
                <button
                  key={filterKey}
                  onClick={() => setNgoStatusFilter(filterKey)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-mono uppercase tracking-wider transition-all cursor-pointer ${
                    ngoStatusFilter === filterKey
                      ? 'bg-[#143627] text-white font-bold'
                      : 'bg-[#FAF9F5] text-slate-700 border border-[#E5E2D6] hover:bg-[#F4F3EB]'
                  }`}
                >
                  {filterKey}
                </button>
              ))}
            </div>

            <div className="w-full sm:w-72 relative">
              <input
                type="text"
                placeholder="Search NGO name, email, phone..."
                value={ngoSearchQuery}
                onChange={(e) => setNgoSearchQuery(e.target.value)}
                className="w-full bg-[#FAF9F5] border border-[#D5D1C3] rounded-xl px-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#143627] font-sans"
              />
              {ngoSearchQuery && (
                <button
                  onClick={() => setNgoSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 text-xs cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {ngosError && (
            <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-rose-950 text-xs font-mono flex items-center gap-2">
              <span>⚠️</span>
              <span>{ngosError}</span>
            </div>
          )}

          {/* NGOs Table */}
          <div className="bg-white border border-[#E5E2D6] rounded-2xl shadow-xs overflow-hidden">
            {ngosLoading ? (
              <div className="py-16 text-center text-slate-500 flex flex-col items-center justify-center space-y-2">
                <svg className="animate-spin h-6 w-6 text-[#143627]" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <span className="text-xs font-mono uppercase tracking-wider">
                  Loading sanctuary profiles...
                </span>
              </div>
            ) : filteredNGOs.length === 0 ? (
              <div className="py-16 text-center text-slate-500 space-y-2">
                <div className="text-3xl">🌿</div>
                <h4 className="font-serif text-base font-bold text-slate-800">
                  No Matching Sanctuary Profiles
                </h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto font-sans">
                  No NGO registrations found matching status '{ngoStatusFilter}' and search '{ngoSearchQuery}'.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#FAF9F5] border-b border-[#E5E2D6] font-mono text-[11px] text-slate-600 uppercase tracking-wider">
                      <th className="py-3 px-4 font-semibold">ID</th>
                      <th className="py-3 px-4 font-semibold">Organization Sanctuary</th>
                      <th className="py-3 px-4 font-semibold">Contact & Phone</th>
                      <th className="py-3 px-4 font-semibold">Operating Radius</th>
                      <th className="py-3 px-4 font-semibold">Verification State</th>
                      <th className="py-3 px-4 font-semibold">Enrolled</th>
                      <th className="py-3 px-4 font-semibold text-right">Sanctuary Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EFECE3] font-sans">
                    {filteredNGOs.map((ngo) => (
                      <tr key={ngo.id} className="hover:bg-[#FAF9F5]/70 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-[#143627] whitespace-nowrap">
                          #NGO-{String(ngo.id).padStart(3, '0')}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-start gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-200 text-[#143627] flex items-center justify-center font-serif font-bold text-xs shrink-0 mt-0.5">
                              {ngo.organization_name?.charAt(0) || 'N'}
                            </div>
                            <div className="min-w-0">
                              <span className="font-bold text-slate-900 block font-serif text-sm">
                                {ngo.organization_name}
                              </span>
                              <span className="text-[11px] text-slate-500 block truncate max-w-xs font-sans">
                                {ngo.address}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] whitespace-nowrap">
                          <div className="text-slate-900 font-semibold">{ngo.email}</div>
                          <div className="text-slate-500">{ngo.phone}</div>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-[#143627] whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded-md bg-[#FAF9F5] border border-[#E5E2D6]">
                            {ngo.operating_radius_km} km
                          </span>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <FieldBadge status={ngo.verification_status} />
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-500 text-[11px] whitespace-nowrap">
                          {new Date(ngo.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap space-x-1.5">
                          {ngo.verification_status === 'PENDING' && (
                            <>
                              <button
                                onClick={() =>
                                  setConfirmModal({
                                    title: 'Approve & Verify NGO Sanctuary',
                                    message: `Are you sure you want to verify '${ngo.organization_name}'? This permits them to discover and claim animal rescue cases within their ${ngo.operating_radius_km}km operating radius.`,
                                    confirmText: 'Verify Sanctuary',
                                    confirmClass: 'bg-[#143627] hover:bg-[#1B4532]',
                                    onConfirm: () => executeVerifyNGO(ngo.id),
                                  })
                                }
                                className="px-2.5 py-1 rounded bg-[#143627] hover:bg-[#1B4532] text-white font-mono text-[11px] font-bold uppercase tracking-wider transition-colors cursor-pointer shadow-2xs"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() =>
                                  setConfirmModal({
                                    title: 'Reject NGO Application',
                                    message: `Are you sure you want to reject the application for '${ngo.organization_name}'?`,
                                    confirmText: 'Reject Application',
                                    confirmClass: 'bg-rose-700 hover:bg-rose-800',
                                    onConfirm: () => executeRejectNGO(ngo.id),
                                  })
                                }
                                className="px-2.5 py-1 rounded bg-rose-50 text-rose-800 border border-rose-300 hover:bg-rose-100 font-mono text-[11px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
                              >
                                Reject
                              </button>
                            </>
                          )}

                          {ngo.verification_status === 'VERIFIED' && (
                            <button
                              onClick={() =>
                                setConfirmModal({
                                  title: 'Suspend NGO Operations',
                                  message: `Are you sure you want to suspend '${ngo.organization_name}'? This will immediately revoke their ability to discover or claim new cases.`,
                                  confirmText: 'Suspend Responder',
                                  confirmClass: 'bg-rose-700 hover:bg-rose-800',
                                  onConfirm: () => executeSuspendNGO(ngo.id),
                                })
                              }
                              className="px-2.5 py-1 rounded bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-300 font-mono text-[11px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
                            >
                              Suspend
                            </button>
                          )}

                          {ngo.verification_status === 'SUSPENDED' && (
                            <button
                              onClick={() =>
                                setConfirmModal({
                                  title: 'Re-Verify Suspended Sanctuary',
                                  message: `Re-verify '${ngo.organization_name}' to reinstate case discovery privileges?`,
                                  confirmText: 'Re-Verify',
                                  confirmClass: 'bg-[#143627] hover:bg-[#1B4532]',
                                  onConfirm: () => executeVerifyNGO(ngo.id),
                                })
                              }
                              className="px-2.5 py-1 rounded bg-emerald-50 text-emerald-950 border border-emerald-300 hover:bg-emerald-100 font-mono text-[11px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
                            >
                              Re-Verify
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: API ARCHITECTURE REFERENCE */}
      {activeTab === 'api' && (
        <div className="bg-white border border-[#E5E2D6] rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
          <div className="border-b border-[#EFECE3] pb-3">
            <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500 block">
              SYSTEM ARCHITECTURE
            </span>
            <h3 className="font-serif text-xl font-bold text-[#143627]">
              Administrative REST API Endpoints
            </h3>
          </div>

          <div className="space-y-4 font-mono text-xs">
            <div className="p-4 rounded-xl bg-[#FAF9F5] border border-[#E5E2D6] space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-900 font-bold">GET</span>
                <span className="text-slate-900 font-bold">/api/admin/ngos/</span>
              </div>
              <p className="text-slate-600 font-sans text-xs pt-1">
                Lists all registered NGO profiles. Supports status filtering via <code className="bg-slate-200 px-1 py-0.5 rounded text-[11px]">?status=PENDING|VERIFIED|REJECTED|SUSPENDED</code>.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#FAF9F5] border border-[#E5E2D6] space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-950 font-bold">POST</span>
                <span className="text-slate-900 font-bold">/api/admin/ngos/&lt;id&gt;/verify/</span>
              </div>
              <p className="text-slate-600 font-sans text-xs pt-1">
                Verifies an eligible pending NGO profile and stamps <code className="bg-slate-200 px-1 py-0.5 rounded text-[11px]">verified_at</code> timestamp.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#FAF9F5] border border-[#E5E2D6] space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-950 font-bold">POST</span>
                <span className="text-slate-900 font-bold">/api/reports/&lt;report_id&gt;/verify/</span>
              </div>
              <p className="text-slate-600 font-sans text-xs pt-1">
                Verifies animal rescue reports (<code className="bg-slate-200 px-1 py-0.5 rounded text-[11px]">REPORTED → VERIFIED</code>) and creates audit trail in <code className="bg-slate-200 px-1 py-0.5 rounded text-[11px]">ReportStatusHistory</code>.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Verification Modal for Reports */}
      {verifyReportModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-[#101814]/70 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setVerifyReportModal(null);
          }}
        >
          <div className="bg-white border border-[#E5E2D6] rounded-2xl max-w-md w-full p-6 sm:p-8 space-y-4 shadow-2xl">
            <h3 className="font-serif text-xl font-bold text-[#143627]">
              Verify Incident #REP-{String(verifyReportModal.id).padStart(4, '0')}
            </h3>
            <p className="text-xs text-slate-600 font-sans leading-relaxed">
              Verifying this incident confirms that it is an authentic animal distress call and broadcasts it to nearby verified NGO radars.
            </p>
            <div>
              <label className="block text-xs font-mono font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                Moderation Log Note (Optional)
              </label>
              <textarea
                rows={3}
                value={verifyComment}
                onChange={(e) => setVerifyComment(e.target.value)}
                placeholder="e.g. Photo checked, confirmed leg fracture, verified by phone..."
                className="w-full bg-[#FAF9F5] border border-[#D5D1C3] rounded-xl p-3 text-slate-900 text-xs focus:outline-none focus:border-[#143627] font-sans"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setVerifyReportModal(null)}
                className="px-4 py-2 text-xs font-mono uppercase tracking-wider text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleVerifyReport}
                disabled={actionLoading}
                className="px-5 py-2.5 rounded-xl bg-[#143627] hover:bg-[#1B4532] text-white font-mono font-bold text-xs uppercase tracking-wider shadow-sm transition-colors cursor-pointer disabled:opacity-50"
              >
                {actionLoading ? 'Verifying...' : 'Confirm Verification →'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for NGO Actions */}
      {confirmModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-[#101814]/70 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setConfirmModal(null);
          }}
        >
          <div className="bg-white border border-[#E5E2D6] rounded-2xl max-w-md w-full p-6 sm:p-8 space-y-4 shadow-2xl">
            <h3 className="font-serif text-xl font-bold text-[#143627]">
              {confirmModal.title}
            </h3>
            <p className="text-xs text-slate-600 font-sans leading-relaxed">
              {confirmModal.message}
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2 text-xs font-mono uppercase tracking-wider text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmModal.onConfirm}
                className={`px-5 py-2.5 rounded-xl text-white font-mono font-bold text-xs uppercase tracking-wider shadow-sm transition-colors cursor-pointer ${confirmModal.confirmClass}`}
              >
                {confirmModal.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
