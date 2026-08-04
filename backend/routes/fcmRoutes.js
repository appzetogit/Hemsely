import express from 'express';
import { registerToken, unregisterToken, sendTestNotification } from '../controllers/fcmController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Register token - requires authentication
router.post('/register-token', protect, registerToken);

// Remove token - allowed with or without authentication for logout
router.post('/remove-token', unregisterToken);

// Send test notification - requires authentication
router.post('/test', protect, sendTestNotification);

export default router;
