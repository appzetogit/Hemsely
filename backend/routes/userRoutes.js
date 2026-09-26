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

import { getPlans, getBoostPlans } from '../controllers/subscriptionController.js';

const router = express.Router();

router.get('/plans', protect, getPlans);
router.get('/boost-plans', protect, getBoostPlans);
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
router.post('/block/:blockedUserId', protect, mongoIdParam('blockedUserId'), validate, blockUser);
router.post('/:id/block/:blockedUserId', protect, mongoIdParam('blockedUserId'), validate, blockUser);
router.post('/unblock/:blockedUserId', protect, mongoIdParam('blockedUserId'), validate, unblockUser);
router.post('/:id/unblock/:blockedUserId', protect, mongoIdParam('blockedUserId'), validate, unblockUser);
router.post('/report/:reportedUserId', protect, mongoIdParam('reportedUserId'), validate, reportUser);
router.post('/:id/report/:reportedUserId', protect, mongoIdParam('reportedUserId'), validate, reportUser);

// Subscription routes mounted separately at /api/subscriptions
export const subscriptionRouter = express.Router();
subscriptionRouter.get('/plans', protect, getPlans);
subscriptionRouter.get('/boost-plans', protect, getBoostPlans);

export default router;
