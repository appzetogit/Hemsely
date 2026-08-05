// Lightweight CSRF defense-in-depth for the cookie-authenticated fallback path.
//
// The app's real auth mechanism is a Bearer token the frontend attaches manually -
// that's immune to CSRF by construction, since a forged cross-site request has no
// way to read the victim's localStorage/sessionStorage token. The httpOnly auth
// cookies ARE ambient browser credentials though, and are already `sameSite: 'strict'`
// (see utils/tokenUtils.js), which blocks the browser from attaching them to any
// cross-site request in the first place. This middleware adds a second, independent
// check on top of that: for any state-changing request relying solely on the cookie
// (no Bearer header), the declared Origin/Referer must match our own frontend.
//
// Requests with no Origin/Referer info at all are let through rather than blocked -
// SameSite=strict is still the primary defense there, and plenty of legitimate
// same-origin requests omit these headers depending on the client/browser.

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
