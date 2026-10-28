// POST /api/v1/billing/paddle/webhook: subscription changes from Paddle.
// Mounted before express.json because the signature covers the raw body.

import express from 'express';
import { db } from '../../config/firebase.js';
import { paddleConfig, verifyPaddleSignature } from '../billing/paddle.js';
import { applySubscriptionEvent } from '../billing/subscription.js';
import { ApiError } from './errors.js';
import { requestId } from './middleware.js';

const router = express.Router();

router.post('/', requestId, express.raw({ type: '*/*', limit: '256kb' }), async (req, res, next) => {
  try {
    const { webhookSecret } = paddleConfig();
    if (!webhookSecret) throw new ApiError(503, 'BILLING_NOT_CONFIGURED', 'Billing is not configured');
    // A non-2xx answer makes Paddle retry, which is what we want for a bad signature.
    if (!verifyPaddleSignature({ header: req.get('paddle-signature'), rawBody: req.body, secret: webhookSecret })) {
      throw new ApiError(401, 'INVALID_SIGNATURE', 'Invalid signature');
    }
    let event;
    try {
      event = JSON.parse(req.body.toString('utf8'));
    } catch {
      throw new ApiError(400, 'INVALID_INPUT', 'Request body is not valid JSON');
    }
    const result = await applySubscriptionEvent(db, event);
    console.log(`[${req.requestId}] paddle ${event.event_type} ${event.event_id}:`, result.applied ? result.status : `ignored (${result.reason})`);
    res.json({ data: { received: true }, requestId: req.requestId });
  } catch (error) {
    next(error);
  }
});

export default router;
