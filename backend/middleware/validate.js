import { validationResult } from 'express-validator';

// Runs after a chain of express-validator checks; short-circuits with 400 on failure.
export const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array()[0].msg,
      errors: errors.array(),
    });
  }

  next();
};
