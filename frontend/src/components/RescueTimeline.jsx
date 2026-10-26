import React from 'react';

const LIFECYCLE_STAGES = [
  {
    key: 'REPORTED',
    label: 'Incident Reported',
    shortLabel: 'Reported',
    desc: 'Citizen dispatch submitted',
    icon: '📝',
  },
  {
    key: 'VERIFIED',
    label: 'Moderation Verified',
    shortLabel: 'Verified',
    desc: 'Confirmed by field control',
    icon: '🛡️',
  },
  {
    key: 'CLAIMED',
    label: 'NGO Claimed',
    shortLabel: 'Claimed',
    desc: 'Assigned to response unit',
    icon: '🤝',
  },
  {
    key: 'IN_PROGRESS',
    label: 'Rescue In Progress',
    shortLabel: 'In Progress',
    desc: 'Field team mobilized',
    icon: '🚑',
  },
  {
    key: 'RESCUED',
    label: 'Animal Rescued',
    shortLabel: 'Rescued',
    desc: 'Secured and receiving care',
    icon: '🐾',
  },
  {
    key: 'CLOSED',
    label: 'Case Closed',
    shortLabel: 'Closed',
    desc: 'Archived & post-care logged',
    icon: '🏁',
  },
];

export const RescueTimeline = ({ currentStatus = 'REPORTED', reportedAt, closedAt, comment }) => {
  const currentIndex = LIFECYCLE_STAGES.findIndex((stage) => stage.key === currentStatus);
  const activeIdx = currentIndex !== -1 ? currentIndex : 0;

  return (
    <div className="w-full">
      {/* Horizontal Stepper for Desktop & Tablet */}
      <div className="hidden sm:block relative">
        {/* Connecting track line */}
        <div className="absolute top-4 left-6 right-6 h-0.5 bg-[#E5E2D6] -z-0" aria-hidden="true" />
        <div
          className="absolute top-4 left-6 h-0.5 bg-[#143627] -z-0 transition-all duration-500"
          style={{ width: `${Math.min(100, (activeIdx / (LIFECYCLE_STAGES.length - 1)) * 100)}%` }}
          aria-hidden="true"
        />

        <div className="grid grid-cols-6 gap-2 relative z-10">
          {LIFECYCLE_STAGES.map((stage, idx) => {
            const isPassed = idx < activeIdx;
            const isCurrent = idx === activeIdx;

            return (
              <div
                key={stage.key}
                className="flex flex-col items-center text-center group"
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-mono font-bold mb-2 transition-all ${
                    isCurrent
                      ? 'bg-[#D9480F] text-white shadow-sm ring-4 ring-orange-100 scale-110'
                      : isPassed
                      ? 'bg-[#143627] text-white'
                      : 'bg-[#F4F3EB] text-slate-400 border border-[#D5D1C3]'
                  }`}
                >
                  {isPassed ? '✓' : idx + 1}
                </div>

                <div className="px-1">
                  <div
                    className={`text-xs font-semibold leading-tight ${
                      isCurrent
                        ? 'text-[#D9480F] font-bold'
                        : isPassed
                        ? 'text-[#143627]'
                        : 'text-slate-400'
                    }`}
                  >
                    {stage.shortLabel}
                  </div>
                  <span className="text-[10px] text-slate-500 mt-0.5 block leading-tight font-sans">
                    {stage.desc}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Vertical Stepper for Mobile */}
      <div className="sm:hidden space-y-1.5 relative pl-4 border-l-2 border-[#E5E2D6]">
        {LIFECYCLE_STAGES.map((stage, idx) => {
          const isPassed = idx < activeIdx;
          const isCurrent = idx === activeIdx;

          return (
            <div
              key={stage.key}
              className={`relative flex items-center justify-between py-1.5 px-3 rounded-lg transition-all ${
                isCurrent
                  ? 'bg-orange-50/80 border border-orange-200'
                  : isPassed
                  ? 'bg-emerald-50/40 text-emerald-950'
                  : 'text-slate-400'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono font-bold ${
                    isCurrent
                      ? 'bg-[#D9480F] text-white ring-2 ring-orange-200'
                      : isPassed
                      ? 'bg-[#143627] text-white'
                      : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  {isPassed ? '✓' : idx + 1}
                </span>
                <span
                  className={`text-xs font-semibold ${
                    isCurrent ? 'text-orange-950 font-bold' : isPassed ? 'text-slate-900' : 'text-slate-400'
                  }`}
                >
                  {stage.label}
                </span>
              </div>
              {isCurrent && (
                <span className="text-[9px] font-mono uppercase tracking-widest px-1.5 py-0.5 rounded bg-orange-200 text-orange-900 font-bold">
                  Active
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Meta footnote when dates / comments available */}
      {(reportedAt || closedAt || comment) && (
        <div className="mt-4 pt-3 border-t border-[#E8E5DC] flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600 font-mono">
          {reportedAt && (
            <div>
              <span className="text-slate-400">DISPATCHED:</span> {new Date(reportedAt).toLocaleString()}
            </div>
          )}
          {closedAt && (
            <div>
              <span className="text-slate-400">CONCLUDED:</span> {new Date(closedAt).toLocaleString()}
            </div>
          )}
          {comment && (
            <div className="w-full text-slate-700 italic font-sans text-xs bg-slate-50 p-2 rounded-lg border border-slate-200">
              "{comment}"
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RescueTimeline;
