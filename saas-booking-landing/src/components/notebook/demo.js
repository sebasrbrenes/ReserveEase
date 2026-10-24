// The demo business shown on the landing. Fictional, in Costa Rica like the app's demo data.
export const BUSINESS = 'Barbería La Esquina';

export const SERVICES = [
  { id: 'corte', name: 'Corte', minutes: 30, price: 6000 },
  { id: 'corte-barba', name: 'Corte y barba', minutes: 45, price: 9000 },
  { id: 'barba', name: 'Barba', minutes: 20, price: 4000 },
];

export const colones = (amount) =>
  new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC', maximumFractionDigits: 0 }).format(amount);

// The coming Saturday, so the agenda never shows a day that already passed.
export function nextSaturday(from = new Date()) {
  const d = new Date(from);
  d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7));
  return d;
}
