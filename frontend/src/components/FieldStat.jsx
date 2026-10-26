import React from 'react';

export const FieldStat = ({ label, value, subtext, icon, highlight = 'default' }) => {
  const highlightStyles = {
    default: 'text-[#143627] border-[#E5E2D6] bg-white',
    vermilion: 'text-[#D9480F] border-orange-200 bg-orange-50/40',
    amber: 'text-amber-800 border-amber-200 bg-amber-50/40',
    forest: 'text-[#1E4934] border-emerald-200 bg-emerald-50/40',
  };

  const style = highlightStyles[highlight] || highlightStyles.default;

  return (
    <div className={`p-5 rounded-2xl border ${style} shadow-2xs transition-all hover:border-[#D5D1C3]`}>
      <div className="flex items-center justify-between text-xs font-mono uppercase tracking-wider text-slate-500 mb-2">
        <span>{label}</span>
        {icon && <span className="text-base" aria-hidden="true">{icon}</span>}
      </div>
      <div className="text-3xl font-mono font-bold tracking-tight">
        {value}
      </div>
      {subtext && (
        <div className="text-[11px] text-slate-500 mt-1 font-sans">
          {subtext}
        </div>
      )}
    </div>
  );
};

export default FieldStat;
