// In-memory fixed-window rate limiter per client IP. Good for a single
// instance; a multi-instance deployment needs shared storage (section 14.4).

export const createRateLimiter = ({ windowMs, max, onLimit }) => {
  const hits = new Map();

  // Drop expired entries so the map does not grow without bound.
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of hits) {
      if (now - entry.start >= windowMs) hits.delete(key);
    }
  }, windowMs).unref();

  return (req, res, next) => {
    const now = Date.now();
    const entry = hits.get(req.ip);

    if (!entry || now - entry.start >= windowMs) {
      hits.set(req.ip, { start: now, count: 1 });
      return next();
    }

    entry.count += 1;
    if (entry.count > max) {
      res.set('Retry-After', String(Math.ceil((entry.start + windowMs - now) / 1000)));
      return onLimit(req, res, next);
    }
    return next();
  };
};
