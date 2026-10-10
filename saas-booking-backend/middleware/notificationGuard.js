// Interim protection for the email/SMS routes until notifications are
// derived server-side from persisted bookings (see plan, stage E).
//
// - NOTIFICATIONS_MODE: anything other than "live" answers without contacting
//   SendGrid/Twilio, so a fresh or demo deployment cannot send real messages.
// - Per-IP rate limit, so the routes cannot be used to send messages in bulk.

import { createRateLimiter } from './rateLimit.js';

const isLive = () => process.env.NOTIFICATIONS_MODE === 'live';

const rateLimit = createRateLimiter({
  windowMs: Number(process.env.NOTIFICATIONS_RATE_WINDOW_MS) || 15 * 60 * 1000,
  max: Number(process.env.NOTIFICATIONS_RATE_MAX) || 10,
  onLimit: (req, res) => res.status(429).json({ success: false, error: 'Too many requests' }),
});

const mockUnlessLive = (req, res, next) => {
  if (isLive()) return next();
  // Log only the route; request bodies contain personal data.
  console.log(`[notifications:mock] ${req.method} ${req.baseUrl}${req.path} not sent`);
  return res.json({ success: true, mocked: true, message: 'Notification not sent (mock mode)' });
};

export const notificationGuard = [rateLimit, mockUnlessLive];
