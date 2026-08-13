import { createLocalUploadMiddleware, uploadToLocal } from '../utils/localStorageService.js';

export { uploadToLocal };

export const uploadProfilePicture = {
  single: (fieldName = 'profilePicture') => createLocalUploadMiddleware('hemsely/profiles', false, fieldName),
  array: (fieldName = 'profilePicture', maxCount = 10) => createLocalUploadMiddleware('hemsely/profiles', true, fieldName, maxCount),
};

export const uploadGalleryImages = {
  single: (fieldName = 'galleryImages') => createLocalUploadMiddleware('hemsely/profiles', false, fieldName),
  array: (fieldName = 'galleryImages', maxCount = 10) => createLocalUploadMiddleware('hemsely/profiles', true, fieldName, maxCount),
};

export const uploadChatImage = {
  single: (fieldName = 'image') => createLocalUploadMiddleware('hemsely/chats', false, fieldName),
  array: (fieldName = 'image', maxCount = 10) => createLocalUploadMiddleware('hemsely/chats', true, fieldName, maxCount),
};

export const uploadSelfie = {
  single: (fieldName = 'selfie') => createLocalUploadMiddleware('hemsely/selfies', false, fieldName),
};

export default {
  uploadToLocal,
  uploadProfilePicture,
  uploadGalleryImages,
  uploadChatImage,
  uploadSelfie,
};
