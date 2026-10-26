import React from 'react';

const STATUS_CONFIGS = {
  // Roles
  CITIZEN: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-900',
    border: 'border-emerald-300',
    label: 'Citizen Dispatch',
    glyph: '👤',
  },
  NGO: {
    bg: 'bg-sky-50',
    text: 'text-sky-950',
    border: 'border-sky-300',
    label: 'NGO Responder',
    glyph: '🌿',
  },
  ADMIN: {
    bg: 'bg-stone-100',
    text: 'text-stone-900',
    border: 'border-stone-400',
    label: 'Field Control (Admin)',
    glyph: '🛡️',
  },

  // Report Statuses
  REPORTED: {
    bg: 'bg-amber-50',
    text: 'text-amber-950',
    border: 'border-amber-300',
    label: 'Reported',
    glyph: '📝',
  },
  VERIFIED: {
    bg: 'bg-blue-50',
    text: 'text-blue-950',
    border: 'border-blue-300',
    label: 'Verified',
    glyph: '✓',
  },
  CLAIMED: {
    bg: 'bg-indigo-50',
    text: 'text-indigo-950',
    border: 'border-indigo-300',
    label: 'Claimed',
    glyph: '🤝',
  },
  IN_PROGRESS: {
    bg: 'bg-orange-50',
    text: 'text-orange-950',
    border: 'border-orange-400',
    label: 'In Progress',
    glyph: '🚑',
  },
  RESCUED: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-950',
    border: 'border-emerald-400',
    label: 'Rescued',
    glyph: '🐾',
  },
  CLOSED: {
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    border: 'border-slate-300',
    label: 'Closed',
    glyph: '🏁',
  },

  // Assignment Statuses
  ACTIVE: {
    bg: 'bg-amber-50',
    text: 'text-amber-950',
    border: 'border-amber-300',
    label: 'Active Mission',
    glyph: '●',
  },
  COMPLETED: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-950',
    border: 'border-emerald-300',
    label: 'Completed',
    glyph: '✓',
  },
  CANCELLED: {
    bg: 'bg-rose-50',
    text: 'text-rose-950',
    border: 'border-rose-300',
    label: 'Cancelled',
    glyph: '✕',
  },

  // NGO Verification Statuses
  PENDING: {
    bg: 'bg-amber-50',
    text: 'text-amber-950',
    border: 'border-amber-300',
    label: 'Pending Review',
    glyph: '⏳',
  },
  REJECTED: {
    bg: 'bg-rose-50',
    text: 'text-rose-950',
    border: 'border-rose-300',
    label: 'Rejected',
    glyph: '✕',
  },
  SUSPENDED: {
    bg: 'bg-stone-100',
    text: 'text-stone-800',
    border: 'border-stone-400',
    label: 'Suspended',
    glyph: '⏸',
  },
};

export const FieldBadge = ({ status, customLabel, size = 'default' }) => {
  const config = STATUS_CONFIGS[status] || {
    bg: 'bg-slate-50',
    text: 'text-slate-800',
    border: 'border-slate-300',
    label: status,
    glyph: '•',
  };

  const isSmall = size === 'sm';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border font-mono font-medium transition-colors ${config.bg} ${config.text} ${config.border} ${
        isSmall ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-[11px]'
      }`}
    >
      <span className="text-[10px] opacity-80" aria-hidden="true">
        {config.glyph}
      </span>
      <span className="font-sans font-semibold uppercase tracking-wider text-[10px]">
        {customLabel || config.label}
      </span>
    </span>
  );
};

export default FieldBadge;
