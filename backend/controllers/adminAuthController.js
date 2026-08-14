import Admin from '../models/Admin.js';
import jwt from 'jsonwebtoken';
import { asyncHandler } from '../middleware/errorHandler.js';
import { generateToken, generateRefreshToken, setCookie, clearCookie } from '../utils/tokenUtils.js';
import { validatePassword } from '../utils/validators.js';
import { escapeRegex } from '../utils/regexUtils.js';

// @desc Admin Register (Create additional admin accounts)
// @route POST /api/admin/register
// @access Private (superadmin only)
export const adminRegister = asyncHandler(async (req, res, next) => {
  const { username, email, password, firstName, lastName, role } = req.body;

  // Only a superadmin may create new admin accounts
  if (req.admin.role !== 'superadmin') {
    return res.status(403).json({
      success: false,
      message: 'Only a superadmin can create new admin accounts',
    });
  }

  // Validate input
  if (!username || !email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Please provide all required fields',
    });
  }

  if (!validatePassword(password)) {
    return res.status(400).json({
      success: false,
      message: 'Password must be at least 6 characters',
    });
  }

  // Check if admin already exists
  let admin = await Admin.findOne({ $or: [{ email }, { username }] });

  if (admin) {
    return res.status(400).json({
      success: false,
      message: 'Admin already exists with that email or username',
    });
  }

  // Create admin (caller is already verified as superadmin above)
  admin = await Admin.create({
    username,
    email,
    password,
    firstName,
    lastName,
    role: role === 'superadmin' ? 'superadmin' : 'admin',
  });

  // Generate tokens
  const token = generateToken(admin._id, 'admin');
  const refreshToken = generateRefreshToken(admin._id);

  // Set cookies
  setCookie(res, token, refreshToken, 'adminToken', 'adminRefreshToken');

  res.status(201).json({
    success: true,
    message: 'Admin registered successfully',
    token,
    refreshToken,
    admin: {
      id: admin._id,
      username: admin.username,
      email: admin.email,
      role: admin.role,
    },
  });
});

// @desc Admin Login
// @route POST /api/admin/login
// @access Public
export const adminLogin = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  // Validate input
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Please provide email and password',
    });
  }

  const inputIdentifier = email.trim();
  const safeIdentifier = escapeRegex(inputIdentifier);

  // Check for admin by email OR username (case-insensitive)
  const admin = await Admin.findOne({
    $or: [
      { email: inputIdentifier.toLowerCase() },
      { username: new RegExp(`^${safeIdentifier}$`, 'i') },
    ],
  }).select('+password');

  if (!admin) {
    return res.status(401).json({
      success: false,
      message: 'Invalid credentials',
    });
  }

  // Check if account is locked
  if (admin.isLocked()) {
    const lockMinutesLeft = admin.lockUntil
      ? Math.ceil((new Date(admin.lockUntil).getTime() - Date.now()) / (60 * 1000))
      : 30;
    return res.status(403).json({
      success: false,
      message: `Account locked due to multiple failed login attempts. Try again in ${Math.max(lockMinutesLeft, 1)} minute(s).`,
    });
  }

  // Check if password matches
  const isMatch = await admin.matchPassword(password);

  if (!isMatch) {
    // Must be awaited: the next login attempt re-fetches the admin and reads
    // loginAttempts to decide whether to lock the account, so an unawaited
    // (fire-and-forget) increment here is a race that can let a brute-force
    // attempt slip through without ever tripping the lockout.
    await admin.incLoginAttempts();
    return res.status(401).json({
      success: false,
      message: 'Invalid credentials',
    });
  }

  // Reset login attempts on successful login
  admin.loginAttempts = 0;
  admin.lockUntil = undefined;

  // Update last login
  admin.lastLogin = new Date();
  await admin.save();

  // Generate tokens
  const token = generateToken(admin._id, admin.role);
  const refreshToken = generateRefreshToken(admin._id);

  // Set cookies
  setCookie(res, token, refreshToken, 'adminToken', 'adminRefreshToken');

  res.status(200).json({
    success: true,
    message: 'Admin logged in successfully',
    token,
    refreshToken,
    admin: {
      id: admin._id,
      username: admin.username,
      email: admin.email,
      role: admin.role,
    },
  });
});

// @desc Admin Logout
// @route POST /api/admin/logout
// @access Private
export const adminLogout = asyncHandler(async (req, res, next) => {
  clearCookie(res, 'adminToken', 'adminRefreshToken');

  res.status(200).json({
    success: true,
    message: 'Admin logged out successfully',
  });
});

// @desc Refresh Admin Token
// @route POST /api/admin/refresh
// @access Public
export const refreshAdminToken = asyncHandler(async (req, res, next) => {
  const refreshToken =
    req.cookies?.adminRefreshToken ||
    req.body?.refreshToken ||
    req.headers['x-refresh-token'] ||
    (req.headers.authorization?.startsWith('Bearer') ? req.headers.authorization.split(' ')[1] : null);

  if (!refreshToken) {
    return res.status(401).json({
      success: false,
      message: 'Admin refresh token not found',
    });
  }

  try {
    const secret = process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET;
    const decoded = jwt.verify(refreshToken, secret);
    const admin = await Admin.findById(decoded.id);

    if (!admin || admin.isActive === false) {
      return res.status(401).json({
        success: false,
        message: 'Admin not authorized or account is inactive',
      });
    }

    const newToken = generateToken(admin._id, admin.role);
    const newRefreshToken = generateRefreshToken(admin._id);

    setCookie(res, newToken, newRefreshToken, 'adminToken', 'adminRefreshToken');

    res.status(200).json({
      success: true,
      message: 'Admin token refreshed successfully',
      token: newToken,
      refreshToken: newRefreshToken,
      admin: {
        id: admin._id,
        username: admin.username,
        email: admin.email,
        role: admin.role,
      },
    });
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired admin refresh token',
    });
  }
});

// @desc Get current admin
// @route GET /api/admin/me
// @access Private
export const getCurrentAdmin = asyncHandler(async (req, res, next) => {
  const admin = await Admin.findById(req.admin.id);

  res.status(200).json({
    success: true,
    admin,
  });
});

// @desc Update own admin profile (name/email)
// @route PUT /api/admin/profile
// @access Private
export const updateAdminProfile = asyncHandler(async (req, res, next) => {
  const { firstName, lastName, email } = req.body;

  if (email) {
    const existing = await Admin.findOne({ email, _id: { $ne: req.admin.id } });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Another admin already uses that email',
      });
    }
  }

  const updates = {};
  if (firstName !== undefined) updates.firstName = firstName;
  if (lastName !== undefined) updates.lastName = lastName;
  if (email !== undefined) updates.email = email;

  const admin = await Admin.findByIdAndUpdate(req.admin.id, updates, { new: true, runValidators: true });

  res.status(200).json({
    success: true,
    message: 'Profile updated successfully',
    admin,
  });
});

// @desc Change own admin password
// @route PUT /api/admin/password
// @access Private
export const changeAdminPassword = asyncHandler(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({
      success: false,
      message: 'Please provide the current and new password',
    });
  }

  if (!validatePassword(newPassword)) {
    return res.status(400).json({
      success: false,
      message: 'New password must be at least 6 characters',
    });
  }

  const admin = await Admin.findById(req.admin.id).select('+password');
  const isMatch = await admin.matchPassword(currentPassword);

  if (!isMatch) {
    return res.status(401).json({
      success: false,
      message: 'Current password is incorrect',
    });
  }

  admin.password = newPassword;
  await admin.save();

  res.status(200).json({
    success: true,
    message: 'Password updated successfully',
  });
});
