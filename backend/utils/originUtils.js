/**
 * Validates whether a request origin is allowed by CORS and CSRF policies.
 * Supports:
 * 1. Explicitly configured origins in process.env.FRONTEND_URL (comma-separated or single)
 * 2. hemsely.com domain and all its subdomains (*.hemsely.com)
 * 3. Localhost and 127.0.0.1 for development environments
 * 4. Requests with no origin header (same-origin, server-to-server, mobile app requests)
 */
export const isAllowedOrigin = (origin) => {
  if (!origin) return true;

  const configuredOrigins = (process.env.FRONTEND_URL || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  if (configuredOrigins.includes(origin)) return true;

  try {
    const url = new URL(origin);
    const hostname = url.hostname;

    if (
      hostname === 'hemsely.com' ||
      hostname.endsWith('.hemsely.com') ||
      hostname === 'localhost' ||
      hostname === '127.0.0.1'
    ) {
      return true;
    }
  } catch (e) {
    return false;
  }

  return false;
};

export const corsOptionsDelegate = (req, callback) => {
  const origin = req.headers.origin;

  if (isAllowedOrigin(origin)) {
    // Dynamically echo the allowed origin to support credentials: true
    callback(null, {
      origin: origin || true,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'CSRF-Token'],
    });
  } else {
    callback(null, { origin: false });
  }
};
