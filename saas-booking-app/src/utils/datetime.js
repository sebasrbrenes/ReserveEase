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

// Number and date conventions of each language: English as in the United
// States, Spanish as in Costa Rica. The interface follows the owner's choice
// (i18n/language.js); the client pages pass the business's locale.
export const LOCALE = 'es-CR';
export const localeFor = (language) => (language === 'en' ? 'en-US' : LOCALE);

let uiLocale = localeFor('en');
export const setUiLocale = (locale) => { uiLocale = locale; };

export const formatTime = (iso, timeZone, locale = uiLocale) =>
  new Intl.DateTimeFormat(locale, { timeZone, hour: 'numeric', minute: '2-digit' }).format(new Date(iso));

// "YYYY-MM-DD" -> "lunes, 12 de octubre de 2026" (no time zone involved).
export const formatLocalDate = (localDate, options = { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }, locale = uiLocale) => {
  const [y, m, d] = localDate.split('-').map(Number);
  return new Intl.DateTimeFormat(locale, { ...options, timeZone: 'UTC' }).format(new Date(Date.UTC(y, m - 1, d)));
};

// Spanish dates start in lower case; titles start with a capital.
export const capitalize = (text) => text.charAt(0).toUpperCase() + text.slice(1);

export const formatMoney = (minor, currency, locale = uiLocale) => {
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(minor / 100);
  } catch {
    return `${(minor / 100).toFixed(2)} ${currency}`;
  }
};
