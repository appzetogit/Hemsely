import { body, param, query } from 'express-validator';

export const sendMessageValidator = [
  param('receiverId').isMongoId().withMessage('Invalid receiver id'),
  body('message').trim().notEmpty().withMessage('Message content is required').isLength({ max: 2000 }),
];

export const conversationParamValidator = [param('userId').isMongoId().withMessage('Invalid user id')];
export const senderParamValidator = [param('senderId').isMongoId().withMessage('Invalid sender id')];
export const messageIdParamValidator = [param('messageId').isMongoId().withMessage('Invalid message id')];

export const getConversationsQueryValidator = [
  query('gender').optional().isIn(['male', 'female', 'both']),
  query('distanceKm').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('ageMin').optional().isInt({ min: 18, max: 100 }).toInt(),
  query('ageMax').optional().isInt({ min: 18, max: 100 }).toInt(),
  query('heightMinCm').optional().isInt({ min: 100, max: 250 }).toInt(),
  query('heightMaxCm').optional().isInt({ min: 100, max: 250 }).toInt(),
  query('relationshipGoal').optional().isIn(['Long-term', 'Short-term', 'New friends', 'Casual']),
  query('religion').optional().isIn(['Hindu', 'Muslim', 'Christian', 'Sikh', 'Jain', 'Atheist', 'Other']),
  query('education').optional().isIn(['Graduate', 'Post Graduate', 'Undergraduate', 'High School']),
  query('drinkingStatus').optional().isIn(['No', 'Yes', 'Occasionally', 'Socially']),
  query('smokingStatus').optional().isIn(['No', 'Yes', 'Occasionally', 'Socially']),
];
