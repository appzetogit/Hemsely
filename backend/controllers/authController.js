import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { generateToken, generateRefreshToken, setCookie, clearCookie } from '../utils/tokenUtils.js';
import { validateEmail, validatePhoneNumber, validatePassword } from '../utils/validators.js';
import smsIndiaHubService from '../utils/smsService.js';
import { getOrCreateConfig } from './appConfigController.js';
import { generateOtpCode, getOtpExpiry, isOtpValid } from '../utils/otpService.js';

// @desc Send OTP to phone number
// @route POST /api/auth/send-otp
// @access Public
export const sendOTP = asyncHandler(async (req, res, next) => {
  const { phoneNumber, phone, mobile, fullPhone } = req.body || {};
  const rawInput = phoneNumber || phone || mobile || fullPhone || req.body;
  const digitsOnly = rawInput ? String(rawInput).replace(/\D/g, '') : '';

  if (digitsOnly.length < 10) {
    return res.status(400).json({
      success: false,
      message: 'Please enter a valid 10-digit mobile number',
    });
  }

  const last10Digits = digitsOnly.slice(-10);
  const normalizedPhone = `+91${last10Digits}`;

  // Generate OTP (real random 6-digit OTP when OTP_USE_MOCK is false, except default test numbers)
  const otpCode = generateOtpCode(last10Digits);
  const otpExpires = getOtpExpiry();

  let user = await User.findOne({
    $or: [
      { phoneNumber: normalizedPhone },
      { phoneNumber: last10Digits },
      { phoneNumber: { $regex: last10Digits + '$' } }
    ]
  });

  if (!user) {
    try {
      const config = await getOrCreateConfig();
      if (config && config.signupsEnabled === false) {
        return res.status(403).json({
          success: false,
          message: 'New signups are temporarily disabled. Please check back later.',
        });
      }
    } catch {
      // Ignore config check error if any
    }
  }

  if (user) {
    if (user.isBanned) {
      return res.status(403).json({
        success: false,
        isBanned: true,
        message: user.banReason || 'You are banned by Hemsely',
      });
    }
    user.phoneNumber = normalizedPhone;
    user.otpCode = otpCode;
    user.otpExpires = otpExpires;
    await user.save();
  } else {
    try {
      user = await User.create({
        phoneNumber: normalizedPhone,
        otpCode,
        otpExpires,
        isProfileComplete: false,
      });
    } catch (createErr) {
      if (createErr.code === 11000) {
        user = await User.findOne({
          $or: [
            { phoneNumber: normalizedPhone },
            { phoneNumber: last10Digits },
            { phoneNumber: { $regex: last10Digits + '$' } }
          ]
        });
        if (user) {
          user.phoneNumber = normalizedPhone;
          user.otpCode = otpCode;
          user.otpExpires = otpExpires;
          await user.save();
        } else {
          throw createErr;
        }
      } else {
        throw createErr;
      }
    }
  }

  const isNewUser = !user.firstName;
  const purpose = isNewUser ? 'register' : 'login';

  // Bypass external SMS service and use default OTP mode
  console.log(`📱 [DEFAULT OTP MODE] Phone: ${normalizedPhone} | OTP: ${otpCode}`);

  res.status(200).json({
    success: true,
    message: 'OTP sent successfully to your phone number',
    phoneNumber: normalizedPhone,
    isNewUser,
    isProfileComplete: Boolean(user.isProfileComplete && user.firstName),
  });
});

// @desc Verify OTP
// @route POST /api/auth/verify-otp
// @access Public
export const verifyOTP = asyncHandler(async (req, res, next) => {
  const { phoneNumber, phone, mobile, fullPhone, otp } = req.body || {};
  const rawInput = phoneNumber || phone || mobile || fullPhone || req.body;
  const digitsOnly = rawInput ? String(rawInput).replace(/\D/g, '') : '';
  const enteredOtp = otp ? String(otp).trim() : '';

  if (digitsOnly.length < 10 || !enteredOtp) {
    return res.status(400).json({
      success: false,
      message: 'Please provide a valid 10-digit phone number and OTP',
    });
  }

  const last10Digits = digitsOnly.slice(-10);
  const normalizedPhone = `+91${last10Digits}`;

  let user = await User.findOne({
    $or: [
      { phoneNumber: normalizedPhone },
      { phoneNumber: last10Digits },
      { phoneNumber: { $regex: last10Digits + '$' } }
    ]
  });

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found for this phone number',
    });
  }

  if (user.isBanned) {
    return res.status(200).json({
      success: false,
      isBanned: true,
      message: 'You are banned by Hemsely',
    });
  }

  const otpMatches = isOtpValid(user, enteredOtp, last10Digits);

  if (!otpMatches) {
    return res.status(400).json({
      success: false,
      message: 'Invalid OTP code. Please enter the correct code sent to your phone.',
    });
  }

  user.otpCode = null;
  user.otpExpires = null;
  user.lastSeen = new Date();

  const isProfileComplete = Boolean(user.isProfileComplete && user.firstName);
  user.isProfileComplete = isProfileComplete;
  await user.save();

  const token = generateToken(user._id, 'user');
  const refreshToken = generateRefreshToken(user._id);
  setCookie(res, token, refreshToken);

  res.status(200).json({
    success: true,
    message: isProfileComplete ? 'Logged in successfully' : 'OTP verified. Please complete your profile',
    token,
    refreshToken,
    isNewUser: !user.firstName,
    isProfileComplete,
    user: {
      id: user._id,
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phoneNumber: user.phoneNumber,
      gender: user.gender,
      profilePicture: user.profilePicture,
      isProfileComplete,
    },
  });
});

// @desc Register user
// @route POST /api/auth/register
// @access Public
export const register = asyncHandler(async (req, res, next) => {
  const { firstName, lastName, email, phoneNumber, password, gender, age } = req.body;
  const normalizedEmail = email?.trim().toLowerCase();
  const normalizedPhoneNumber = phoneNumber?.trim();

  if (!firstName || !lastName || !phoneNumber) {
    return res.status(400).json({
      success: false,
      message: 'Please provide first name, last name, and phone number',
    });
  }

  let user = await User.findOne({ phoneNumber: normalizedPhoneNumber });

  if (user) {
    user.firstName = firstName;
    user.lastName = lastName;
    if (email) user.email = normalizedEmail;
    if (gender) user.gender = gender;
    if (age) user.age = age;
    if (password) user.password = password;
    user.isProfileComplete = true;
    await user.save();
  } else {
    user = await User.create({
      firstName,
      lastName,
      email: normalizedEmail,
      phoneNumber: normalizedPhoneNumber,
      password,
      gender,
      age,
      isProfileComplete: true,
    });
  }

  const token = generateToken(user._id, 'user');
  const refreshToken = generateRefreshToken(user._id);
  setCookie(res, token, refreshToken);

  res.status(201).json({
    success: true,
    message: 'User registered successfully',
    token,
    refreshToken,
    user: {
      id: user._id,
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phoneNumber: user.phoneNumber,
      gender: user.gender,
      isProfileComplete: true,
    },
  });
});

// @desc Login user
// @route POST /api/auth/login
// @access Public
export const login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;
  const normalizedEmail = email?.trim().toLowerCase();

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Please provide email and password',
    });
  }

  const user = await User.findOne({ email: normalizedEmail }).select('+password');

  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Invalid credentials',
    });
  }

  if (user.isBanned) {
    return res.status(403).json({
      success: false,
      message: user.banReason || 'Your account has been banned by admin',
    });
  }

  const isMatch = await user.matchPassword(password);

  if (!isMatch) {
    return res.status(401).json({
      success: false,
      message: 'Invalid credentials',
    });
  }

  const token = generateToken(user._id, 'user');
  const refreshToken = generateRefreshToken(user._id);

  user.lastSeen = new Date();
  await user.save();

  setCookie(res, token, refreshToken);

  res.status(200).json({
    success: true,
    message: 'User logged in successfully',
    token,
    refreshToken,
    user: {
      id: user._id,
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phoneNumber: user.phoneNumber,
      gender: user.gender,
      profilePicture: user.profilePicture,
      isProfileComplete: Boolean(user.isProfileComplete && user.firstName),
    },
  });
});

// @desc Logout user
// @route POST /api/auth/logout
// @access Private
export const logout = asyncHandler(async (req, res, next) => {
  clearCookie(res, 'token', 'refreshToken');

  res.status(200).json({
    success: true,
    message: 'User logged out successfully',
  });
});

// @desc Refresh token
// @route POST /api/auth/refresh
// @access Public
export const refreshAccessToken = asyncHandler(async (req, res, next) => {
  const refreshToken =
    req.cookies?.refreshToken ||
    req.body?.refreshToken ||
    req.headers['x-refresh-token'] ||
    (req.headers.authorization?.startsWith('Bearer') ? req.headers.authorization.split(' ')[1] : null);

  if (!refreshToken) {
    return res.status(401).json({
      success: false,
      message: 'Refresh token not found',
    });
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET || 'secret');
    const user = await User.findById(decoded.id);

    if (!user || user.isBanned) {
      return res.status(401).json({
        success: false,
        message: 'User not authorized or account is banned',
      });
    }

    const newToken = generateToken(user._id, 'user');
    const newRefreshToken = generateRefreshToken(user._id);

    setCookie(res, newToken, newRefreshToken);

    res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      token: newToken,
      refreshToken: newRefreshToken,
      user: {
        id: user._id,
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        gender: user.gender,
        profilePicture: user.profilePicture,
        isProfileComplete: Boolean(user.isProfileComplete && user.firstName),
      },
    });
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired refresh token',
    });
  }
});

// @desc Get current logged in user
// @route GET /api/auth/me
// @access Private
export const getCurrentUser = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id);

  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'User session expired or account not found. Please log in again.',
    });
  }

  if (user.isBanned) {
    return res.status(403).json({
      success: false,
      message: user.banReason || 'Your account has been banned',
    });
  }

  res.status(200).json({
    success: true,
    user: {
      ...user.toObject(),
      isProfileComplete: Boolean(user.isProfileComplete && user.firstName),
    },
  });
});
