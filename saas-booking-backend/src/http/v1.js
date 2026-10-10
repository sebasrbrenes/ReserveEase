import express from 'express';
import { z } from 'zod';
import { db } from '../../config/firebase.js';
import { slugSchema } from '../domain/schemas.js';
import { getPublishedBusinessBySlug } from '../repositories/businesses.js';
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

export default router;
