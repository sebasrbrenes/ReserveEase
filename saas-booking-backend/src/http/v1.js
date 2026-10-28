import express from 'express';
import { z } from 'zod';
import { db } from '../../config/firebase.js';
import { computeAvailability, DomainError } from '../domain/availability.js';
import { createBooking } from '../domain/booking.js';
import {
  cancelAppointment, listAppointments, rescheduleAppointment, toApi, transitionAppointment, updateAppointmentDetails,
} from '../domain/appointments.js';
import { syncLegacyBusiness } from '../domain/legacySync.js';
import { isManageKeyValid } from '../domain/manageLink.js';
import { MINUTE } from '../domain/time.js';
import { retryFailedJobs } from '../notifications/worker.js';
import { requireAuth, requireMember } from './auth.js';
import { createRateLimiter } from '../../middleware/rateLimit.js';
import {
  idSchema, languageSchema, phoneE164Schema, publicBookingRequestSchema, slugSchema,
} from '../domain/schemas.js';
import { shiftLocalDate } from '../domain/time.js';
import { getBookingContext, getBusyIntervals, getPublishedBusinessBySlug } from '../repositories/businesses.js';
import { ApiError } from './errors.js';
import { requestId, validate } from './middleware.js';

const router = express.Router();
router.use(requestId);

// HTTP status for domain error codes; anything else is 422.
const DOMAIN_STATUS = {
  BUSINESS_NOT_FOUND: 404,
  SERVICE_NOT_FOUND: 404,
  STAFF_NOT_FOUND: 404,
  APPOINTMENT_NOT_FOUND: 404,
  SLOT_UNAVAILABLE: 409,
  IDEMPOTENCY_KEY_REUSED: 409,
  VERSION_CONFLICT: 409,
  TOO_LATE_TO_CHANGE: 409,
};
const toApiError = (error) => (error instanceof DomainError
  ? new ApiError(DOMAIN_STATUS[error.code] || 422, error.code, error.message)
  : error);

const slugParams = z.object({ slug: slugSchema });

// Public profile and catalog of a published business (section 13.2).
router.get('/public/businesses/:slug', validate(slugParams, 'params'), async (req, res, next) => {
  try {
    const business = await getPublishedBusinessBySlug(db, req.validated.params.slug);
    if (!business) throw new ApiError(404, 'BUSINESS_NOT_FOUND', 'Business not found');
    // status is internal; only published businesses reach this point.
    const { status, ...publicFields } = business;
    res.json({ data: publicFields, requestId: req.requestId });
  } catch (error) {
    next(error);
  }
});

const availabilityQuery = z.object({
  serviceId: idSchema,
  staffId: idSchema,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD').refine((d) => shiftLocalDate(d, 0) === d, 'Invalid date'),
});

// Slots of one service and staff member on a local date, for a business id.
const availabilityFor = async (businessId, { serviceId, staffId, date }, excludeAppointmentId) => {
  const { business, service, staff } = await getBookingContext(db, businessId, serviceId, staffId);
  if (!business) throw new ApiError(404, 'BUSINESS_NOT_FOUND', 'Business not found');
  if (!service) throw new ApiError(404, 'SERVICE_NOT_FOUND', 'Service not found');
  if (!staff) throw new ApiError(404, 'STAFF_NOT_FOUND', 'Staff member not found');

  const busy = await getBusyIntervals(db, business.id, staff.id, [
    shiftLocalDate(date, -1), date, shiftLocalDate(date, 1),
  ], excludeAppointmentId);
  const { status, slots } = computeAvailability({
    business, service, staff, localDate: date, busy, now: Date.now(),
  });
  return { timezone: business.timezone, date, serviceId, staffId, status, slots };
};

// Start times a staff member can take a service on a local date (section 13.2).
// Returns only slots: never other clients' names, contacts or appointments.
router.get(
  '/public/businesses/:slug/availability',
  validate(slugParams, 'params'),
  validate(availabilityQuery, 'query'),
  async (req, res, next) => {
    try {
      const published = await getPublishedBusinessBySlug(db, req.validated.params.slug);
      if (!published) throw new ApiError(404, 'BUSINESS_NOT_FOUND', 'Business not found');
      const data = await availabilityFor(published.businessId, req.validated.query);
      res.json({ data, requestId: req.requestId });
    } catch (error) {
      return next(toApiError(error));
    }
  }
);

const bookingRateLimit = createRateLimiter({
  windowMs: Number(process.env.BOOKING_RATE_WINDOW_MS) || 15 * 60 * 1000,
  max: Number(process.env.BOOKING_RATE_MAX) || 20,
  onLimit: (req, res, next) => next(new ApiError(429, 'RATE_LIMITED', 'Too many booking attempts. Try again later.')),
});

const idempotencyHeaders = z.object({
  'idempotency-key': z.string({ required_error: 'Idempotency-Key header is required' })
    .regex(/^[A-Za-z0-9_-]{8,128}$/, 'Idempotency-Key must be 8-128 letters, digits, - or _'),
}).passthrough();

// Creates a confirmed booking atomically (sections 12.3, 13.3).
// 201 for a new booking; 200 with the same reference for a recognized retry.
router.post(
  '/public/businesses/:slug/bookings',
  bookingRateLimit,
  validate(slugParams, 'params'),
  validate(idempotencyHeaders, 'headers'),
  validate(publicBookingRequestSchema, 'body'),
  async (req, res, next) => {
    try {
      const published = await getPublishedBusinessBySlug(db, req.validated.params.slug);
      if (!published) throw new ApiError(404, 'BUSINESS_NOT_FOUND', 'Business not found');

      const { created, result } = await createBooking(db, {
        businessId: published.businessId,
        command: req.validated.body,
        idempotencyKey: req.validated.headers['idempotency-key'],
      });
      res.status(created ? 201 : 200).json({ data: result, requestId: req.requestId });
    } catch (error) {
      next(toApiError(error));
    }
  }
);

// ---------------------------------------------------------------------------
// The client's own appointment, opened from the link in their emails
// (domain/manageLink.js). The key comes as ?k= on every request.

const manageParams = z.object({ businessId: idSchema, appointmentId: idSchema });
const manageQuery = z.object({ k: z.string().min(16).max(100) }).passthrough();

const manageRateLimit = createRateLimiter({
  windowMs: Number(process.env.MANAGE_RATE_WINDOW_MS) || 15 * 60 * 1000,
  max: Number(process.env.MANAGE_RATE_MAX) || 60,
  onLimit: (req, res, next) => next(new ApiError(429, 'RATE_LIMITED', 'Too many requests. Try again later.')),
});

const DEFAULT_CLIENT_NOTICE_MINUTES = 120;

// Loads the appointment the link points at; a wrong key is a 404, like a missing one.
const loadManaged = async (req) => {
  const { businessId, appointmentId } = req.validated.params;
  const base = db.doc(`businesses/${businessId}`);
  const [aptSnap, bizSnap] = await db.getAll(base.collection('appointments').doc(appointmentId), base);
  const apt = aptSnap.exists ? aptSnap.data() : null;
  if (!apt || !bizSnap.exists || !isManageKeyValid(apt, req.validated.query.k)) {
    throw new ApiError(404, 'APPOINTMENT_NOT_FOUND', 'Appointment not found');
  }
  const business = bizSnap.data();
  const noticeMinutes = business.bookingPolicy?.cancellationNoticeMinutes ?? DEFAULT_CLIENT_NOTICE_MINUTES;
  return { apt, business, noticeMinutes };
};

// What the client may see: their appointment, never notes or other clients.
const toClientView = ({ apt, business, noticeMinutes }, nowMs = Date.now()) => {
  const startsAtMs = apt.startsAt.toMillis();
  const changeableUntilMs = startsAtMs - noticeMinutes * MINUTE;
  return {
    id: apt.id,
    status: apt.status,
    startsAt: apt.startsAt.toDate().toISOString(),
    endsAt: apt.endsAt.toDate().toISOString(),
    timezone: apt.businessTimezone,
    serviceName: apt.serviceSnapshot?.name ?? '',
    durationMinutes: apt.serviceSnapshot?.durationMinutes ?? null,
    staffName: apt.staffSnapshot?.displayName ?? '',
    clientName: apt.client?.name ?? '',
    businessName: business.name ?? '',
    businessSlug: business.status === 'published' ? business.slug ?? null : null,
    language: languageSchema.parse(business.language),
    version: apt.version,
    changeableUntil: new Date(changeableUntilMs).toISOString(),
    canChange: apt.status === 'confirmed' && nowMs <= changeableUntilMs,
  };
};

const managed = express.Router({ mergeParams: true });
router.use(
  '/public/appointments/:businessId/:appointmentId',
  manageRateLimit,
  validate(manageParams, 'params'),
  validate(manageQuery, 'query'),
  managed,
);

managed.get('/', async (req, res, next) => {
  try {
    res.json({ data: toClientView(await loadManaged(req)), requestId: req.requestId });
  } catch (error) {
    next(toApiError(error));
  }
});

managed.get('/availability', validate(manageQuery.extend({ date: availabilityQuery.shape.date }), 'query'), async (req, res, next) => {
  try {
    const { apt } = await loadManaged(req);
    const data = await availabilityFor(apt.businessId, {
      serviceId: apt.serviceId, staffId: apt.staffId, date: req.validated.query.date,
    }, apt.id);
    res.json({ data, requestId: req.requestId });
  } catch (error) {
    next(toApiError(error));
  }
});

managed.post('/cancel', validate(z.object({ expectedVersion: z.number().int().min(1) }).strict(), 'body'),
  async (req, res, next) => {
    try {
      const ctx = await loadManaged(req);
      const apt = await cancelAppointment(db, {
        businessId: ctx.apt.businessId, appointmentId: ctx.apt.id, expectedVersion: req.validated.body.expectedVersion,
        reason: 'Cancelada por el cliente', actorUid: 'client', clientNoticeMinutes: ctx.noticeMinutes,
      });
      res.json({ data: toClientView({ ...ctx, apt }), requestId: req.requestId });
    } catch (error) {
      next(toApiError(error));
    }
  });

managed.post('/reschedule', validate(z.object({
  expectedVersion: z.number().int().min(1),
  startsAt: publicBookingRequestSchema.shape.startsAt,
}).strict(), 'body'), async (req, res, next) => {
  try {
    const ctx = await loadManaged(req);
    const apt = await rescheduleAppointment(db, {
      businessId: ctx.apt.businessId, appointmentId: ctx.apt.id, ...req.validated.body,
      actorUid: 'client', clientNoticeMinutes: ctx.noticeMinutes,
    });
    res.json({ data: toClientView({ ...ctx, apt }), requestId: req.requestId });
  } catch (error) {
    next(toApiError(error));
  }
});

// ---------------------------------------------------------------------------
// Private routes for business members (section 13.4). Business id comes from
// the route and is checked against membership.

const localDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD')
  .refine((d) => shiftLocalDate(d, 0) === d, 'Invalid date');
const businessParams = z.object({ businessId: idSchema });
const appointmentParams = z.object({ businessId: idSchema, appointmentId: idSchema });
const versioned = { expectedVersion: z.number().int().min(1) };

const priv = express.Router({ mergeParams: true });
router.use('/businesses/:businessId', validate(businessParams, 'params'), requireAuth, requireMember, priv);

const handle = (fn) => async (req, res, next) => {
  try {
    await fn(req, res);
  } catch (error) {
    next(toApiError(error));
  }
};

const listQuery = z.object({ from: localDateSchema, to: localDateSchema })
  .refine((q) => q.from <= q.to, { message: 'from must not be after to', path: ['to'] });

priv.get('/appointments', validate(listQuery, 'query'), handle(async (req, res) => {
  const { from, to } = req.validated.query;
  const appointments = await listAppointments(db, { businessId: req.member.businessId, fromDate: from, toDate: to });
  res.json({ data: appointments.map(toApi), requestId: req.requestId });
}));

// Same slots for the dashboard; when rescheduling, the appointment being
// moved does not block its own time.
const privateAvailabilityQuery = availabilityQuery.extend({ excludeAppointmentId: idSchema.optional() });
priv.get('/availability', validate(privateAvailabilityQuery, 'query'), handle(async (req, res) => {
  const { excludeAppointmentId, ...query } = req.validated.query;
  const data = await availabilityFor(req.member.businessId, query, excludeAppointmentId);
  res.json({ data, requestId: req.requestId });
}));

// Administrative booking: same rules, locks and idempotency as a public one.
const adminBookingSchema = publicBookingRequestSchema.extend({
  privacyNoticeVersion: z.string().max(40).default('admin'),
});
priv.post(
  '/appointments',
  validate(idempotencyHeaders, 'headers'),
  validate(adminBookingSchema, 'body'),
  handle(async (req, res) => {
    const { created, result } = await createBooking(db, {
      businessId: req.member.businessId,
      command: req.validated.body,
      idempotencyKey: req.validated.headers['idempotency-key'],
      source: 'admin',
    });
    res.status(created ? 201 : 200).json({ data: result, requestId: req.requestId });
  })
);

const detailsSchema = z.object({
  ...versioned,
  client: z.object({
    name: z.string().trim().min(1).max(100).optional(),
    email: z.string().trim().email().max(200).optional(),
    phoneE164: phoneE164Schema.nullable().optional(),
  }).strict().optional(),
  notes: z.string().max(500).optional(),
}).strict();

priv.patch('/appointments/:appointmentId', validate(appointmentParams, 'params'), validate(detailsSchema, 'body'),
  handle(async (req, res) => {
    const { expectedVersion, ...changes } = req.validated.body;
    const apt = await updateAppointmentDetails(db, {
      businessId: req.member.businessId, appointmentId: req.validated.params.appointmentId,
      expectedVersion, changes, actorUid: req.user.uid,
    });
    res.json({ data: toApi(apt), requestId: req.requestId });
  }));

const rescheduleSchema = z.object({
  ...versioned,
  startsAt: publicBookingRequestSchema.shape.startsAt,
  staffId: idSchema.optional(),
}).strict();

priv.post('/appointments/:appointmentId/reschedule', validate(appointmentParams, 'params'), validate(rescheduleSchema, 'body'),
  handle(async (req, res) => {
    const apt = await rescheduleAppointment(db, {
      businessId: req.member.businessId, appointmentId: req.validated.params.appointmentId,
      ...req.validated.body, actorUid: req.user.uid,
    });
    res.json({ data: toApi(apt), requestId: req.requestId });
  }));

const cancelSchema = z.object({ ...versioned, reason: z.string().max(200).default('') }).strict();

priv.post('/appointments/:appointmentId/cancel', validate(appointmentParams, 'params'), validate(cancelSchema, 'body'),
  handle(async (req, res) => {
    const apt = await cancelAppointment(db, {
      businessId: req.member.businessId, appointmentId: req.validated.params.appointmentId,
      ...req.validated.body, actorUid: req.user.uid,
    });
    res.json({ data: toApi(apt), requestId: req.requestId });
  }));

const transitionSchema = z.object({ ...versioned, to: z.enum(['completed', 'no_show']) }).strict();

priv.post('/appointments/:appointmentId/transition', validate(appointmentParams, 'params'), validate(transitionSchema, 'body'),
  handle(async (req, res) => {
    const apt = await transitionAppointment(db, {
      businessId: req.member.businessId, appointmentId: req.validated.params.appointmentId,
      ...req.validated.body, actorUid: req.user.uid,
    });
    res.json({ data: toApi(apt), requestId: req.requestId });
  }));

// Puts the failed notifications of an appointment back in the queue.
priv.post('/appointments/:appointmentId/notifications/retry', validate(appointmentParams, 'params'),
  handle(async (req, res) => {
    const requeued = await retryFailedJobs(db, {
      businessId: req.member.businessId, appointmentId: req.validated.params.appointmentId,
    });
    res.json({ data: { requeued }, requestId: req.requestId });
  }));

// The signed-in owner's business, rebuilt from the settings screen (see
// domain/legacySync.js). Called by the app after loading or saving settings.
router.post('/me/business/sync', requireAuth, handle(async (req, res) => {
  const business = await syncLegacyBusiness(db, req.user.uid);
  res.json({ data: business, requestId: req.requestId });
}));

export default router;
