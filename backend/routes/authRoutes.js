import express from 'express';
import { sendOTP, verifyOTP, register, login, logout, refreshAccessToken, getCurrentUser } from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';
import { otpRateLimiter, authRateLimiter } from '../middleware/rateLimiter.js';
import { validate } from '../middleware/validate.js';
import { sendOtpValidator, verifyOtpValidator, registerValidator, loginValidator } from '../validators/authValidators.js';

const router = express.Router();

router.post('/send-otp', otpRateLimiter, sendOtpValidator, validate, sendOTP);
router.post('/verify-otp', authRateLimiter, verifyOtpValidator, validate, verifyOTP);
router.post('/register', authRateLimiter, registerValidator, validate, register);
router.post('/login', authRateLimiter, loginValidator, validate, login);
router.post('/logout', protect, logout);
router.post('/refresh', authRateLimiter, refreshAccessToken);
router.get('/me', protect, getCurrentUser);

export default router;
