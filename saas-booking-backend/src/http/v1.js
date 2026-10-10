import express from 'express';
import { z } from 'zod';
import { db } from '../../config/firebase.js';
import { computeAvailability, DomainError } from '../domain/availability.js';
import { idSchema, slugSchema } from '../domain/schemas.js';
import { shiftLocalDate } from '../domain/time.js';
import { getBookingContext, getBusyIntervals, getPublishedBusinessBySlug } from '../repositories/businesses.js';
import { ApiError } from './errors.js';
import { requestId, validate } from './middleware.js';

const router = express.Router();
router.use(requestId);

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
      if (error instanceof DomainError) return next(new ApiError(422, error.code, error.message));
      return next(error);
    }
  }
);

export default router;
