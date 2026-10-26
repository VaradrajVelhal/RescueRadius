import React, { useCallback, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { fetchAssignmentDetailApi, startRescueApi, completeRescueApi } from '../../api/ngo';
import FieldHeader from '../../components/FieldHeader';
import FieldBadge from '../../components/FieldBadge';
import RescueSignal from '../../components/RescueSignal';
import RescueTimeline from '../../components/RescueTimeline';

const AssignmentDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const isVerified = user?.ngo_profile?.verification_status === 'VERIFIED';

  const [assignment, setAssignment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Action state
  const [actionType, setActionType] = useState(null); // 'START' or 'COMPLETE'
  const [comment, setComment] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');

  const loadDetail = useCallback(async () => {
    if (!isVerified) {
      setAssignment(null);
      setLoading(false);
      setError('Your organization profile must be verified by Field Control to view assignment details.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const data = await fetchAssignmentDetailApi(id);
      setAssignment(data);
    } catch (err) {
      console.error('Fetch assignment detail error:', err);
      setError(err.response?.data?.detail || 'Failed to load mission assignment details.');
    } finally {
      setLoading(false);
    }
  }, [id, isVerified]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  const handleExecuteAction = async () => {
    if (!actionType || !assignment?.report?.id) return;
    setActionLoading(true);
    setActionError('');

    const reportId = assignment.report.id;

    try {
      if (actionType === 'START') {
        await startRescueApi(reportId, comment);
      } else if (actionType === 'COMPLETE') {
        await completeRescueApi(reportId, comment);
      }

      setActionType(null);
      setComment('');
      await loadDetail();
    } catch (err) {
      console.error('Action error:', err);
      setActionError(err.response?.data?.detail || 'Failed to perform rescue operation.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-3 text-slate-500">
        <svg className="animate-spin h-7 w-7 text-[#143627]" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
        <span className="font-mono text-xs uppercase tracking-wider text-slate-500">
          Loading Mission Manifest #ASGN-{String(id).padStart(4, '0')}...
        </span>
      </div>
    );
  }

  if (error || !assignment) {
    return (
      <div className="max-w-xl mx-auto my-12 bg-white border border-[#E5E2D6] rounded-2xl p-8 text-center space-y-4 shadow-xs">
        <div className="text-3xl">⚠️</div>
        <h2 className="font-serif text-xl font-bold text-[#143627]">
          Mission Record Unreachable
        </h2>
        <p className="text-xs text-slate-600 font-sans leading-relaxed">
          {error || 'Could not find the requested rescue assignment.'}
        </p>
        <Link
          to="/ngo/assignments"
          className="inline-flex items-center px-4 py-2 bg-[#143627] hover:bg-[#1B4532] text-white text-xs font-mono uppercase tracking-wider font-semibold rounded-xl transition-colors"
        >
          Back to Assignments
        </Link>
      </div>
    );
  }

  const report = assignment.report;
  const isClaimed = report?.status === 'CLAIMED';
  const isInProgress = report?.status === 'IN_PROGRESS';

  return (
    <div className="max-w-5xl mx-auto space-y-6 sm:space-y-8 pb-12">
      <FieldHeader
        badge={`MISSION RECORD // ASGN-${String(assignment.id).padStart(4, '0')}`}
        title={`${report?.animal?.species || 'Animal'} Rescue Mission`}
        subtitle={`Claimed on ${new Date(assignment.claimed_at).toLocaleString()} by ${assignment.ngo?.organization_name || 'Your NGO'}.`}
        backTo="/ngo/assignments"
        backLabel="Back to Assignments"
        coordinates={
          report?.location
            ? `COORD ${Number(report.location.latitude).toFixed(4)}°N, ${Number(report.location.longitude).toFixed(4)}°E`
            : undefined
        }
        actions={
          <div className="flex items-center gap-2">
            <FieldBadge status={assignment.status} />
            <FieldBadge status={report?.status} />
            {assignment.status === 'ACTIVE' && (
              <>
                {isClaimed && (
                  <button
                    onClick={() => setActionType('START')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-mono text-xs font-bold uppercase tracking-wider shadow-sm transition-colors cursor-pointer"
                  >
                    <span>🚀</span>
                    <span>Start Rescue</span>
                  </button>
                )}
                {isInProgress && (
                  <button
                    onClick={() => setActionType('COMPLETE')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#143627] hover:bg-[#1B4532] text-white font-mono text-xs font-bold uppercase tracking-wider shadow-sm transition-colors cursor-pointer"
                  >
                    <span>✅</span>
                    <span>Complete Rescue</span>
                  </button>
                )}
              </>
            )}
          </div>
        }
      />

      {/* Lifecycle Timeline */}
      <div className="bg-white border border-[#E5E2D6] rounded-2xl p-6 sm:p-8 shadow-xs">
        <div className="border-b border-[#EFECE3] pb-3 mb-6 flex items-center justify-between">
          <h2 className="font-serif text-lg font-bold text-[#143627]">
            Mission Operations Progress
          </h2>
          <span className="text-xs font-mono text-slate-500 uppercase">
            STATUS: {report?.status}
          </span>
        </div>

        <RescueTimeline
          currentStatus={report?.status}
          reportedAt={report?.reported_at}
          closedAt={report?.closed_at}
        />
      </div>

      {/* Grid: Details */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6">
          {/* Photographic Evidence Showcase */}
          {report?.images && report.images.length > 0 && (
            <div className="bg-white border border-[#E5E2D6] rounded-2xl p-5 sm:p-6 shadow-xs space-y-3">
              <div className="border-b border-[#EFECE3] pb-2.5 flex items-center justify-between">
                <h3 className="font-serif text-base font-bold text-[#143627] flex items-center gap-2">
                  <span>📷</span>
                  <span>Field Photographic Evidence ({report.images.length})</span>
                </h3>
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">
                  CASE SPECIMEN
                </span>
              </div>

              <div className="space-y-3">
                <div className="relative rounded-xl overflow-hidden border border-[#E5E2D6] max-h-[380px] bg-[#FAF9F5] shadow-xs group">
                  <img
                    src={report.images[0].image}
                    alt={report.animal?.species || 'Animal'}
                    className="w-full h-full max-h-[380px] object-cover"
                  />
                  <a
                    href={report.images[0].image}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute bottom-3 right-3 bg-[#143627]/85 hover:bg-[#143627] text-white text-xs font-mono px-3 py-1.5 rounded-lg shadow-sm transition-all flex items-center gap-1.5 backdrop-blur-xs"
                  >
                    <span>View Full Size</span>
                    <span>↗</span>
                  </a>
                </div>

                {report.images.length > 1 && (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 pt-1">
                    {report.images.slice(1).map((img, i) => (
                      <a
                        key={img.id}
                        href={img.image}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group relative rounded-lg overflow-hidden border border-[#E5E2D6] aspect-square bg-[#FAF9F5] hover:border-[#143627] transition-all shadow-2xs"
                      >
                        <img
                          src={img.image}
                          alt={`Case photo ${i + 2}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-[#143627]/0 group-hover:bg-[#143627]/20 transition-colors flex items-end p-1.5">
                          <span className="text-[9px] font-mono text-white opacity-0 group-hover:opacity-100 bg-[#143627]/80 px-1.5 py-0.5 rounded transition-opacity">
                            ↗
                          </span>
                        </div>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Incident Info */}
          <div className="bg-white border border-[#E5E2D6] rounded-2xl p-5 sm:p-6 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-[#EFECE3] pb-2.5">
              <h3 className="font-serif text-base font-bold text-[#143627] flex items-center gap-2">
                <span>📝</span>
                <span>Case Description & Responder Notes</span>
              </h3>
              {report?.urgency && (
                <RescueSignal urgency={report.urgency} variant="compact" />
              )}
            </div>

            <p className="text-sm text-slate-800 font-sans whitespace-pre-line leading-relaxed">
              {report?.description}
            </p>
          </div>

          {/* Coordinates & Landmark */}
          <div className="bg-white border border-[#E5E2D6] rounded-2xl p-5 sm:p-6 shadow-xs space-y-3">
            <div className="border-b border-[#EFECE3] pb-2.5">
              <h3 className="font-serif text-base font-bold text-[#143627] flex items-center gap-2">
                <span>📍</span>
                <span>Field Rendezvous Coordinates</span>
              </h3>
            </div>

            {report?.address && (
              <div className="bg-[#FAF9F5] p-3 rounded-xl border border-[#E5E2D6]">
                <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500 block mb-0.5">
                  LANDMARK ADDRESS
                </span>
                <p className="text-sm font-sans font-medium text-slate-900">
                  {report.address}
                </p>
              </div>
            )}

            {report?.location && (
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#FAF9F5] p-3 rounded-xl border border-[#E5E2D6]">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500 block">
                    LATITUDE
                  </span>
                  <span className="text-sm font-mono font-bold text-[#143627]">
                    {Number(report.location.latitude).toFixed(6)}° N
                  </span>
                </div>
                <div className="bg-[#FAF9F5] p-3 rounded-xl border border-[#E5E2D6]">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500 block">
                    LONGITUDE
                  </span>
                  <span className="text-sm font-mono font-bold text-[#143627]">
                    {Number(report.location.longitude).toFixed(6)}° E
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar: Animal & Assignment Metadata */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white border border-[#E5E2D6] rounded-2xl p-6 shadow-xs space-y-4">
            <div className="border-b border-[#EFECE3] pb-3">
              <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500 block">
                SPECIMEN
              </span>
              <h3 className="font-serif text-base font-bold text-[#143627]">
                Animal Information
              </h3>
            </div>

            <dl className="space-y-3 font-sans text-xs">
              <div className="flex justify-between py-1.5 border-b border-[#EFECE3]">
                <dt className="text-slate-500 font-mono uppercase">Species</dt>
                <dd className="font-bold text-slate-900">{report?.animal?.species || 'N/A'}</dd>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#EFECE3]">
                <dt className="text-slate-500 font-mono uppercase">Breed</dt>
                <dd className="font-medium text-slate-900">{report?.animal?.breed || 'Unknown'}</dd>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#EFECE3]">
                <dt className="text-slate-500 font-mono uppercase">Coloring</dt>
                <dd className="font-medium text-slate-900">{report?.animal?.color || 'Unspecified'}</dd>
              </div>
            </dl>
          </div>

          <div className="bg-white border border-[#E5E2D6] rounded-2xl p-6 shadow-xs space-y-4">
            <div className="border-b border-[#EFECE3] pb-3">
              <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500 block">
                TIMELINE
              </span>
              <h3 className="font-serif text-base font-bold text-[#143627]">
                Mission Timestamps
              </h3>
            </div>

            <div className="space-y-3 font-sans text-xs">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500 block">
                  CLAIMED BY UNIT
                </span>
                <span className="text-slate-700 font-mono text-xs">
                  {new Date(assignment.claimed_at).toLocaleString()}
                </span>
              </div>
              {assignment.completed_at && (
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500 block">
                    COMPLETED AT
                  </span>
                  <span className="text-slate-700 font-mono text-xs">
                    {new Date(assignment.completed_at).toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Action Execution Dialog */}
      {actionType && (
        <div className="fixed inset-0 z-50 bg-[#101814]/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E5E2D6] rounded-2xl max-w-md w-full p-6 sm:p-8 space-y-4 shadow-2xl">
            <h3 className="font-serif text-xl font-bold text-[#143627]">
              {actionType === 'START' ? 'Mobilize Rescue Team' : 'Log Rescue Completion'}
            </h3>

            {actionError && (
              <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-rose-950 text-xs font-mono">
                {actionError}
              </div>
            )}

            <p className="text-xs text-slate-600 font-sans leading-relaxed">
              {actionType === 'START'
                ? 'Transition status to IN_PROGRESS to verify dispatch departure.'
                : 'Transition status to RESCUED to log safe custody and post-rescue stabilization.'}
            </p>

            <textarea
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Optional operational note..."
              className="w-full bg-[#FAF9F5] border border-[#D5D1C3] rounded-xl p-3 text-slate-900 text-xs focus:outline-none focus:border-[#143627] font-sans"
            />

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setActionType(null)}
                className="px-4 py-2 text-xs font-mono uppercase tracking-wider text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteAction}
                disabled={actionLoading}
                className="px-5 py-2.5 rounded-xl bg-[#143627] hover:bg-[#1B4532] text-white font-mono font-bold text-xs uppercase tracking-wider shadow-sm transition-colors cursor-pointer disabled:opacity-50"
              >
                {actionLoading ? 'Updating...' : 'Confirm Operation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssignmentDetail;
