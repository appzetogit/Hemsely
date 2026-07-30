import express from 'express';
import {
  getUserProfile,
  updateUserProfile,
  uploadProfilePicture,
  addGalleryImages,
  deleteGalleryImage,
  submitSelfie,
  getDiscoveryFeed,
  getQueueStatus,
  blockUser,
  unblockUser,
  reportUser,
  deleteUserProfile,
} from '../controllers/userController.js';
import { protect } from '../middleware/auth.js';
import { uploadProfilePicture as uploadProfilePictureMiddleware, uploadGalleryImages as uploadGalleryImagesMiddleware, uploadSelfie as uploadSelfieMiddleware } from '../config/cloudinary.js';
import { validate } from '../middleware/validate.js';
import { mongoIdParam, updateProfileValidator, discoveryFeedQueryValidator } from '../validators/userValidators.js';

import { getPlans, subscribeUserToPlan } from '../controllers/subscriptionController.js';

const router = express.Router();

router.get('/plans', protect, getPlans);
router.post('/subscribe', protect, subscribeUserToPlan);
router.get('/discovery', protect, discoveryFeedQueryValidator, validate, getDiscoveryFeed);
router.get('/queue-status', protect, getQueueStatus);
router.get('/:id', protect, mongoIdParam('id'), validate, getUserProfile);
router.put('/:id', protect, updateProfileValidator, validate, updateUserProfile);
router.delete('/:id', protect, mongoIdParam('id'), validate, deleteUserProfile);
router.post('/:id/profile-picture', protect, mongoIdParam('id'), validate, uploadProfilePictureMiddleware.single('profilePicture'), uploadProfilePicture);
router.post('/:id/gallery', protect, mongoIdParam('id'), validate, uploadGalleryImagesMiddleware.array('galleryImages', 10), addGalleryImages);
router.post('/:id/selfie', protect, mongoIdParam('id'), validate, uploadSelfieMiddleware.single('selfie'), submitSelfie);
router.delete('/:id/gallery/:imageId', protect, mongoIdParam('id'), validate, deleteGalleryImage);
router.post('/:id/block/:blockedUserId', protect, mongoIdParam('id'), mongoIdParam('blockedUserId'), validate, blockUser);
router.post('/:id/unblock/:blockedUserId', protect, mongoIdParam('id'), mongoIdParam('blockedUserId'), validate, unblockUser);
router.post('/:id/report/:reportedUserId', protect, mongoIdParam('id'), mongoIdParam('reportedUserId'), validate, reportUser);

export default router;
