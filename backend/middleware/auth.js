import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Admin from '../models/Admin.js';

export const protect = async (req, res, next) => {
  let token;

  // Check for token in headers
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  // Check for token in cookies
  if (!token && req.cookies) {
    token = req.cookies.token;
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized to access this route' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Re-check ban/active status on every request so a ban takes effect
    // immediately instead of waiting for the JWT to expire.
    const user = await User.findById(decoded.id).select('isBanned isActive isPaused');
    if (!user) {
      return res.status(401).json({ success: false, message: 'User account not found. Please login again.' });
    }
    if (user.isBanned || (user.isActive === false && !user.isPaused)) {
      return res.status(403).json({ success: false, message: 'Account is banned or inactive' });
    }

    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Not authorized to access this route' });
  }
};

export const adminProtect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token && req.cookies) {
    token = req.cookies.adminToken;
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Admin access required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Re-fetch the current role/active status from the DB on every request instead
    // of trusting the JWT's role claim — otherwise a demoted/deactivated admin keeps
    // their old privileges until the token expires (up to JWT_EXPIRY, default 30d).
    const admin = await Admin.findById(decoded.id).select('role isActive');
    if (!admin || admin.isActive === false) {
      return res.status(403).json({ success: false, message: 'Admin account is inactive' });
    }
    if (admin.role !== 'admin' && admin.role !== 'superadmin') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    req.admin = { ...decoded, role: admin.role };
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Admin access required' });
  }
};

export const refreshTokenMiddleware = (req, res, next) => {
  let refreshToken;

  if (req.cookies) {
    refreshToken = req.cookies.refreshToken;
  }

  if (!refreshToken) {
    return res.status(401).json({ success: false, message: 'Refresh token not found' });
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Refresh token expired' });
  }
};
