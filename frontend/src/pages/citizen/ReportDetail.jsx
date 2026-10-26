import React, { useCallback, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchReportDetailApi, closeReportApi } from '../../api/reports';
import { useAuth } from '../../context/AuthContext';
import FieldHeader from '../../components/FieldHeader';
import FieldBadge from '../../components/FieldBadge';
import RescueSignal from '../../components/RescueSignal';
import RescueTimeline from '../../components/RescueTimeline';

const ReportDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [closing, setClosing] = useState(false);
  const [closeComment, setCloseComment] = useState('');
  const [showCloseModal, setShowCloseModal] = useState(false);

  const loadDetail = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchReportDetailApi(id);
      setReport(data);
    } catch (err) {
      console.error('Fetch report detail error:', err);
      setError(err.response?.data?.detail || 'Failed to load report details.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  const handleCloseReport = async () => {
    setClosing(true);
    try {
      await closeReportApi(id, closeComment);
      setShowCloseModal(false);
      await loadDetail();
    } catch (err) {
      console.error('Close report error:', err);
      alert(err.response?.data?.detail || 'Failed to close report.');
    } finally {
      setClosing(false);
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
          Decrypting Field Manifest #REP-{String(id).padStart(4, '0')}...
        </span>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="max-w-xl mx-auto my-12 bg-white border border-[#E5E2D6] rounded-2xl p-8 text-center space-y-4 shadow-xs">
        <div className="text-3xl">⚠️</div>
        <h2 className="font-serif text-xl font-bold text-[#143627]">
          Manifest Record Unreachable
        </h2>
        <p className="text-xs text-slate-600 font-sans leading-relaxed">
          {error || 'The requested incident dispatch could not be found or you do not have permission to view it.'}
        </p>
        <Link
          to="/citizen/dashboard"
          className="inline-flex items-center px-4 py-2 bg-[#143627] hover:bg-[#1B4532] text-white text-xs font-mono uppercase tracking-wider font-semibold rounded-xl transition-colors"
        >
          Return to Dashboard
        </Link>
      </div>
    );
  }

  const isReporter = user && report.reporter && user.email === report.reporter.email;
  const canClose = report.status === 'RESCUED' && (isReporter || user?.role === 'ADMIN');

  return (
    <div className="max-w-5xl mx-auto space-y-6 sm:space-y-8 pb-12">
      <FieldHeader
        badge={`MANIFEST RECORD // REP-${String(report.id).padStart(4, '0')}`}
        title={`${report.animal?.species || 'Animal'} Rescue Dispatch`}
        subtitle={`Dispatched on ${new Date(report.reported_at).toLocaleString()} by ${report.reporter?.email || 'Citizen'}.`}
        backTo="/citizen/dashboard"
        backLabel="Back to Incident Manifests"
        coordinates={
          report.location
            ? `COORD ${Number(report.location.latitude).toFixed(4)}°N, ${Number(report.location.longitude).toFixed(4)}°E`
            : undefined
        }
        actions={
          <div className="flex items-center gap-2">
            <FieldBadge status={report.status} />
            {canClose && (
              <button
                onClick={() => setShowCloseModal(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-mono text-xs font-bold uppercase tracking-wider shadow-sm transition-colors cursor-pointer"
              >
                <span>✓</span>
                <span>Confirm Case Closure</span>
              </button>
            )}
          </div>
        }
      />

      {/* Visual Rescue Lifecycle Timeline */}
      <div className="bg-white border border-[#E5E2D6] rounded-2xl p-5 sm:p-6 shadow-xs">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#EFECE3]">
          <h2 className="font-serif text-base font-bold text-[#143627]">
            Operational Rescue Lifecycle
          </h2>
          <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider">
            LIFECYCLE STATUS: {report.status}
          </span>
        </div>

        <RescueTimeline
          currentStatus={report.status}
          reportedAt={report.reported_at}
          closedAt={report.closed_at}
        />
      </div>

      {/* Main Grid: Details & Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Photos & Observations */}
        <div className="lg:col-span-8 space-y-6">
          {/* Prominent Specimen Photographic Showcase */}
          {report.images && report.images.length > 0 && (
            <div className="bg-white border border-[#E5E2D6] rounded-2xl p-5 sm:p-6 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2.5 border-b border-[#EFECE3]">
                <h3 className="font-serif text-base font-bold text-[#143627] flex items-center gap-2">
                  <span>📷</span>
                  <span>Field Photographic Documentation ({report.images.length})</span>
                </h3>
                <span className="text-[11px] font-mono text-slate-400 uppercase tracking-widest">
                  ATTACHED SPECIMEN EVIDENCE
                </span>
              </div>

              {/* Hero Image + Gallery thumbnails */}
              <div className="space-y-3">
                <div className="relative rounded-xl overflow-hidden border border-[#E5E2D6] max-h-[400px] bg-[#FAF9F5] shadow-xs group">
                  <img
                    src={report.images[0].image}
                    alt={report.animal?.species || 'Animal'}
                    className="w-full h-full max-h-[400px] object-cover"
                  />
                  <a
                    href={report.images[0].image}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute bottom-3 right-3 bg-[#143627]/85 hover:bg-[#143627] text-white text-xs font-mono px-3 py-1.5 rounded-lg shadow-sm transition-all flex items-center gap-1.5 backdrop-blur-xs"
                  >
                    <span>View Original High-Res</span>
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
                          alt={`Report #${report.id} photo ${i + 2}`}
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

          {/* Incident Log & Field Observations */}
          <div className="bg-white border border-[#E5E2D6] rounded-2xl p-5 sm:p-6 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-[#EFECE3] pb-2.5">
              <h3 className="font-serif text-base font-bold text-[#143627] flex items-center gap-2">
                <span>📝</span>
                <span>Incident Log & Field Observations</span>
              </h3>
              <RescueSignal urgency={report.urgency} variant="compact" />
            </div>

            <p className="text-sm text-slate-800 font-sans whitespace-pre-line leading-relaxed">
              {report.description}
            </p>
          </div>

          {/* Location & Geospatial Context */}
          <div className="bg-white border border-[#E5E2D6] rounded-2xl p-5 sm:p-6 shadow-xs space-y-3">
            <div className="border-b border-[#EFECE3] pb-2.5">
              <h3 className="font-serif text-base font-bold text-[#143627] flex items-center gap-2">
                <span>📍</span>
                <span>Geospatial Radar & Location Manifest</span>
              </h3>
            </div>

            {report.address && (
              <div className="bg-[#FAF9F5] p-3 rounded-xl border border-[#E5E2D6]">
                <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500 block mb-0.5">
                  LANDMARK / ROAD ADDRESS
                </span>
                <p className="text-sm font-sans font-medium text-slate-900">
                  {report.address}
                </p>
              </div>
            )}

            {report.location && (
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

        {/* Right: Specimen Profile Card & Metadata */}
        <div className="lg:col-span-4 space-y-6">
          {/* Specimen Profile */}
          <div className="bg-white border border-[#E5E2D6] rounded-2xl p-6 shadow-xs space-y-4">
            <div className="border-b border-[#EFECE3] pb-3">
              <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500 block">
                TAXONOMY
              </span>
              <h3 className="font-serif text-base font-bold text-[#143627]">
                Animal Profile
              </h3>
            </div>

            <dl className="space-y-3 font-sans text-xs">
              <div className="flex justify-between py-1.5 border-b border-[#EFECE3]">
                <dt className="text-slate-500 font-mono uppercase">Species</dt>
                <dd className="font-bold text-slate-900">{report.animal?.species || 'N/A'}</dd>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#EFECE3]">
                <dt className="text-slate-500 font-mono uppercase">Breed</dt>
                <dd className="font-medium text-slate-900">{report.animal?.breed || 'Unknown'}</dd>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#EFECE3]">
                <dt className="text-slate-500 font-mono uppercase">Coloring</dt>
                <dd className="font-medium text-slate-900">{report.animal?.color || 'Unspecified'}</dd>
              </div>
            </dl>
          </div>

          {/* Dispatch Metadata */}
          <div className="bg-white border border-[#E5E2D6] rounded-2xl p-6 shadow-xs space-y-4">
            <div className="border-b border-[#EFECE3] pb-3">
              <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500 block">
                PROVENANCE
              </span>
              <h3 className="font-serif text-base font-bold text-[#143627]">
                Station Metadata
              </h3>
            </div>

            <div className="space-y-3 font-sans text-xs">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500 block">
                  REPORTING AGENT
                </span>
                <span className="text-slate-900 font-mono text-xs">
                  {report.reporter?.email || 'Anonymous'}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500 block">
                  SUBMITTED AT
                </span>
                <span className="text-slate-700 font-mono text-xs">
                  {new Date(report.reported_at).toLocaleString()}
                </span>
              </div>

              {report.closed_at && (
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500 block">
                    CLOSED AT
                  </span>
                  <span className="text-slate-700 font-mono text-xs">
                    {new Date(report.closed_at).toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal for Closing Report */}
      {showCloseModal && (
        <div className="fixed inset-0 z-50 bg-[#101814]/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E5E2D6] rounded-2xl max-w-md w-full p-6 sm:p-8 space-y-4 shadow-xl">
            <h3 className="font-serif text-xl font-bold text-[#143627]">
              Confirm Incident Closure
            </h3>
            <p className="text-xs text-slate-600 font-sans leading-relaxed">
              Are you sure you want to mark Report #REP-{String(report.id).padStart(4, '0')} as officially closed? This archives the case and confirms post-rescue stabilization.
            </p>
            <textarea
              rows={3}
              value={closeComment}
              onChange={(e) => setCloseComment(e.target.value)}
              placeholder="Optional closing notes (e.g. Animal safely released, adopted, or placed under ongoing sanctuary observation)..."
              className="w-full bg-[#FAF9F5] border border-[#D5D1C3] rounded-xl p-3 text-slate-900 text-xs focus:outline-none focus:border-[#143627] font-sans"
            />
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowCloseModal(false)}
                className="px-4 py-2 text-xs font-mono uppercase tracking-wider text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleCloseReport}
                disabled={closing}
                className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-mono font-bold text-xs uppercase tracking-wider rounded-xl disabled:opacity-50 shadow-sm cursor-pointer"
              >
                {closing ? 'Archiving Case...' : 'Confirm Case Closed'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportDetail;
