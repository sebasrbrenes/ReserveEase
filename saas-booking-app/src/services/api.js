// Client for the booking API (/api/v1). Every booking change goes through it:
// the browser never writes appointments to Firestore directly.
import { auth } from '../firebase/config';

// A trailing slash in the Vercel variable would turn paths into //api/v1.
const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001').trim().replace(/\/+$/, '');

export class ApiError extends Error {
  constructor(status, code, message, fields) {
    super(message);
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

const request = async (method, path, { body, headers = {}, signedIn = false } = {}) => {
  const allHeaders = { ...headers };
  if (body !== undefined) allHeaders['Content-Type'] = 'application/json';
  if (signedIn) {
    const user = auth.currentUser;
    if (!user) throw new ApiError(401, 'UNAUTHENTICATED', 'Inicia sesión para continuar');
    allHeaders.Authorization = `Bearer ${await user.getIdToken()}`;
  }
  let response;
  try {
    response = await fetch(`${BACKEND_URL}/api/v1${path}`, {
      method,
      headers: allHeaders,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'NETWORK', 'No pudimos conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.');
  }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = payload.error || {};
    throw new ApiError(response.status, error.code || 'UNKNOWN', error.message || 'Algo salió mal', error.fields);
  }
  return payload.data;
};

const qs = (params) => new URLSearchParams(
  Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
).toString();

// Public booking page
export const getPublicBusiness = (slug) => request('GET', `/public/businesses/${encodeURIComponent(slug)}`);
export const getPublicAvailability = (slug, query) =>
  request('GET', `/public/businesses/${encodeURIComponent(slug)}/availability?${qs(query)}`);
export const createPublicBooking = (slug, booking, idempotencyKey) =>
  request('POST', `/public/businesses/${encodeURIComponent(slug)}/bookings`, {
    body: booking,
    headers: { 'Idempotency-Key': idempotencyKey },
  });

// The client's own appointment, from the link in their emails (?k= key)
const managed = (businessId, id, key, action = '', extra = {}) =>
  `/public/appointments/${encodeURIComponent(businessId)}/${encodeURIComponent(id)}${action}?${qs({ k: key, ...extra })}`;
export const getManagedAppointment = (businessId, id, key) => request('GET', managed(businessId, id, key));
export const getManagedAvailability = (businessId, id, key, date) =>
  request('GET', managed(businessId, id, key, '/availability', { date }));
export const cancelManagedAppointment = (businessId, id, key, body) =>
  request('POST', managed(businessId, id, key, '/cancel'), { body });
export const rescheduleManagedAppointment = (businessId, id, key, body) =>
  request('POST', managed(businessId, id, key, '/reschedule'), { body });

// Owner dashboard
export const syncMyBusiness = () => request('POST', '/me/business/sync', { signedIn: true });

const biz = (businessId, path) => `/businesses/${encodeURIComponent(businessId)}${path}`;
const apt = (businessId, id, action = '') => biz(businessId, `/appointments/${encodeURIComponent(id)}${action}`);

export const listAppointments = (businessId, from, to) =>
  request('GET', biz(businessId, `/appointments?${qs({ from, to })}`), { signedIn: true });
export const getAvailability = (businessId, query) =>
  request('GET', biz(businessId, `/availability?${qs(query)}`), { signedIn: true });
export const createAppointment = (businessId, booking, idempotencyKey) =>
  request('POST', biz(businessId, '/appointments'), {
    body: booking, headers: { 'Idempotency-Key': idempotencyKey }, signedIn: true,
  });
export const updateAppointment = (businessId, id, body) =>
  request('PATCH', apt(businessId, id), { body, signedIn: true });
export const rescheduleAppointment = (businessId, id, body) =>
  request('POST', apt(businessId, id, '/reschedule'), { body, signedIn: true });
export const cancelAppointment = (businessId, id, body) =>
  request('POST', apt(businessId, id, '/cancel'), { body, signedIn: true });
export const transitionAppointment = (businessId, id, body) =>
  request('POST', apt(businessId, id, '/transition'), { body, signedIn: true });

// What to tell the person about each field the API can reject.
const FIELD_MESSAGES = {
  'client.name': 'Escribe el nombre.',
  'client.email': 'Escribe un correo válido, por ejemplo nombre@ejemplo.com.',
  'client.phoneE164': 'Revisa el teléfono: escríbelo con el código de país, por ejemplo +506 8888 7777.',
  notes: 'Las notas pueden tener hasta 500 caracteres.',
};

// The API's field errors as { path: message } for the person to read.
export const fieldErrors = (error) => Object.fromEntries(
  (error?.code === 'INVALID_INPUT' ? error.fields || [] : [])
    .map(({ path }) => [path, FIELD_MESSAGES[path]])
    .filter(([, message]) => message)
);

// Messages for the error codes a person can act on.
export const errorMessage = (error) => {
  switch (error?.code) {
    case 'INVALID_INPUT': {
      const [first] = Object.values(fieldErrors(error));
      return first || 'Algunos datos no son válidos. Revisa el formulario e inténtalo de nuevo.';
    }
    case 'SLOT_UNAVAILABLE': return 'Alguien acaba de tomar esa hora. Elige otra.';
    case 'SLOT_NOT_OFFERED': return 'Esa hora ya no está disponible. Elige otra.';
    case 'VERSION_CONFLICT': return 'Esta cita cambió en otro lugar. Actualizamos los datos; inténtalo de nuevo.';
    case 'TOO_EARLY': return 'Esto solo se puede hacer cuando la cita ya empezó.';
    case 'INVALID_TRANSITION': return 'Esta cita ya no se puede cambiar de esa forma.';
    case 'TOO_LATE_TO_CHANGE': return 'Ya es tarde para cambiar esta cita en línea. Contacta al negocio.';
    case 'BUSINESS_NOT_FOUND': return 'Esta página de reservas no está disponible.';
    case 'EMAIL_NOT_VERIFIED': return 'Verifica tu correo para continuar.';
    case 'RATE_LIMITED': return 'Demasiados intentos. Espera un momento e inténtalo de nuevo.';
    default: return 'Algo salió mal. Inténtalo de nuevo.';
  }
};
export const retryNotifications = (businessId, id) =>
  request('POST', apt(businessId, id, '/notifications/retry'), { signedIn: true });
