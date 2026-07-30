import { body } from 'express-validator';

export const adminLoginValidator = [
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').notEmpty().withMessage('Password is required'),
];

export const adminRegisterValidator = [
  body('username').trim().isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('firstName').optional().isString().trim().isLength({ max: 50 }),
  body('lastName').optional().isString().trim().isLength({ max: 50 }),
  body('role').optional().isIn(['admin', 'superadmin']).withMessage('Invalid role'),
];

export const banUserValidator = [
  body('reason').optional().isString().trim().isLength({ max: 500 }),
];
