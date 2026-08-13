import { body, param, query } from 'express-validator';

export const mongoIdParam = (name) =>
  param(name)
    .custom((value) => value === 'me' || /^[0-9a-fA-F]{24}$/.test(value))
    .withMessage(`Invalid ${name}`);

export const discoveryFeedQueryValidator = [
  query('distanceKm').optional().isInt({ min: 1, max: 500 }).toInt(),
  query('minAge').optional().isInt({ min: 18, max: 120 }).toInt(),
  query('maxAge').optional().isInt({ min: 18, max: 120 }).toInt(),
  query('lat').optional().isFloat({ min: -90, max: 90 }).toFloat(),
  query('lng').optional().isFloat({ min: -180, max: 180 }).toFloat(),
  query('interestedIn').optional().isString().trim(),
  query('relationshipGoal').optional().isString().trim(),
  query('religion').optional().isString().trim(),
  query('education').optional().isString().trim(),
  query('drinkingStatus').optional().isString().trim(),
  query('smokingStatus').optional().isString().trim(),
];

export const updateProfileValidator = [
  body('firstName').optional().isString().trim().isLength({ max: 50 }),
  body('lastName').optional().isString().trim().isLength({ max: 50 }),
  body('email').optional().isEmail().withMessage('Please provide a valid email'),
  body('bio').optional().isString().isLength({ max: 500 }),
  body('age').optional().isInt({ min: 18, max: 120 }).withMessage('Age must be between 18 and 120'),
  body('gender').optional().isIn(['male', 'female', 'other', '']),
  body('interestedIn').optional().isArray(),
  body('interests').optional().isArray(),
  body('isActive').optional().isBoolean(),
  body('isPaused').optional().isBoolean(),
  body('showActiveStatus').optional().isBoolean(),
];
