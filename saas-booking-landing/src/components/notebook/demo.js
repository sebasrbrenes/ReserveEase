// The demo businesses shown on the landing live in the copy of each language
// (src/i18n/en.js and es.js). Every scene reads the one picked in the
// "Tu negocio" scene, so the whole page speaks its language.

// The coming Saturday, so the agenda never shows a day that already passed.
export function nextSaturday(from = new Date()) {
  const d = new Date(from);
  d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7));
  return d;
}
