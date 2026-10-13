// Hand-drawn strokes for titles, empty states and the landing. They are
// decoration only: hidden from assistive technology and never clickable.

const decorative = {
  'aria-hidden': true,
  focusable: 'false',
  fill: 'none',
  stroke: 'currentColor',
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

const withClass = (className) => `pointer-events-none select-none ${className}`;

export function Underline({ className = '' }) {
  return (
    <svg viewBox="0 0 200 14" preserveAspectRatio="none" strokeWidth="4" className={withClass(className)} {...decorative}>
      <path d="M3 9 C 40 3, 78 12, 118 7 S 178 4, 197 8" />
      <path d="M22 12 C 70 8, 130 11, 182 9" strokeWidth="2" opacity="0.6" />
    </svg>
  );
}

export function Scribble({ className = '' }) {
  return (
    <svg viewBox="0 0 220 90" preserveAspectRatio="none" strokeWidth="3" className={withClass(className)} {...decorative}>
      <path d="M28 46 C 22 16, 186 6, 204 38 C 220 70, 52 88, 16 56 C 4 42, 22 30, 46 24" />
    </svg>
  );
}

export function Arrow({ className = '' }) {
  return (
    <svg viewBox="0 0 120 50" strokeWidth="3" className={withClass(className)} {...decorative}>
      <path d="M4 40 C 30 12, 70 6, 108 20" />
      <path d="M94 8 L 110 20 L 92 30" />
    </svg>
  );
}

export function Star({ className = '' }) {
  return (
    <svg viewBox="0 0 24 24" strokeWidth="1.8" className={withClass(className)} {...decorative}>
      <path d="M12 2.5 L14.4 9.1 L21.4 9.4 L15.9 13.7 L17.9 20.6 L12 16.6 L6.1 20.6 L8.1 13.7 L2.6 9.4 L9.6 9.1 Z" />
    </svg>
  );
}

export function Sparkle({ className = '' }) {
  return (
    <svg viewBox="0 0 24 24" strokeWidth="2.2" className={withClass(className)} {...decorative}>
      <path d="M12 3 V8 M12 16 V21 M3 12 H8 M16 12 H21 M6 6 L8.5 8.5 M15.5 15.5 L18 18" />
    </svg>
  );
}

// The ReserveEase calendar mark (same drawing as Logos/reserveease-logo.svg).
export function LogoMark({ className = '' }) {
  return (
    <svg viewBox="262 266 652 652" fill="none" aria-hidden="true" focusable="false" className={`pointer-events-none select-none ${className}`}>
      <g strokeLinecap="round" strokeLinejoin="round">
        <path d="M302 388 L372 424 M410 302 L434 370" stroke="#FFD35C" strokeWidth="34" />
        <rect x="397" y="468" width="472" height="420" rx="78" fill="#FFFDF8" stroke="#1F2328" strokeWidth="36" />
        <path d="M400 590 H866" stroke="#1F2328" strokeWidth="32" />
        <path d="M520 412 V512 M752 412 V512" stroke="#1F2328" strokeWidth="40" />
      </g>
      <rect x="468" y="648" width="78" height="76" rx="14" fill="#B9CDF5" />
      <rect x="590" y="648" width="78" height="76" rx="14" fill="#B9CDF5" />
      <rect x="715" y="648" width="82" height="76" rx="14" fill="#2450B8" />
      <rect x="468" y="750" width="78" height="76" rx="14" fill="#B9CDF5" />
      <rect x="590" y="750" width="78" height="76" rx="14" fill="#B9CDF5" />
      <rect x="715" y="750" width="82" height="76" rx="14" fill="#B9CDF5" />
    </svg>
  );
}

export function Logo({ className = '' }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <LogoMark className="h-10 w-10" />
      <span className="font-hand text-3xl font-bold text-ink leading-none">ReserveEase</span>
    </span>
  );
}
