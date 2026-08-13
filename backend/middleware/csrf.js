// Lightweight CSRF defense-in-depth for the cookie-authenticated fallback path.
//
// The app's real auth mechanism is a Bearer token the frontend attaches manually -
// that's immune to CSRF by construction, since a forged cross-site request has no
// way to read the victim's localStorage/sessionStorage token. The httpOnly auth
// cookies ARE ambient browser credentials though. In development they're
// `sameSite: 'lax'`, and in production `sameSite: 'none'` (required for the
// frontend/backend to run on different origins) - so unlike a same-site cookie
// setup, the browser will still attach them to some or all cross-site requests.
// That makes THIS middleware the primary CSRF defense for the cookie-auth path,
// not a second layer on top of SameSite: for any state-changing request relying
// solely on the cookie (no Bearer header), the declared Origin/Referer must match
// our own frontend (see utils/originUtils.js).
//
// Requests with no Origin/Referer info at all are let through rather than blocked -
// plenty of legitimate same-origin requests omit these headers depending on the
// client/browser, and the Bearer-token path remains the primary auth mechanism.

import { isAllowedOrigin } from '../utils/originUtils.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

const originOf = (value) => {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
};

export const csrfProtection = (req, res, next) => {
  if (SAFE_METHODS.has(req.method)) return next();

  const hasBearerToken = /^Bearer\s+.+/i.test(req.headers.authorization || '');
  if (hasBearerToken) return next();

  const sourceOrigin = req.headers.origin
    ? originOf(req.headers.origin)
    : (req.headers.referer ? originOf(req.headers.referer) : null);

  if (!sourceOrigin) return next();

  if (isAllowedOrigin(sourceOrigin)) return next();

  return res.status(403).json({
    success: false,
    message: 'Cross-origin request blocked',
  });
};
