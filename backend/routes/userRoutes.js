import express from 'express';
import {
  getUserProfile,
  updateUserProfile,
  uploadProfilePicture,
  addGalleryImages,
  deleteGalleryImage,
  submitSelfie,
  verifySelfieAWS,
  getDiscoveryFeed,
  getQueueStatus,
  blockUser,
  unblockUser,
  getBlockedUsers,
  reportUser,
  deleteUserProfile,
  requestAccountDeletionOtp,
  activateBoost,
} from '../controllers/userController.js';


import { protect } from '../middleware/auth.js';
import { uploadProfilePicture as uploadProfilePictureMiddleware, uploadGalleryImages as uploadGalleryImagesMiddleware, uploadSelfie as uploadSelfieMiddleware } from '../config/cloudinary.js';
import { validate } from '../middleware/validate.js';
import { mongoIdParam, updateProfileValidator, discoveryFeedQueryValidator } from '../validators/userValidators.js';
import { selfieVerificationRateLimiter } from '../middleware/rateLimiter.js';

import { getPlans, createRazorpayOrder, verifyRazorpayPayment, createBoostOrder, verifyBoostPayment, getBoostPlans } from '../controllers/subscriptionController.js';

const router = express.Router();

router.get('/plans', protect, getPlans);
router.get('/boost-plans', protect, getBoostPlans);
router.post('/subscribe/create-order', protect, createRazorpayOrder);
router.post('/subscribe/verify', protect, verifyRazorpayPayment);
router.post('/create-order', protect, createRazorpayOrder);
router.post('/verify-payment', protect, verifyRazorpayPayment);
router.post('/boost/create-order', protect, createBoostOrder);
router.post('/boost/verify', protect, verifyBoostPayment);
router.post('/boost/activate', protect, activateBoost);
router.get('/discovery', protect, discoveryFeedQueryValidator, validate, getDiscoveryFeed);
router.get('/queue-status', protect, getQueueStatus);
router.get('/:id/blocked', protect, mongoIdParam('id'), validate, getBlockedUsers);
router.get('/:id', protect, mongoIdParam('id'), validate, getUserProfile);
router.put('/:id', protect, updateProfileValidator, validate, updateUserProfile);
router.post('/:id/request-delete-otp', protect, mongoIdParam('id'), validate, requestAccountDeletionOtp);
router.delete('/:id', protect, mongoIdParam('id'), validate, deleteUserProfile);
router.post('/:id/profile-picture', protect, mongoIdParam('id'), validate, uploadProfilePictureMiddleware.single('profilePicture'), uploadProfilePicture);
router.post('/:id/gallery', protect, mongoIdParam('id'), validate, uploadGalleryImagesMiddleware.array('galleryImages', 10), addGalleryImages);
router.post('/:id/selfie', protect, mongoIdParam('id'), validate, uploadSelfieMiddleware.single('selfie'), submitSelfie);
router.post('/selfie-verify-aws', protect, selfieVerificationRateLimiter, uploadSelfieMiddleware.single('selfie'), verifySelfieAWS);

router.delete('/:id/gallery/:imageId', protect, mongoIdParam('id'), validate, deleteGalleryImage);
router.post('/:id/block/:blockedUserId', protect, mongoIdParam('id'), mongoIdParam('blockedUserId'), validate, blockUser);
router.post('/:id/unblock/:blockedUserId', protect, mongoIdParam('id'), mongoIdParam('blockedUserId'), validate, unblockUser);
router.post('/:id/report/:reportedUserId', protect, mongoIdParam('id'), mongoIdParam('reportedUserId'), validate, reportUser);

// Subscription/boost-only routes, mounted separately at /api/subscriptions so that
// mount doesn't also expose the full user-management API (profile CRUD, uploads,
// block/report, account deletion) under an unrelated path.
export const subscriptionRouter = express.Router();
subscriptionRouter.get('/boost-plans', protect, getBoostPlans);
subscriptionRouter.post('/subscribe/create-order', protect, createRazorpayOrder);
subscriptionRouter.post('/subscribe/verify', protect, verifyRazorpayPayment);
subscriptionRouter.post('/create-order', protect, createRazorpayOrder);
subscriptionRouter.post('/verify-payment', protect, verifyRazorpayPayment);
subscriptionRouter.post('/boost/create-order', protect, createBoostOrder);
subscriptionRouter.post('/boost/verify', protect, verifyBoostPayment);

export default router;
