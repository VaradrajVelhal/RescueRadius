import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { fetchAssignmentsApi, startRescueApi, completeRescueApi } from '../../api/ngo';
import FieldHeader from '../../components/FieldHeader';
import FieldBadge from '../../components/FieldBadge';
import RescueSignal from '../../components/RescueSignal';
import RescueRadiusEmblem from '../../components/RescueRadiusEmblem';

const AssignmentsList = () => {
  const { user } = useAuth();
  const isVerified = user?.ngo_profile?.verification_status === 'VERIFIED';

  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isPermissionRestricted, setIsPermissionRestricted] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');

  // Rescue Action modal state
  const [actionTarget, setActionTarget] = useState(null); // { assignment, actionType: 'START' | 'COMPLETE' }
  const [comment, setComment] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  const loadAssignments = useCallback(async () => {
    if (!isVerified) {
      setAssignments([]);
      setLoading(false);
      setIsPermissionRestricted(true);
      setError('Your organization profile must be verified by Field Control before accessing assignments.');
      return;
    }

    setLoading(true);
    setError('');
    setIsPermissionRestricted(false);
    try {
      const data = await fetchAssignmentsApi(statusFilter);
      setAssignments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Fetch assignments error:', err);
      if (err.response?.status === 403) {
        setIsPermissionRestricted(true);
      }
      setError(err.response?.data?.detail || 'Failed to load rescue assignments.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, isVerified]);

  useEffect(() => {
    loadAssignments();
  }, [loadAssignments]);

  const handleExecuteAction = async () => {
    if (!actionTarget) return;
    setActionLoading(true);
    setActionError('');
    setActionSuccess('');

    const reportId = actionTarget.assignment.report.id;

    try {
      if (actionTarget.actionType === 'START') {
        await startRescueApi(reportId, comment);
        setActionSuccess('Rescue operation commenced! Team marked en route.');
      } else if (actionTarget.actionType === 'COMPLETE') {
        await completeRescueApi(reportId, comment);
        setActionSuccess('Rescue operation completed! Animal secured.');
      }

      setTimeout(() => {
        setActionTarget(null);
        setComment('');
        setActionSuccess('');
        loadAssignments();
      }, 1200);
    } catch (err) {
      console.error('Rescue action error:', err);
      setActionError(err.response?.data?.detail || 'Failed to update rescue status.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 pb-12">
      <FieldHeader
        badge="FIELD RESPONSE DEPLOYMENT"
        title="Rescue Mission Assignments"
        subtitle="Manage active operations, transition reports through rescue milestones, and log completion comments for sanctuary records."
        backTo="/ngo/dashboard"
        backLabel="Back to Dispatch Portal"
        actions={
          <Link
            to="/ngo/reports"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#D9480F] hover:bg-[#C23E0A] text-white font-mono font-bold text-xs uppercase tracking-wider shadow-sm transition-colors"
          >
            <RescueRadiusEmblem className="w-3.5 h-3.5 text-white" />
            <span>Discover More Cases</span>
          </Link>
        }
      />

      {/* Filter Tabs */}
      <div className="bg-white border border-[#E5E2D6] rounded-2xl p-4 sm:p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500 mr-1">
            FILTER:
          </span>
          <button
            onClick={() => setStatusFilter('')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono uppercase tracking-wider transition-all cursor-pointer ${
              statusFilter === ''
                ? 'bg-[#143627] text-white'
                : 'bg-[#FAF9F5] text-slate-700 border border-[#E5E2D6] hover:bg-[#F4F3EB]'
            }`}
          >
            All Missions
          </button>
          <button
            onClick={() => setStatusFilter('ACTIVE')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono uppercase tracking-wider transition-all cursor-pointer ${
              statusFilter === 'ACTIVE'
                ? 'bg-[#143627] text-white'
                : 'bg-[#FAF9F5] text-slate-700 border border-[#E5E2D6] hover:bg-[#F4F3EB]'
            }`}
          >
            Active Rescues
          </button>
          <button
            onClick={() => setStatusFilter('COMPLETED')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono uppercase tracking-wider transition-all cursor-pointer ${
              statusFilter === 'COMPLETED'
                ? 'bg-[#143627] text-white'
                : 'bg-[#FAF9F5] text-slate-700 border border-[#E5E2D6] hover:bg-[#F4F3EB]'
            }`}
          >
            Completed Rescues
          </button>
        </div>

        <button
          onClick={loadAssignments}
          className="px-3.5 py-1.5 rounded-lg border border-[#D5D1C3] text-xs font-mono uppercase tracking-wider text-slate-700 hover:text-slate-900 hover:bg-[#F6F4EE] transition-colors flex items-center gap-1.5"
        >
          <span>🔄</span>
          <span>Refresh</span>
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-300 rounded-xl text-rose-900 text-xs font-mono flex items-center gap-2">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* Assignments Manifest List */}
      <div className="bg-white border border-[#E5E2D6] rounded-2xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-slate-500 flex flex-col items-center justify-center space-y-3">
            <svg className="animate-spin h-6 w-6 text-[#143627]" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            <span className="text-xs font-mono uppercase tracking-wider text-slate-500">
              Loading deployment assignments...
            </span>
          </div>
        ) : isPermissionRestricted ? (
          <div className="py-16 px-4 text-center max-w-lg mx-auto space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-2xl mx-auto text-amber-700">
              ⏳
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold text-[#143627]">
                Station Assignment Access Pending
              </h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed font-sans">
                Rescue assignments and mission logs are activated once your organization profile has been verified by Central Field Control.
              </p>
            </div>
            <div className="pt-2">
              <Link
                to="/ngo/dashboard"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#143627] hover:bg-[#1B4532] text-white font-mono font-bold text-xs uppercase tracking-wider shadow-sm transition-colors"
              >
                <span>Return to Dispatch Portal →</span>
              </Link>
            </div>
          </div>
        ) : assignments.length === 0 ? (
          <div className="py-16 px-4 text-center max-w-md mx-auto space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-[#F6F4EE] border border-[#E5E2D6] flex items-center justify-center text-2xl mx-auto">
              🚑
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold text-[#143627]">
                No Assignments Found
              </h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed font-sans">
                No active or completed missions match this filter. Discover nearby verified reports to deploy response teams.
              </p>
            </div>
            <div className="pt-2">
              <Link
                to="/ngo/reports"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#D9480F] hover:bg-[#C23E0A] text-white font-mono font-bold text-xs uppercase tracking-wider shadow-sm transition-colors"
              >
                <span>Radar Case Discovery →</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-[#EFECE3]">
            {assignments.map((asgn) => {
              const report = asgn.report;
              const primaryImage =
                report?.images?.find((img) => img.is_primary)?.image || report?.images?.[0]?.image;

              const isClaimed = report?.status === 'CLAIMED';
              const isInProgress = report?.status === 'IN_PROGRESS';

              return (
                <div
                  key={asgn.id}
                  className="p-5 sm:p-6 hover:bg-[#FAF9F5] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 rounded-xl border border-[#E5E2D6] overflow-hidden bg-[#F6F4EE] shrink-0 flex items-center justify-center">
                      {primaryImage ? (
                        <img
                          src={primaryImage}
                          alt={report?.animal?.species || 'Animal'}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-2xl">🐾</span>
                      )}
                    </div>

                    <div className="space-y-1.5 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold text-[#143627]">
                          #ASGN-{String(asgn.id).padStart(4, '0')}
                        </span>
                        <span className="font-serif font-bold text-slate-900 text-base">
                          {report?.animal?.species || 'Animal'}
                        </span>
                        <FieldBadge status={asgn.status} />
                        <FieldBadge status={report?.status} />
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

                  {/* Actions Area */}
                  <div className="flex flex-wrap items-center sm:flex-col sm:items-end gap-2 shrink-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-[#EFECE3]">
                    {asgn.status === 'ACTIVE' && (
                      <>
                        {isClaimed && (
                          <button
                            onClick={() => setActionTarget({ assignment: asgn, actionType: 'START' })}
                            className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-mono text-xs font-bold uppercase tracking-wider shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
                          >
                            <span>🚀</span>
                            <span>Start Rescue</span>
                          </button>
                        )}
                        {isInProgress && (
                          <button
                            onClick={() => setActionTarget({ assignment: asgn, actionType: 'COMPLETE' })}
                            className="px-3.5 py-1.5 rounded-lg bg-[#143627] hover:bg-[#1B4532] text-white font-mono text-xs font-bold uppercase tracking-wider shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
                          >
                            <span>✅</span>
                            <span>Complete Rescue</span>
                          </button>
                        )}
                      </>
                    )}

                    <Link
                      to={`/ngo/assignments/${asgn.id}`}
                      className="px-3 py-1.5 rounded-lg bg-[#FAF9F5] hover:bg-[#F4F3EB] text-slate-700 border border-[#D5D1C3] text-xs font-mono uppercase tracking-wider font-semibold transition-all inline-flex items-center gap-1"
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

      {/* Action Execution Modal */}
      {actionTarget && (
        <div className="fixed inset-0 z-50 bg-[#101814]/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E5E2D6] rounded-2xl max-w-md w-full p-6 sm:p-8 space-y-4 shadow-2xl">
            <div className="border-b border-[#EFECE3] pb-3">
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#143627] font-bold block mb-1">
                DISPATCH OPERATION
              </span>
              <h3 className="font-serif text-xl font-bold text-[#143627]">
                {actionTarget.actionType === 'START'
                  ? 'Commence Rescue Operations'
                  : 'Complete Rescue & Secure Animal'}
              </h3>
            </div>

            {actionError && (
              <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-rose-950 text-xs font-mono flex items-center gap-2">
                <span>⚠️</span>
                <span>{actionError}</span>
              </div>
            )}

            {actionSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-950 text-xs font-mono flex items-center gap-2">
                <span>✓</span>
                <span>{actionSuccess}</span>
              </div>
            )}

            <p className="text-xs text-slate-600 font-sans leading-relaxed">
              {actionTarget.actionType === 'START'
                ? 'Marking this operation as IN_PROGRESS signals to the citizen and field control that responders are en route to the coordinates.'
                : 'Marking this operation as RESCUED confirms that the animal is safely in sanctuary care and ready for recovery.'}
            </p>

            <div>
              <label className="block text-xs font-mono font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                Field Comment / Log Note (Optional)
              </label>
              <textarea
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={
                  actionTarget.actionType === 'START'
                    ? 'e.g. Unit 3 dispatched with crate, ETA 15 minutes...'
                    : 'e.g. Animal secured, receiving hydration and preliminary veterinary exam...'
                }
                className="w-full bg-[#FAF9F5] border border-[#D5D1C3] rounded-xl p-3 text-slate-900 text-xs focus:outline-none focus:border-[#143627] font-sans"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setActionTarget(null)}
                disabled={actionLoading}
                className="px-4 py-2 text-xs font-mono uppercase tracking-wider text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteAction}
                disabled={actionLoading}
                className={`px-5 py-2.5 rounded-xl text-white font-mono font-bold text-xs uppercase tracking-wider shadow-sm transition-colors disabled:opacity-50 cursor-pointer ${
                  actionTarget.actionType === 'START'
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : 'bg-[#143627] hover:bg-[#1B4532]'
                }`}
              >
                {actionLoading ? 'Logging Status...' : 'Confirm Operation →'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssignmentsList;
