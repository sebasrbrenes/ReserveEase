// POST /api/v1/messaging/telnyx/webhook: delivery reports and replies from
// Telnyx. Mounted before express.json because the signature covers the raw body.

import express from 'express';
import { db } from '../../config/firebase.js';
import { telnyxConfig, verifyTelnyxSignature } from '../messaging/telnyx.js';
import { applyTelnyxEvent } from '../messaging/inbound.js';
import { ApiError } from './errors.js';
import { requestId } from './middleware.js';

const router = express.Router();

router.post('/', requestId, express.raw({ type: '*/*', limit: '256kb' }), async (req, res, next) => {
  try {
    const { publicKey } = telnyxConfig();
    if (!publicKey) throw new ApiError(503, 'SMS_NOT_CONFIGURED', 'SMS is not configured');
    const valid = verifyTelnyxSignature({
      signature: req.get('telnyx-signature-ed25519'),
      timestamp: req.get('telnyx-timestamp'),
      rawBody: req.body,
      publicKey,
    });
    if (!valid) throw new ApiError(401, 'INVALID_SIGNATURE', 'Invalid signature');
    let body;
    try {
      body = JSON.parse(req.body.toString('utf8'));
    } catch {
      throw new ApiError(400, 'INVALID_INPUT', 'Request body is not valid JSON');
    }
    const result = await applyTelnyxEvent(db, body);
    console.log(`[${req.requestId}] telnyx ${body?.data?.event_type}: ${result}`);
    res.json({ data: { received: true }, requestId: req.requestId });
  } catch (error) {
    next(error);
  }
});

export default router;
