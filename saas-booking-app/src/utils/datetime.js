// Dates and times are shown in the business time zone, never the browser's,
// so a client in another zone sees the same times as the business.

const pad = (n) => String(n).padStart(2, '0');

// Calendar date picked in a date picker (browser-local Date) -> "YYYY-MM-DD".
export const toLocalDateString = (date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

// "YYYY-MM-DD" -> Date at local midnight, for date pickers.
export const fromLocalDateString = (value) => {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d);
};

// Today's date in a time zone.
export const todayIn = (timeZone) => {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date()).map((p) => [p.type, p.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
};

export const shiftDate = (localDate, days) => {
  const [y, m, d] = localDate.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
};

// Interface language and number/date conventions.
export const LOCALE = 'es-CR';

export const formatTime = (iso, timeZone) =>
  new Intl.DateTimeFormat(LOCALE, { timeZone, hour: 'numeric', minute: '2-digit' }).format(new Date(iso));

// "YYYY-MM-DD" -> "lunes, 12 de octubre de 2026" (no time zone involved).
export const formatLocalDate = (localDate, options = { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) => {
  const [y, m, d] = localDate.split('-').map(Number);
  return new Intl.DateTimeFormat(LOCALE, { ...options, timeZone: 'UTC' }).format(new Date(Date.UTC(y, m - 1, d)));
};

// Spanish dates start in lower case; titles start with a capital.
export const capitalize = (text) => text.charAt(0).toUpperCase() + text.slice(1);

export const formatMoney = (minor, currency) => {
  try {
    return new Intl.NumberFormat(LOCALE, { style: 'currency', currency }).format(minor / 100);
  } catch {
    return `${(minor / 100).toFixed(2)} ${currency}`;
  }
};
