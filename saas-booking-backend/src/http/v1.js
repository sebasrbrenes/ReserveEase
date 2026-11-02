import express from 'express';
import { z } from 'zod';
import { db } from '../../config/firebase.js';
import { computeAvailability, DomainError } from '../domain/availability.js';
import { createBooking } from '../domain/booking.js';
import {
  cancelAppointment, listAppointments, rescheduleAppointment, toApi, transitionAppointment, updateAppointmentDetails,
} from '../domain/appointments.js';
import { syncLegacyBusiness } from '../domain/legacySync.js';
import { AccountError, allAppointments, appointmentsCsv, deleteAccount } from '../domain/account.js';
import { isManageKeyValid } from '../domain/manageLink.js';
import { MINUTE } from '../domain/time.js';
import { retryFailedJobs } from '../notifications/worker.js';
import {
  createCheckoutTransaction, createPortalSession, isBillingConfigured, paddleConfig, PaddleError, updateSubscriptionItems,
} from '../billing/paddle.js';
import {
  accessFor, canChangeItems, enforcementFromEnv, hasAddon, itemsWithAddon, LIVE_STATUSES, subscriptionRef, toBillingView,
} from '../billing/subscription.js';
import {
  readSmsUsage, requestSms, smsAccountOf, smsAccountRef, SmsAccountError, smsRegistrationSchema, updateSmsSettings,
} from '../messaging/smsAccount.js';
import { SMS_CONSENT_VERSION, smsConsentText } from '../messaging/smsConsent.js';
import { getAuth } from 'firebase-admin/auth';
import firebaseApp from '../../config/firebase.js';
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

// Whether a business may take bookings and use the dashboard (billing/subscription.js).
const accessOf = async (businessId) => {
  const snap = await subscriptionRef(db, businessId).get();
  return accessFor(snap.data(), { enforcement: enforcementFromEnv(process.env, { billingConfigured: isBillingConfigured() }) });
};
// SMS reminders are offered to clients when the add-on is active, the
// business is approved and its reminders are on.
const smsOffered = async (businessId) => {
  const [sub, sms] = await db.getAll(subscriptionRef(db, businessId), smsAccountRef(db, businessId));
  const account = smsAccountOf(sms.data());
  return hasAddon(sub.data(), 'sms') && account.status === 'approved' && account.remindersEnabled;
};
const bookingsPaused = () => new ApiError(403, 'BOOKINGS_PAUSED', 'This business is not taking online bookings right now');

// Public profile and catalog of a published business (section 13.2).
router.get('/public/businesses/:slug', validate(slugParams, 'params'), async (req, res, next) => {
  try {
    const business = await getPublishedBusinessBySlug(db, req.validated.params.slug);
    if (!business) throw new ApiError(404, 'BUSINESS_NOT_FOUND', 'Business not found');
    // status is internal; only published businesses reach this point.
    const { status, ...publicFields } = business;
    // The booking form offers SMS reminders only when the business can send them.
    const sms = await smsOffered(business.businessId)
      ? { version: SMS_CONSENT_VERSION, text: smsConsentText(business.name, business.language) }
      : null;
    res.json({ data: { ...publicFields, smsConsent: sms }, requestId: req.requestId });
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
      if (!(await accessOf(published.businessId)).allowed) throw bookingsPaused();
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
      if (!(await accessOf(published.businessId)).allowed) throw bookingsPaused();

      const { created, result } = await createBooking(db, {
        businessId: published.businessId,
        command: req.validated.body,
        idempotencyKey: req.validated.headers['idempotency-key'],
        requestContext: { ip: req.ip, userAgent: req.get('user-agent') },
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

// Without an active subscription (once enforcement has started) the
// dashboard only reaches what is needed to subscribe or to take the data away.
const OPEN_WITHOUT_SUBSCRIPTION = [/^\/billing(\/|$)/, /^\/messaging(\/|$)/, /^\/appointments\/export$/];
priv.use(async (req, res, next) => {
  try {
    if (OPEN_WITHOUT_SUBSCRIPTION.some((re) => re.test(req.path))) return next();
    if (!(await accessOf(req.member.businessId)).allowed) {
      return next(new ApiError(402, 'SUBSCRIPTION_REQUIRED', 'An active subscription is required'));
    }
    return next();
  } catch (error) {
    return next(error);
  }
});

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
// SMS consent must come from the client on the public form, never from the business.
const adminBookingSchema = publicBookingRequestSchema.extend({
  privacyNoticeVersion: z.string().max(40).default('admin'),
  smsConsent: z.literal(false).default(false),
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

// Every appointment of the business as a CSV file, for the owner to keep.
priv.get('/appointments/export', requireOwner, handle(async (req, res) => {
  const appointments = (await allAppointments(db, req.member.businessId)).map(toApi);
  res.set('Content-Type', 'text/csv; charset=utf-8');
  res.set('Content-Disposition', 'attachment; filename="reserveease-appointments.csv"');
  res.set('Cache-Control', 'no-store');
  // The byte order mark makes Excel read accents correctly.
  res.send(`\uFEFF${appointmentsCsv(appointments)}`);
}));

// ---------------------------------------------------------------------------
// Subscription ($15 USD/month through Paddle). The browser only asks for a
// checkout or a portal link; the subscription itself changes only through the
// signed webhook (http/paddleWebhook.js).

// A function declaration so routes defined above can use it.
function requireOwner(req, res, next) {
  return req.member.role === 'owner'
    ? next()
    : next(new ApiError(403, 'FORBIDDEN', 'Only the owner can do this'));
}

const billingUnavailable = () => new ApiError(503, 'BILLING_NOT_CONFIGURED', 'Payments are not available yet');
const fromPaddle = (error) => {
  if (!(error instanceof PaddleError)) return error;
  console.error('Paddle error', error.status, error.code, error.message);
  return new ApiError(502, 'BILLING_PROVIDER_ERROR', 'The payment provider did not answer. Try again in a moment.');
};

const billingViewFor = async (businessId) => {
  const config = paddleConfig();
  const available = isBillingConfigured(config);
  const [subSnap, smsSnap] = await db.getAll(subscriptionRef(db, businessId), smsAccountRef(db, businessId));
  const subscription = subSnap.data();
  const view = toBillingView(subscription, {
    available,
    addonsAvailable: { sms: available && Boolean(config.catalog.addons.sms.priceId) },
    enforcement: enforcementFromEnv(process.env, { billingConfigured: available }),
  });
  const account = smsAccountOf(smsSnap.data());
  view.sms = {
    ...account,
    usage: view.addons.sms.active ? await readSmsUsage(db, businessId, subscription) : null,
  };
  return view;
};

priv.get('/billing', handle(async (req, res) => {
  res.json({ data: await billingViewFor(req.member.businessId), requestId: req.requestId });
}));

priv.post('/billing/checkout', requireOwner, handle(async (req, res) => {
  const config = paddleConfig();
  if (!isBillingConfigured(config)) throw billingUnavailable();
  const current = (await subscriptionRef(db, req.member.businessId).get()).data();
  if (LIVE_STATUSES.includes(current?.status)) {
    throw new ApiError(409, 'ALREADY_SUBSCRIBED', 'This business already has a subscription');
  }
  try {
    const transaction = await createCheckoutTransaction(config, {
      businessId: req.member.businessId, customerId: current?.customerId,
    });
    res.status(201).json({ data: { transactionId: transaction.id, environment: config.environment }, requestId: req.requestId });
  } catch (error) {
    throw fromPaddle(error);
  }
}));

priv.post('/billing/portal', requireOwner, handle(async (req, res) => {
  const config = paddleConfig();
  if (!isBillingConfigured(config)) throw billingUnavailable();
  const current = (await subscriptionRef(db, req.member.businessId).get()).data();
  if (!current?.customerId) throw new ApiError(404, 'NO_SUBSCRIPTION', 'This business has no subscription yet');
  try {
    const session = await createPortalSession(config, {
      customerId: current.customerId,
      subscriptionId: LIVE_STATUSES.includes(current.status) ? current.subscriptionId : undefined,
    });
    res.json({ data: { url: session.urls.general.overview }, requestId: req.requestId });
  } catch (error) {
    throw fromPaddle(error);
  }
}));

// SMS add-on ($10/month on top of Basic). It is added to the same Paddle
// subscription, so it renews on the plan's date; Paddle charges the rest of
// the current cycle now. The stored state changes only when Paddle's signed
// webhook confirms it, so the app polls GET /billing after these calls.
const changeSmsAddon = (add) => handle(async (req, res) => {
  const config = paddleConfig();
  const smsPriceId = config.catalog.addons.sms.priceId;
  if (!isBillingConfigured(config) || !smsPriceId) throw billingUnavailable();
  const businessId = req.member.businessId;
  const [subSnap, smsSnap] = await db.getAll(subscriptionRef(db, businessId), smsAccountRef(db, businessId));
  const subscription = subSnap.data();
  if (!subscription || !LIVE_STATUSES.includes(subscription.status)) {
    throw new ApiError(409, 'NO_SUBSCRIPTION', 'Subscribe to Basic before adding SMS');
  }
  if (!canChangeItems(subscription)) {
    throw new ApiError(409, 'SUBSCRIPTION_NOT_CHANGEABLE', 'The subscription cannot change right now');
  }
  const active = hasAddon(subscription, 'sms');
  if (add && active) throw new ApiError(409, 'ADDON_ALREADY_ACTIVE', 'SMS is already active');
  if (!add && !active) throw new ApiError(409, 'ADDON_NOT_ACTIVE', 'SMS is not active');
  // No charge before the carriers approve the business: it could not send anything.
  if (add && smsAccountOf(smsSnap.data()).status !== 'approved') {
    throw new ApiError(409, 'SMS_NOT_APPROVED', 'SMS needs carrier approval for this business first');
  }
  try {
    await updateSubscriptionItems(config, subscription.subscriptionId, itemsWithAddon(subscription, smsPriceId, { add }));
  } catch (error) {
    throw fromPaddle(error);
  }
  console.log(`[${req.requestId}] sms add-on ${add ? 'added' : 'removed'}`, { businessId });
  res.status(202).json({ data: { pending: true }, requestId: req.requestId });
});

priv.post('/billing/addons/sms', requireOwner, changeSmsAddon(true));
priv.delete('/billing/addons/sms', requireOwner, changeSmsAddon(false));

const fromSmsAccount = (error) => (error instanceof SmsAccountError ? new ApiError(409, error.code, error.message) : error);

// The owner asks for SMS: the business is queued for carrier registration.
priv.post('/messaging/sms/request', requireOwner, validate(smsRegistrationSchema, 'body'), handle(async (req, res) => {
  try {
    await requestSms(db, { businessId: req.member.businessId, actorUid: req.user.uid, registration: req.validated.body });
  } catch (error) {
    throw fromSmsAccount(error);
  }
  res.json({ data: await billingViewFor(req.member.businessId), requestId: req.requestId });
}));

priv.patch('/messaging/sms', requireOwner, validate(z.object({ remindersEnabled: z.boolean() }).strict(), 'body'),
  handle(async (req, res) => {
    await updateSmsSettings(db, { businessId: req.member.businessId, ...req.validated.body });
    res.json({ data: await billingViewFor(req.member.businessId), requestId: req.requestId });
  }));

// The signed-in owner's business, rebuilt from the settings screen (see
// domain/legacySync.js). Called by the app after loading or saving settings.
router.post('/me/business/sync', requireAuth, handle(async (req, res) => {
  const business = await syncLegacyBusiness(db, req.user.uid);
  res.json({ data: business, requestId: req.requestId });
}));

// Deleting the account needs a sign-in from the last few minutes, so a
// session left open on another device cannot do it.
const RECENT_SIGN_IN_SECONDS = 10 * 60;

router.delete('/me/account', requireAuth, validate(z.object({ confirm: z.literal(true) }).strict(), 'body'),
  handle(async (req, res) => {
    if (!(Date.now() / 1000 - Number(req.user.authTime) <= RECENT_SIGN_IN_SECONDS)) {
      throw new ApiError(401, 'RECENT_SIGN_IN_REQUIRED', 'Sign in again to delete the account');
    }
    try {
      await deleteAccount(db, getAuth(firebaseApp), req.user.uid);
    } catch (error) {
      if (error instanceof AccountError) throw new ApiError(409, error.code, error.message);
      throw error;
    }
    console.log('Account deleted', { requestId: req.requestId });
    res.json({ data: { deleted: true }, requestId: req.requestId });
  }));

export default router;
