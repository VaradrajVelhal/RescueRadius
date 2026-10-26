import React from 'react';

/**
 * RescueRadius Brand Emblem
 * 
 * A distinctive cartographic rescue emblem combining:
 * - A precision geographical location marker / radar beacon shield
 * - A stylized animal rescue paw pad geometry
 * - A restrained rescue-vermilion (emergency pulse) accent
 * 
 * Tuned for crisp rendering at 20px - 48px sizes.
 */
export const RescueRadiusEmblem = ({
  size = 32,
  className = '',
  variant = 'default', // 'default' (crest badge) | 'mark' (pure svg) | 'monochrome'
  accent = true,
  ariaLabel = 'RescueRadius Emblem',
}) => {
  const svgMarkup = (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={variant === 'mark' ? className : 'shrink-0'}
      aria-label={ariaLabel}
      role="img"
    >
      <title>{ariaLabel}</title>
      
      {/* Outer cartographic beacon ring (subtle radar field) */}
      <circle
        cx="16"
        cy="15"
        r="13.5"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeDasharray="2 2"
        className="opacity-40"
      />

      {/* Primary geographical pin / shield contour */}
      <path
        d="M16 2.5C9.648 2.5 4.5 7.648 4.5 14c0 7.8 9.8 15.6 10.8 16.35a1.1 1.1 0 0 0 1.4 0C17.7 29.6 27.5 21.8 27.5 14c0-6.352-5.148-11.5-11.5-11.5Z"
        fill="currentColor"
      />

      {/* Inner field contrast boundary */}
      <path
        d="M16 4C10.477 4 6 8.477 6 14c0 6.6 8.2 13.5 10 14.9 1.8-1.4 10-8.3 10-14.9 0-5.523-4.477-10-10-10Z"
        fill="#143627"
      />

      {/* Stylized animal rescue paw geometry in warm ivory (#FAF9F5) */}
      {/* Main central pad: cartographic shield / soft heart */}
      <path
        d="M16 19.8c-2.4 0-4-1.6-4-3.4 0-1.4 1.1-2.4 2.2-2.4.9 0 1.5.5 1.8 1 .3-.5.9-1 1.8-1 1.1 0 2.2 1 2.2 2.4 0 1.8-1.6 3.4-4 3.4Z"
        fill="#FAF9F5"
      />

      {/* Toe pad 1 (left outer) */}
      <ellipse
        cx="10.8"
        cy="12.2"
        rx="1.3"
        ry="1.8"
        transform="rotate(-20 10.8 12.2)"
        fill="#FAF9F5"
      />

      {/* Toe pad 2 (left inner) */}
      <ellipse
        cx="13.9"
        cy="10.2"
        rx="1.3"
        ry="1.9"
        transform="rotate(-7 13.9 10.2)"
        fill="#FAF9F5"
      />

      {/* Toe pad 3 (right inner) */}
      <ellipse
        cx="18.1"
        cy="10.2"
        rx="1.3"
        ry="1.9"
        transform="rotate(7 18.1 10.2)"
        fill="#FAF9F5"
      />

      {/* Toe pad 4 (right outer) */}
      <ellipse
        cx="21.2"
        cy="12.2"
        rx="1.3"
        ry="1.8"
        transform="rotate(20 21.2 12.2)"
        fill="#FAF9F5"
      />

      {/* Restrained Rescue-Vermilion coordinate beacon dot (center radar focal point) */}
      {accent && (
        <>
          <circle
            cx="16"
            cy="15.8"
            r="1.3"
            fill="#D9480F"
          />
          <circle
            cx="16"
            cy="15.8"
            r="2.4"
            stroke="#D9480F"
            strokeWidth="0.6"
            className="opacity-75"
          />
        </>
      )}
    </svg>
  );

  if (variant === 'mark') {
    return svgMarkup;
  }

  // Default: crest badge container
  return (
    <div
      className={`inline-flex items-center justify-center rounded-xl bg-[#1E4935] border border-emerald-400/30 text-emerald-300 shadow-2xs transition-colors ${className}`}
      style={{ width: size + 8, height: size + 8 }}
      aria-label={ariaLabel}
    >
      {svgMarkup}
    </div>
  );
};

export default RescueRadiusEmblem;
