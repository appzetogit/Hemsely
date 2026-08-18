import { body } from 'express-validator';
import { validateEmailStrict } from '../utils/validators.js';

export const adminLoginValidator = [
  body('email')
    .notEmpty()
    .withMessage('Please provide email or username')
    .trim()
    .custom((value) => {
      if (value && value.includes('@')) {
        const res = validateEmailStrict(value);
        if (!res.isValid) throw new Error(res.message);
      }
      return true;
    }),
  body('password').notEmpty().withMessage('Password is required'),
];

export const adminRegisterValidator = [
  body('username').trim().isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
  body('email')
    .custom((value) => {
      const res = validateEmailStrict(value);
      if (!res.isValid) throw new Error(res.message);
      return true;
    }),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('firstName').optional().isString().trim().isLength({ max: 50 }),
  body('lastName').optional().isString().trim().isLength({ max: 50 }),
  body('role').optional().isIn(['admin', 'superadmin']).withMessage('Invalid role'),
];

export const banUserValidator = [
  body('reason').optional().isString().trim().isLength({ max: 500 }),
];
