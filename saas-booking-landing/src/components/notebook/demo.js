// The demo businesses shown on the landing. Fictional, in Costa Rica like the app's demo data.
// Every scene reads the one picked in the "Tu negocio" scene, so the whole page speaks its language.
export const BUSINESSES = [
  {
    id: 'barberia',
    tab: 'barbería',
    name: 'Barbería La Esquina',
    place: 'San José',
    slug: 'barberia-la-esquina',
    services: [
      { id: 'corte', name: 'Corte', minutes: 30, price: 6000 },
      { id: 'corte-barba', name: 'Corte y barba', minutes: 45, price: 9000 },
      { id: 'barba', name: 'Barba', minutes: 20, price: 4000 },
    ],
    taken: ['Luis · barba', 'Andrés · corte', 'Diego · corte y barba'],
    night: ['Sofía reserva corte para el martes', 'Luis reserva barba para el sábado', 'Marta reserva corte y barba para hoy'],
  },
  {
    id: 'salon',
    tab: 'salón',
    name: 'Salón Aurora',
    place: 'Heredia',
    slug: 'salon-aurora',
    services: [
      { id: 'corte', name: 'Corte y secado', minutes: 60, price: 12000 },
      { id: 'tinte', name: 'Tinte', minutes: 90, price: 25000 },
      { id: 'peinado', name: 'Peinado', minutes: 45, price: 10000 },
    ],
    taken: ['Sofía · tinte', 'Valeria · peinado', 'Ana · corte y secado'],
    night: ['Valeria reserva tinte para el martes', 'Ana reserva peinado para el sábado', 'Lucía reserva corte y secado para hoy'],
  },
  {
    id: 'unas',
    tab: 'uñas',
    name: 'Estudio Coral',
    place: 'Escazú',
    slug: 'estudio-coral',
    services: [
      { id: 'manicura', name: 'Manicura', minutes: 45, price: 8000 },
      { id: 'acrilicas', name: 'Uñas acrílicas', minutes: 90, price: 18000 },
      { id: 'pedicura', name: 'Pedicura', minutes: 60, price: 10000 },
    ],
    taken: ['Daniela · manicura', 'Laura · pedicura', 'Camila · acrílicas'],
    night: ['Daniela reserva acrílicas para el martes', 'Laura reserva manicura para el sábado', 'Paola reserva pedicura para hoy'],
  },
  {
    id: 'consultorio',
    tab: 'consultorio',
    name: 'Fisioterapia Mora',
    place: 'Cartago',
    slug: 'fisioterapia-mora',
    services: [
      { id: 'sesion', name: 'Sesión', minutes: 45, price: 18000 },
      { id: 'primera', name: 'Primera consulta', minutes: 60, price: 25000 },
      { id: 'masaje', name: 'Masaje terapéutico', minutes: 60, price: 20000 },
    ],
    taken: ['Jorge · sesión', 'Marta · primera consulta', 'Pablo · masaje'],
    night: ['Jorge reserva sesión para el martes', 'Pablo reserva masaje para el sábado', 'Elena reserva primera consulta para hoy'],
  },
];

export const colones = (amount) =>
  new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC', maximumFractionDigits: 0 }).format(amount);

// The coming Saturday, so the agenda never shows a day that already passed.
export function nextSaturday(from = new Date()) {
  const d = new Date(from);
  d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7));
  return d;
}
