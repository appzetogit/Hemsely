// MongoDB-backed sliding window rate limiter middleware.
// Counters live in the RateLimitCounter collection (see models/RateLimitCounter.js)
// so limits are correctly shared across multiple app instances and survive a restart,
// unlike a plain in-memory Map which only ever rate-limits its own process.

import RateLimitCounter from '../models/RateLimitCounter.js';

// Test-only escape hatch: clears all counters between tests so one test's
// requests never eat into another, unrelated test's rate-limit budget.
// Not used by any request-handling path.
export const resetRateLimitStoreForTests = async () => {
  await RateLimitCounter.deleteMany({});
};

export const createRateLimiter = ({ windowMs = 15 * 60 * 1000, max = 100, message = 'Too many requests, please try again later.' }) => {
  return async (req, res, next) => {
    // Generate key based on IP and route path. When this limiter is bound to a
    // specific route (e.g. router.post('/login', adminAuthRateLimiter, ...)),
    // req.route is already set by the time this middleware runs, so combine it
    // with baseUrl to key per-endpoint (otherwise /login and /register would
    // collapse into one shared bucket, since baseUrl alone is just the router's
    // mount path). When used as a whole-router mount-level middleware instead
    // (e.g. app.use('/api/users', apiRateLimiter, userRoutes)), req.route isn't
    // set yet, so fall back to the mount path for one aggregate bucket per API surface.
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown-ip';
    const routeKey = req.route ? `${req.baseUrl}${req.route.path}` : (req.baseUrl || req.path);
    const key = `${clientIp}:${routeKey}`;
    const now = new Date();
    const newResetTime = new Date(now.getTime() + windowMs);

    let record;
    try {
      // Atomic per-document pipeline update: if the window has expired (or this
      // is a brand new key) reset to count 1 with a fresh window, otherwise
      // increment - all in one op, so concurrent requests across instances
      // can't race each other into under-counting.
      record = await RateLimitCounter.findOneAndUpdate(
        { key },
        [
          {
            $set: {
              count: {
                $cond: [
                  { $or: [{ $eq: ['$resetTime', null] }, { $lt: ['$resetTime', now] }] },
                  1,
                  { $add: ['$count', 1] },
                ],
              },
              resetTime: {
                $cond: [
                  { $or: [{ $eq: ['$resetTime', null] }, { $lt: ['$resetTime', now] }] },
                  newResetTime,
                  '$resetTime',
                ],
              },
            },
          },
        ],
        { upsert: true, new: true }
      );
    } catch (err) {
      // Fail open: a rate-limit store outage should never take the whole API down with it.
      console.error('Rate limiter store error, allowing request through:', err.message);
      return next();
    }

    const remaining = Math.max(0, max - record.count);
    const resetSeconds = Math.ceil((record.resetTime.getTime() - now.getTime()) / 1000);

    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', resetSeconds);

    if (record.count > max) {
      return res.status(429).json({
        success: false,
        message,
        retryAfterSeconds: resetSeconds,
      });
    }

    next();
  };
};

// Specialized Rate Limiters
export const otpRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Max 10 OTP requests per 15 mins per IP
  message: 'Too many OTP requests from this IP. Please wait 15 minutes before trying again.',
});

export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 20, // Max 20 auth attempts per 15 mins
  message: 'Too many authentication attempts. Please try again later.',
});

export const apiRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 300, // Max 300 requests per 15 mins for general API
  message: 'Too many requests to API. Please slow down.',
});

export const adminAuthRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 20, // Max 20 admin login/register attempts per 15 mins per IP
  message: 'Too many admin login attempts from this IP. Please wait 15 minutes before trying again.',
});

export const selfieVerificationRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10, // Max 10 selfie verification attempts per 15 mins per IP
  message: 'Too many selfie verification attempts. Please wait 15 minutes before trying again.',
});
