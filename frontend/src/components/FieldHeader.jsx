import React from 'react';
import { Link } from 'react-router-dom';

export const FieldHeader = ({
  badge = 'FIELD DISPATCH',
  title,
  subtitle,
  backTo,
  backLabel = 'Back',
  actions,
  coordinates,
}) => {
  return (
    <div className="bg-white border border-[#E5E2D6] rounded-2xl p-5 sm:p-6 lg:p-7 shadow-xs relative overflow-hidden">
      {/* Decorative coordinate watermark / top bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#EFECE3] pb-2.5 mb-3.5 text-[11px] font-mono text-slate-500">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#143627]" aria-hidden="true" />
          <span className="uppercase tracking-widest font-semibold text-[#143627]">
            {badge}
          </span>
        </div>
        {coordinates && (
          <span className="text-slate-400 font-mono tracking-wider">
            {coordinates}
          </span>
        )}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          {backTo && (
            <Link
              to={backTo}
              className="mt-1 p-2 rounded-xl bg-[#F6F4EE] border border-[#E5E2D6] text-slate-600 hover:text-slate-900 hover:bg-[#EAE6DA] transition-colors shrink-0"
              title={backLabel}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
          )}
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl text-[#143627] font-bold tracking-tight">
              {title}
            </h1>
            {subtitle && (
              <p className="text-slate-600 text-xs sm:text-sm mt-1 leading-relaxed max-w-2xl font-sans">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {actions && (
          <div className="flex flex-wrap items-center gap-2 shrink-0 sm:self-center">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
};

export default FieldHeader;
