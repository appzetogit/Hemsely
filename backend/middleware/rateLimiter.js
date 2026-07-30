// In-memory sliding window rate limiter middleware

const rateLimitStore = new Map();

// Cleanup expired entries periodically (every 10 minutes). unref() so this
// timer alone never keeps the Node process (or a test runner) alive.
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 10 * 60 * 1000).unref();

// Test-only escape hatch: each Jest test file otherwise shares this module's
// in-memory store across every test in the file, so a handful of tests that
// legitimately need many requests to the same endpoint (e.g. an admin-login
// lockout test) can silently exhaust another, unrelated test's rate-limit
// budget. Not used by any request-handling path.
export const resetRateLimitStoreForTests = () => rateLimitStore.clear();

export const createRateLimiter = ({ windowMs = 15 * 60 * 1000, max = 100, message = 'Too many requests, please try again later.' }) => {
  return (req, res, next) => {
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
    const now = Date.now();

    let record = rateLimitStore.get(key);

    if (!record || now > record.resetTime) {
      record = {
        count: 1,
        resetTime: now + windowMs,
      };
      rateLimitStore.set(key, record);
    } else {
      record.count += 1;
    }

    // Set rate limit headers
    const remaining = Math.max(0, max - record.count);
    const resetSeconds = Math.ceil((record.resetTime - now) / 1000);

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
  max: 10, // Max 10 admin login/register attempts per 15 mins per IP
  message: 'Too many admin login attempts from this IP. Please wait 15 minutes before trying again.',
});
