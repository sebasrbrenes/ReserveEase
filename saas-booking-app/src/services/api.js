// Client for the booking API (/api/v1). Every booking change goes through it:
// the browser never writes appointments to Firestore directly.
import { auth } from '../firebase/config';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

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
    if (!user) throw new ApiError(401, 'UNAUTHENTICATED', 'Sign in required');
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
    throw new ApiError(0, 'NETWORK', 'Could not reach the server. Check your connection and try again.');
  }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = payload.error || {};
    throw new ApiError(response.status, error.code || 'UNKNOWN', error.message || 'Something went wrong', error.fields);
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

// Messages for the error codes a person can act on.
export const errorMessage = (error) => {
  switch (error?.code) {
    case 'SLOT_UNAVAILABLE': return 'That time was just taken. Please choose another one.';
    case 'SLOT_NOT_OFFERED': return 'That time is no longer available. Please choose another one.';
    case 'VERSION_CONFLICT': return 'This appointment was changed elsewhere. The list has been refreshed; try again.';
    case 'TOO_EARLY': return 'This can only be done once the appointment has started.';
    case 'INVALID_TRANSITION': return 'This appointment can no longer be changed that way.';
    case 'BUSINESS_NOT_FOUND': return 'This booking page is not available.';
    case 'EMAIL_NOT_VERIFIED': return 'Verify your email to continue.';
    case 'RATE_LIMITED': return 'Too many attempts. Please wait a moment and try again.';
    default: return error?.message || 'Something went wrong. Please try again.';
  }
};
