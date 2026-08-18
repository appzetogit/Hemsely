import { body, param } from 'express-validator';
import { validateEmailStrict } from '../utils/validators.js';

export const sendOtpValidator = [
  body('phoneNumber')
    .optional()
    .isString(),
  body('phone').optional().isString(),
  body('mobile').optional().isString(),
  body('fullPhone').optional().isString(),
];

export const verifyOtpValidator = [
  body('otp')
    .optional()
    .isString()
    .isLength({ min: 4, max: 6 })
    .withMessage('OTP must be 4-6 digits'),
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
