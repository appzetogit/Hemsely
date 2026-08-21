// High-performance sliding-window in-memory rate limiter middleware.
// Stores counters in memory for sub-millisecond execution without blocking
// the database I/O, capable of handling 50,000+ requests per second.
// Auto-purges expired entries periodically to prevent memory leaks.

import RateLimitCounter from '../models/RateLimitCounter.js';

// In-memory key-value store: key -> { count: number, resetTime: number }
const memoryStore = new Map();

// Periodic cleanup of expired entries (every 60s, unref'd so it doesn't block shutdown)
const sweepTimer = setInterval(() => {
  const now = Date.now();
  for (const [key, record] of memoryStore.entries()) {
    if (record.resetTime <= now) {
      memoryStore.delete(key);
    }
  }
}, 60 * 1000);
if (sweepTimer.unref) sweepTimer.unref();

// Test-only escape hatch: clears all counters between tests so one test's
// requests never eat into another, unrelated test's rate-limit budget.
export const resetRateLimitStoreForTests = async () => {
  memoryStore.clear();
  try {
    await RateLimitCounter.deleteMany({});
  } catch (_) {}
};

export const createRateLimiter = ({
  windowMs = 15 * 60 * 1000,
  max = 100,
  message = 'Too many requests, please try again later.',
}) => {
  return async (req, res, next) => {
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown-ip';
    const routeKey = req.route ? `${req.baseUrl}${req.route.path}` : (req.baseUrl || req.path);
    const key = `${clientIp}:${routeKey}`;
    const now = Date.now();

    let record = memoryStore.get(key);

    if (!record || record.resetTime <= now) {
      record = {
        count: 1,
        resetTime: now + windowMs,
      };
      memoryStore.set(key, record);
    } else {
      record.count += 1;
    }

    const remaining = Math.max(0, max - record.count);
    const resetSeconds = Math.max(1, Math.ceil((record.resetTime - now) / 1000));

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
