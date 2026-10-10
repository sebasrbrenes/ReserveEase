// Interim protection for the email/SMS routes until notifications are
// derived server-side from persisted bookings (see plan, stage E).
//
// - NOTIFICATIONS_MODE: anything other than "live" answers without contacting
//   SendGrid/Twilio, so a fresh or demo deployment cannot send real messages.
// - Per-IP rate limit, so the routes cannot be used to send messages in bulk.

const WINDOW_MS = Number(process.env.NOTIFICATIONS_RATE_WINDOW_MS) || 15 * 60 * 1000;
const MAX_REQUESTS = Number(process.env.NOTIFICATIONS_RATE_MAX) || 10;

const hits = new Map();

const isLive = () => process.env.NOTIFICATIONS_MODE === 'live';

const rateLimit = (req, res, next) => {
  const now = Date.now();
  const key = req.ip;
  const entry = hits.get(key);

  if (!entry || now - entry.start >= WINDOW_MS) {
    hits.set(key, { start: now, count: 1 });
    return next();
  }

  entry.count += 1;
  if (entry.count > MAX_REQUESTS) {
    const retryAfter = Math.ceil((entry.start + WINDOW_MS - now) / 1000);
    res.set('Retry-After', String(retryAfter));
    return res.status(429).json({ success: false, error: 'Too many requests' });
  }
  return next();
};

// Drop expired entries so the map does not grow without bound.
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of hits) {
    if (now - entry.start >= WINDOW_MS) hits.delete(key);
  }
}, WINDOW_MS).unref();

const mockUnlessLive = (req, res, next) => {
  if (isLive()) return next();
  // Log only the route; request bodies contain personal data.
  console.log(`[notifications:mock] ${req.method} ${req.baseUrl}${req.path} not sent`);
  return res.json({ success: true, mocked: true, message: 'Notification not sent (mock mode)' });
};

export const notificationGuard = [rateLimit, mockUnlessLive];
