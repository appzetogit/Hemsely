import { body, param } from 'express-validator';
import { validateEmailStrict } from '../utils/validators.js';

export const mongoIdParam = (name) => param(name).isMongoId().withMessage(`Invalid ${name}`);

export const updateReportStatusValidator = [
  mongoIdParam('id'),
  body('status').isIn(['pending', 'reviewed', 'actioned', 'dismissed']).withMessage('Invalid status'),
  body('notes').optional().isString().isLength({ max: 1000 }),
  body('banReportedUser').optional().isBoolean(),
];

export const updatePlanValidator = [mongoIdParam('id')];

export const setUserPremiumValidator = [
  mongoIdParam('id'),
  body('isPremium').isBoolean().withMessage('isPremium must be a boolean'),
];

export const reviewSelfieValidator = [
  mongoIdParam('id'),
  body('approve').isBoolean().withMessage('approve must be a boolean'),
  body('rejectionReason').optional().isString().isLength({ max: 500 }),
];

export const setUserStatusValidator = [
  mongoIdParam('id'),
  body('isSuperPremium').optional().isBoolean(),
  body('isSuperUser').optional().isBoolean(),
  body('isSuperSubscriber').optional().isBoolean(),
];

export const sendNotificationValidator = [
  body('title').trim().notEmpty().withMessage('Title is required').isLength({ max: 150 }),
  body('body').trim().notEmpty().withMessage('Body is required').isLength({ max: 1000 }),
  body('target').isIn(['all', 'segment', 'user']).withMessage('Invalid target'),
];

export const appConfigValidator = [
  body('maintenanceMode').optional().isBoolean(),
  body('signupsEnabled').optional().isBoolean(),
  body('holdLikesQueue').optional().isBoolean(),
  body('dailyLikeLimit').optional().isInt({ min: 1, max: 10000 }),
  body('discoveryRadiusKm').optional().isInt({ min: 1, max: 20000 }),
  body('maxAgeGapYears').optional().isInt({ min: 1, max: 100 }),
  body('minAppVersion').optional().isString(),
  body('supportEmail')
    .optional()
    .custom((value) => {
      if (!value) return true;
      const res = validateEmailStrict(value);
      if (!res.isValid) throw new Error(res.message);
      return true;
    }),
  body('genderQueueEnabled').optional().isBoolean(),
  body('queueRatioMale').optional().isInt({ min: 1, max: 100 }),
  body('queueRatioFemale').optional().isInt({ min: 1, max: 100 }),
  body('queueScope').optional().isIn(['country', 'radius']),
  body('queueRadiusKm').optional().isInt({ min: 1, max: 20000 }),
];

export const websitePageValidator = [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('summary').optional().isString(),
  body('body').optional().isString(),
];

export const adminProfileValidator = [
  body('firstName').optional().isString().trim().isLength({ max: 50 }),
  body('lastName').optional().isString().trim().isLength({ max: 50 }),
  body('email')
    .optional()
    .custom((value) => {
      if (!value) return true;
      const res = validateEmailStrict(value);
      if (!res.isValid) throw new Error(res.message);
      return true;
    }),
];

export const adminPasswordValidator = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
];
