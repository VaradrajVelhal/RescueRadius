import React from 'react';

const SIGNAL_CONFIG = {
  LOW: {
    label: 'Low Urgency',
    shortLabel: 'Low',
    level: 1,
    pips: [true, false, false, false],
    colorText: 'text-emerald-800',
    colorBg: 'bg-emerald-50',
    colorBorder: 'border-emerald-300',
    pipActive: 'bg-emerald-700',
    pipInactive: 'bg-emerald-200',
    icon: '●○○○',
    description: 'Stable condition, safe environment',
  },
  MEDIUM: {
    label: 'Medium Urgency',
    shortLabel: 'Medium',
    level: 2,
    pips: [true, true, false, false],
    colorText: 'text-amber-900',
    colorBg: 'bg-amber-50',
    colorBorder: 'border-amber-300',
    pipActive: 'bg-amber-600',
    pipInactive: 'bg-amber-200',
    icon: '●●○○',
    description: 'Moderate distress or minor injury',
  },
  HIGH: {
    label: 'High Urgency',
    shortLabel: 'High',
    level: 3,
    pips: [true, true, true, false],
    colorText: 'text-orange-950',
    colorBg: 'bg-orange-50',
    colorBorder: 'border-orange-400',
    pipActive: 'bg-orange-600',
    pipInactive: 'bg-orange-200',
    icon: '●●●○',
    description: 'Serious trauma or immediate peril',
  },
  CRITICAL: {
    label: 'Critical Emergency',
    shortLabel: 'Critical',
    level: 4,
    pips: [true, true, true, true],
    colorText: 'text-rose-950',
    colorBg: 'bg-rose-50',
    colorBorder: 'border-rose-400',
    pipActive: 'bg-rose-600 animate-pulse',
    pipInactive: 'bg-rose-200',
    icon: '●●●●',
    description: 'Life-threatening trauma, urgent dispatch',
  },
};

export const RescueSignal = ({ urgency = 'MEDIUM', variant = 'default', showDescription = false }) => {
  const config = SIGNAL_CONFIG[urgency?.toUpperCase()] || SIGNAL_CONFIG.MEDIUM;

  if (variant === 'compact') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[11px] font-mono font-medium ${config.colorBg} ${config.colorText} ${config.colorBorder}`}
        title={`${config.label}: ${config.description}`}
      >
        <span className="flex gap-0.5" aria-hidden="true">
          {config.pips.map((active, i) => (
            <span
              key={i}
              className={`w-1.5 h-1.5 rounded-full ${active ? config.pipActive : config.pipInactive}`}
            />
          ))}
        </span>
        <span className="font-sans font-semibold tracking-wide uppercase text-[10px]">
          {config.shortLabel}
        </span>
      </span>
    );
  }

  if (variant === 'badge') {
    return (
      <span
        className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-lg border text-xs font-mono ${config.colorBg} ${config.colorText} ${config.colorBorder}`}
      >
        <span className="flex gap-1" aria-hidden="true">
          {config.pips.map((active, i) => (
            <span
              key={i}
              className={`w-2 h-2 rounded-full ${active ? config.pipActive : config.pipInactive}`}
            />
          ))}
        </span>
        <span className="font-sans font-bold tracking-wider uppercase text-[11px]">
          {config.label}
        </span>
      </span>
    );
  }

  return (
    <div
      className={`p-3 rounded-xl border ${config.colorBg} ${config.colorBorder} transition-all`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex gap-1" aria-hidden="true">
            {config.pips.map((active, i) => (
              <span
                key={i}
                className={`w-2.5 h-2.5 rounded-full ${active ? config.pipActive : config.pipInactive}`}
              />
            ))}
          </span>
          <span className={`font-sans font-bold text-xs uppercase tracking-wider ${config.colorText}`}>
            {config.label}
          </span>
        </div>
        <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500">
          SIGNAL LVL {config.level}/4
        </span>
      </div>
      {showDescription && (
        <p className="mt-1.5 text-xs text-slate-600 font-sans leading-relaxed">
          {config.description}
        </p>
      )}
    </div>
  );
};

export default RescueSignal;
