import { body, param } from 'express-validator';
import { validateEmailStrict } from '../utils/validators.js';

export const sendOtpValidator = [
  body('phoneNumber').optional(),
  body('phone').optional(),
  body('mobile').optional(),
  body('fullPhone').optional(),
  body('mobileNumber').optional(),
  body('number').optional(),
];

export const verifyOtpValidator = [
  body('phoneNumber').optional(),
  body('phone').optional(),
  body('mobile').optional(),
  body('fullPhone').optional(),
  body('mobileNumber').optional(),
  body('number').optional(),
  body('otp')
    .optional()
    .customSanitizer(v => (v !== undefined && v !== null ? String(v).trim() : ''))
    .custom(v => {
      if (!v) return true;
      if (v.length < 4 || v.length > 6) throw new Error('OTP must be 4-6 digits');
      return true;
    }),
];

export const registerValidator = [
  body('email')
    .optional()
    .custom((value) => {
      if (!value) return true;
      const res = validateEmailStrict(value);
      if (!res.isValid) throw new Error(res.message);
      return true;
    }),
  body('password').optional().isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('firstName').optional().isString().trim().isLength({ max: 50 }),
  body('lastName').optional().isString().trim().isLength({ max: 50 }),
];

export const loginValidator = [
  body('email')
    .custom((value) => {
      const res = validateEmailStrict(value);
      if (!res.isValid) throw new Error(res.message);
      return true;
    }),
  body('password').notEmpty().withMessage('Password is required'),
];

export const mongoIdParam = (name) => param(name).isMongoId().withMessage(`Invalid ${name}`);
