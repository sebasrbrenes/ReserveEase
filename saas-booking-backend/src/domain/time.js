// Time zone helpers built on Intl only. The business time zone governs
// schedules and local dates; the browser's zone never affects availability
// (master document, section 12.8).

const MINUTE = 60 * 1000;
const formatters = new Map();

const formatterFor = (timeZone) => {
  if (!formatters.has(timeZone)) {
    formatters.set(timeZone, new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    }));
  }
  return formatters.get(timeZone);
};

// Wall-clock fields of an instant in a zone.
export const localParts = (epochMs, timeZone) => {
  const parts = Object.fromEntries(
    formatterFor(timeZone).formatToParts(new Date(epochMs)).map((p) => [p.type, p.value])
  );
  return {
    year: Number(parts.year), month: Number(parts.month), day: Number(parts.day),
    hour: Number(parts.hour), minute: Number(parts.minute),
  };
};

// Offset of the zone at an instant, in ms (local - UTC).
const offsetAt = (epochMs, timeZone) => {
  const p = localParts(epochMs, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
  return asUtc - Math.floor(epochMs / MINUTE) * MINUTE;
};

export const parseLocalDate = (localDate) => {
  const [year, month, day] = localDate.split('-').map(Number);
  return { year, month, day };
};

// Converts a local date + minutes since midnight in a zone to a UTC instant.
// Returns null for a local time that does not exist (spring-forward gap).
// For an ambiguous time (fall-back overlap) returns the first occurrence.
export const zonedToUtc = (localDate, minutesOfDay, timeZone) => {
  const { year, month, day } = parseLocalDate(localDate);
  const naive = Date.UTC(year, month - 1, day, 0, minutesOfDay);
  const offsets = new Set([
    offsetAt(naive - 12 * 60 * MINUTE, timeZone),
    offsetAt(naive + 12 * 60 * MINUTE, timeZone),
  ]);
  const matches = [...offsets]
    .map((offset) => naive - offset)
    .filter((candidate) => offsetAt(candidate, timeZone) === naive - candidate)
    .sort((a, b) => a - b);
  return matches.length ? matches[0] : null;
};

// Local calendar date (YYYY-MM-DD) of an instant in a zone.
export const localDateOf = (epochMs, timeZone) => {
  const p = localParts(epochMs, timeZone);
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
};

// Day name of a local date, independent of any zone.
export const weekdayOf = (localDate) => {
  const { year, month, day } = parseLocalDate(localDate);
  return ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][
    new Date(Date.UTC(year, month - 1, day)).getUTCDay()
  ];
};

// Whole days from local date a to local date b.
export const daysBetween = (a, b) => {
  const toUtc = (d) => { const p = parseLocalDate(d); return Date.UTC(p.year, p.month - 1, p.day); };
  return Math.round((toUtc(b) - toUtc(a)) / (24 * 60 * MINUTE));
};

export const hhmmToMinutes = (t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));
export { MINUTE };

// Local date shifted by whole days.
export const shiftLocalDate = (localDate, days) => {
  const { year, month, day } = parseLocalDate(localDate);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
};
