import express from 'express';
import {
  verifySubscription,
  verifyPurchase,
  getEntitlements,
  getConfiguredProducts,
  handlePubSubWebhook,
} from '../controllers/googlePlayController.js';
import { protect } from '../middleware/auth.js';
import { apiRateLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Public & Protected Endpoints
router.get('/products', apiRateLimiter, getConfiguredProducts);
router.post('/webhook', handlePubSubWebhook);

// Protected User Endpoints
router.post('/verify-subscription', protect, apiRateLimiter, verifySubscription);
router.post('/verify-purchase', protect, apiRateLimiter, verifyPurchase);
router.get('/entitlement', protect, apiRateLimiter, getEntitlements);

export default router;
