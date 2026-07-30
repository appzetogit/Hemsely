import { body, param } from 'express-validator';

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
  body('email').optional().isEmail().withMessage('Please provide a valid email'),
  body('password').optional().isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('firstName').optional().isString().trim().isLength({ max: 50 }),
  body('lastName').optional().isString().trim().isLength({ max: 50 }),
];

export const loginValidator = [
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').notEmpty().withMessage('Password is required'),
];

export const mongoIdParam = (name) => param(name).isMongoId().withMessage(`Invalid ${name}`);
