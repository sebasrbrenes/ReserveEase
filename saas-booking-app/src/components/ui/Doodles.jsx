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

// The ReserveEase calendar mark, redrawn with a marker.
export function LogoMark({ className = '' }) {
  return (
    <svg viewBox="0 0 48 48" strokeWidth="3" className={withClass(className)} {...decorative}>
      <path d="M9 13 C 9 10, 11 9, 14 9 L 35 8.5 C 38 8.5, 39.5 10, 39.5 13 L 40 36 C 40 39, 38 40.5, 35 40.5 L 13 40 C 10 40, 8.5 38.5, 8.5 35.5 Z" className="text-ink" />
      <path d="M9 19 C 18 18, 30 19.5, 39.5 18.5" className="text-ink" />
      <path d="M17 5 L 17.5 12 M31 5 L 30.5 12" className="text-ink" />
      <path d="M15 26 L 15.5 26 M21 26 C 25 25.5, 29 26.5, 33 26 M15 33 C 19 32.5, 23 33.5, 27 33 M32.5 33 L 33 33" className="text-marker" />
    </svg>
  );
}

export function Logo({ className = '' }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <LogoMark className="h-9 w-9" />
      <span className="font-hand text-3xl font-bold text-ink leading-none">ReserveEase</span>
    </span>
  );
}
