import express from 'express';
import { z } from 'zod';
import { db } from '../../config/firebase.js';
import { computeAvailability, DomainError } from '../domain/availability.js';
import { createBooking } from '../domain/booking.js';
import { createRateLimiter } from '../../middleware/rateLimit.js';
import { idSchema, publicBookingRequestSchema, slugSchema } from '../domain/schemas.js';
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
  SLOT_UNAVAILABLE: 409,
  IDEMPOTENCY_KEY_REUSED: 409,
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

      const { serviceId, staffId, date } = req.validated.query;
      const { business, service, staff } = await getBookingContext(db, published.businessId, serviceId, staffId);
      if (!business) throw new ApiError(404, 'BUSINESS_NOT_FOUND', 'Business not found');
      if (!service) throw new ApiError(404, 'SERVICE_NOT_FOUND', 'Service not found');
      if (!staff) throw new ApiError(404, 'STAFF_NOT_FOUND', 'Staff member not found');

      const busy = await getBusyIntervals(db, business.id, staff.id, [
        shiftLocalDate(date, -1), date, shiftLocalDate(date, 1),
      ]);
      const { status, slots } = computeAvailability({
        business, service, staff, localDate: date, busy, now: Date.now(),
      });

      res.json({
        data: { timezone: business.timezone, date, serviceId, staffId, status, slots },
        requestId: req.requestId,
      });
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

export default router;
