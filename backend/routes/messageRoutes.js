import express from 'express';
import {
  sendMessage,
  getConversation,
  getConversations,
  markAsRead,
  deleteMessage,
  deleteConversation,
} from '../controllers/messageController.js';
import { protect } from '../middleware/auth.js';
import { uploadChatImage } from '../config/cloudinary.js';
import { validate } from '../middleware/validate.js';
import {
  sendMessageValidator,
  conversationParamValidator,
  senderParamValidator,
  messageIdParamValidator,
  getConversationsQueryValidator,
} from '../validators/messageValidators.js';

const router = express.Router();

router.post('/send/:receiverId', protect, uploadChatImage.single('image'), sendMessageValidator, validate, sendMessage);
router.get('/conversations', protect, getConversationsQueryValidator, validate, getConversations);
router.get('/conversation/:userId', protect, conversationParamValidator, validate, getConversation);
router.delete('/conversation/:userId', protect, conversationParamValidator, validate, deleteConversation);
router.put('/read/:senderId', protect, senderParamValidator, validate, markAsRead);
router.delete('/:messageId', protect, messageIdParamValidator, validate, deleteMessage);

export default router;
