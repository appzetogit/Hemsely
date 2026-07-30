import { createLocalUploadMiddleware, uploadToLocal } from '../utils/localStorageService.js';

export { uploadToLocal };

export const uploadProfilePicture = {
  single: (fieldName = 'profilePicture') => createLocalUploadMiddleware('amora/profiles', false, fieldName),
  array: (fieldName = 'profilePicture', maxCount = 10) => createLocalUploadMiddleware('amora/profiles', true, fieldName, maxCount),
};

export const uploadGalleryImages = {
  single: (fieldName = 'galleryImages') => createLocalUploadMiddleware('amora/profiles', false, fieldName),
  array: (fieldName = 'galleryImages', maxCount = 10) => createLocalUploadMiddleware('amora/profiles', true, fieldName, maxCount),
};

export const uploadChatImage = {
  single: (fieldName = 'image') => createLocalUploadMiddleware('amora/chats', false, fieldName),
  array: (fieldName = 'image', maxCount = 10) => createLocalUploadMiddleware('amora/chats', true, fieldName, maxCount),
};

export const uploadSelfie = {
  single: (fieldName = 'selfie') => createLocalUploadMiddleware('amora/selfies', false, fieldName),
};

export default {
  uploadToLocal,
  uploadProfilePicture,
  uploadGalleryImages,
  uploadChatImage,
  uploadSelfie,
};
