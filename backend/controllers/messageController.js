import mongoose from 'mongoose';
import User from '../models/User.js';
import Message from '../models/Message.js';
import Match from '../models/Match.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { emitToUser } from '../socket/index.js';

const conversationKey = (idA, idB) => [idA.toString(), idB.toString()].sort().join('_');

// @desc Send message
// @route POST /api/messages/send/:receiverId
// @access Private
export const sendMessage = asyncHandler(async (req, res, next) => {
  const { message } = req.body;
  const sender = req.user.id;
  const receiver = req.params.receiverId;

  if (!message) {
    return res.status(400).json({
      success: false,
      message: 'Message content is required',
    });
  }

  const [senderDoc, receiverDoc] = await Promise.all([
    User.findById(sender).select('blockedUsers'),
    User.findById(receiver).select('blockedUsers'),
  ]);

  if (!receiverDoc) {
    return res.status(404).json({
      success: false,
      message: 'Receiver not found',
    });
  }

  const senderBlockedReceiver = (senderDoc?.blockedUsers || []).some((id) => String(id) === String(receiver));
  const receiverBlockedSender = (receiverDoc.blockedUsers || []).some((id) => String(id) === String(sender));
  if (senderBlockedReceiver || receiverBlockedSender) {
    return res.status(403).json({
      success: false,
      message: 'Cannot send message to this user',
    });
  }

  // Check if active match exists
  const match = await Match.findOne({
    $or: [
      { user1: sender, user2: receiver },
      { user1: receiver, user2: sender },
    ],
  });

  if (!match || match.status !== 'accepted') {
    return res.status(403).json({
      success: false,
      message: 'Cannot send message to an unmatched user',
    });
  }

  let newMessage = await Message.create({
    sender,
    receiver,
    message,
    image: req.file ? req.file.path : null,
    audio: req.body.audio || null,
    audioDuration: req.body.audioDuration || null,
  });

  newMessage = await newMessage.populate('sender', 'firstName lastName profilePicture');
  newMessage = await newMessage.populate('receiver', 'firstName lastName profilePicture');

  emitToUser(receiver, 'new_message', newMessage);
  emitToUser(sender, 'new_message', newMessage);

  res.status(201).json({
    success: true,
    message: 'Message sent successfully',
    data: newMessage,
  });
});

// @desc Get conversation
// @route GET /api/messages/conversation/:userId
// @access Private
export const getConversation = asyncHandler(async (req, res, next) => {
  const userId1 = String(req.user._id || req.user.id);
  const userId2 = String(req.params.userId);

  const uObjId1 = mongoose.Types.ObjectId.isValid(userId1) ? new mongoose.Types.ObjectId(userId1) : userId1;
  const uObjId2 = mongoose.Types.ObjectId.isValid(userId2) ? new mongoose.Types.ObjectId(userId2) : userId2;

  const match = await Match.findOne({
    $or: [
      { user1: uObjId1, user2: uObjId2 },
      { user1: uObjId2, user2: uObjId1 },
      { user1: userId1, user2: userId2 },
      { user1: userId2, user2: userId1 },
    ],
  });

  const isUnmatched = match ? match.status === 'unmatched' : false;

  let messages = await Message.find({
    conversationId: conversationKey(userId1, userId2),
    deletedFor: { $ne: uObjId1 },
  })
    .populate('sender', 'firstName lastName profilePicture')
    .populate('receiver', 'firstName lastName profilePicture')
    .sort({ createdAt: 1 });

  if (isUnmatched) {
    messages = messages.map((m) => {
      const msgObj = m.toObject();
      if (String(msgObj.sender?._id || msgObj.sender) === userId2) {
        msgObj.sender = {
          _id: userId2,
          firstName: 'Hemsely User',
          lastName: '',
          profilePicture: null,
        };
      }
      if (String(msgObj.receiver?._id || msgObj.receiver) === userId2) {
        msgObj.receiver = {
          _id: userId2,
          firstName: 'Hemsely User',
          lastName: '',
          profilePicture: null,
        };
      }
      return msgObj;
    });
  }

  res.status(200).json({
    success: true,
    count: messages.length,
    isUnmatched,
    messages,
  });
});

// Converts a stored height to centimeters for range comparisons. When unit is
// 'ft'/'Feet', `value` is a feet.inches decimal (e.g. 5.6 == 5'6"), not decimal feet.
const heightToCmExpr = {
  $switch: {
    branches: [
      { case: { $eq: ['$otherUser.height.unit', 'cm'] }, then: '$otherUser.height.value' },
      {
        case: { $in: ['$otherUser.height.unit', ['ft', 'Feet']] },
        then: {
          $let: {
            vars: { feet: { $floor: '$otherUser.height.value' } },
            in: {
              $add: [
                { $multiply: ['$$feet', 30.48] },
                {
                  $multiply: [
                    { $round: [{ $multiply: [{ $subtract: ['$otherUser.height.value', '$$feet'] }, 10] }, 0] },
                    2.54,
                  ],
                },
              ],
            },
          },
        },
      },
    ],
    default: null,
  },
};

// Builds the optional $match conditions for getConversations from validated query params.
// Every condition follows a "missing profile field never excludes the partner" rule.
const buildConversationFilterMatch = (q, myLocationKnown) => {
  const clauses = [];

  if (q.gender && q.gender !== 'both') {
    clauses.push({ $or: [{ 'otherUser.gender': { $in: ['', null] } }, { 'otherUser.gender': q.gender }] });
  }

  if (q.ageMin !== undefined || q.ageMax !== undefined) {
    const range = {};
    if (q.ageMin !== undefined) range.$gte = q.ageMin;
    if (q.ageMax !== undefined) range.$lte = q.ageMax;
    clauses.push({ $or: [{ 'otherUser.age': null }, { 'otherUser.age': range }] });
  }

  if (q.heightMinCm !== undefined || q.heightMaxCm !== undefined) {
    const range = {};
    if (q.heightMinCm !== undefined) range.$gte = q.heightMinCm;
    if (q.heightMaxCm !== undefined) range.$lte = q.heightMaxCm;
    clauses.push({ $or: [{ otherHeightCm: null }, { otherHeightCm: range }] });
  }

  if (q.distanceKm !== undefined && myLocationKnown) {
    clauses.push({ $or: [{ otherLocationKnown: false }, { distanceKm: { $lte: q.distanceKm } }] });
  }

  ['relationshipGoal', 'religion', 'education', 'drinkingStatus', 'smokingStatus'].forEach((field) => {
    if (q[field]) {
      clauses.push({ $or: [{ [`otherUser.${field}`]: { $in: ['', null] } }, { [`otherUser.${field}`]: q[field] }] });
    }
  });

  return clauses.length ? { $and: clauses } : null;
};

// @desc Get all conversations for current user
// @route GET /api/messages/conversations
// @access Private
export const getConversations = asyncHandler(async (req, res, next) => {
  const userIdStr = String(req.user._id || req.user.id);
  const userObjId = mongoose.Types.ObjectId.isValid(userIdStr) ? new mongoose.Types.ObjectId(userIdStr) : userIdStr;

  // Fetch active or unmatched matches for current user, ignoring those deleted by current user
  const matches = await Match.find({
    $or: [
      { user1: userObjId },
      { user2: userObjId },
      { user1: userIdStr },
      { user2: userIdStr },
    ],
    status: { $in: ['accepted', 'unmatched'] },
    deletedBy: { $ne: userObjId },
  }).select('user1 user2 status');

  const matchStatusMap = new Map();
  matches.forEach((m) => {
    const u1 = String(m.user1);
    const otherId = u1 === userIdStr ? String(m.user2) : u1;
    matchStatusMap.set(otherId, m.status);
  });

  const me = await User.findById(userObjId).select('location.coordinates blockedUsers');
  const blockedIds = (me?.blockedUsers || []).map((id) => String(id));

  const [myLng, myLat] = me?.location?.coordinates?.coordinates || [0, 0];
  const myLocationKnown = myLng !== 0 || myLat !== 0;
  const myLatRad = (myLat * Math.PI) / 180;
  const myLngRad = (myLng * Math.PI) / 180;

  const pipeline = [
    {
      $match: {
        $or: [
          { sender: userObjId },
          { receiver: userObjId },
          { sender: userIdStr },
          { receiver: userIdStr },
        ],
        deletedFor: { $ne: userObjId },
      },
    },
    { $sort: { createdAt: -1 } },
    {
      $group: {
        _id: '$conversationId',
        lastMessage: { $first: '$message' },
        lastMessageTime: { $first: '$createdAt' },
        lastMessageImage: { $first: '$image' },
        lastMessageAudio: { $first: '$audio' },
        lastSender: { $first: '$sender' },
        lastReceiver: { $first: '$receiver' },
        unreadCount: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $or: [{ $eq: ['$receiver', userObjId] }, { $eq: ['$receiver', userIdStr] }] },
                  { $eq: ['$isRead', false] },
                ],
              },
              1,
              0,
            ],
          },
        },
      },
    },
    {
      $addFields: {
        otherUserId: {
          $cond: [
            { $or: [{ $eq: ['$lastSender', userObjId] }, { $eq: ['$lastSender', userIdStr] }] },
            '$lastReceiver',
            '$lastSender',
          ],
        },
      },
    },
    { $lookup: { from: 'users', localField: 'otherUserId', foreignField: '_id', as: 'otherUser' } },
    { $unwind: '$otherUser' },
    {
      $addFields: {
        otherLng: { $ifNull: [{ $arrayElemAt: ['$otherUser.location.coordinates.coordinates', 0] }, 0] },
        otherLat: { $ifNull: [{ $arrayElemAt: ['$otherUser.location.coordinates.coordinates', 1] }, 0] },
        otherHeightCm: heightToCmExpr,
      },
    },
    {
      $addFields: {
        otherLocationKnown: { $or: [{ $ne: ['$otherLng', 0] }, { $ne: ['$otherLat', 0] }] },
        otherLatRad: { $degreesToRadians: '$otherLat' },
        otherLngRad: { $degreesToRadians: '$otherLng' },
      },
    },
    {
      $addFields: {
        haversineA: {
          $let: {
            vars: {
              dLat: { $subtract: ['$otherLatRad', myLatRad] },
              dLng: { $subtract: ['$otherLngRad', myLngRad] },
            },
            in: {
              $add: [
                { $pow: [{ $sin: { $divide: ['$$dLat', 2] } }, 2] },
                {
                  $multiply: [
                    Math.cos(myLatRad),
                    { $cos: '$otherLatRad' },
                    { $pow: [{ $sin: { $divide: ['$$dLng', 2] } }, 2] },
                  ],
                },
              ],
            },
          },
        },
      },
    },
    {
      $addFields: {
        distanceKm: {
          $multiply: [
            6371,
            2,
            { $atan2: [{ $sqrt: '$haversineA' }, { $sqrt: { $subtract: [1, '$haversineA'] } }] },
          ],
        },
      },
    },
  ];

  const filterMatch = buildConversationFilterMatch(req.query, myLocationKnown);
  if (filterMatch) {
    pipeline.push({ $match: filterMatch });
  }

  pipeline.push(
    {
      $project: {
        _id: 0,
        otherUser: {
          _id: '$otherUser._id',
          firstName: '$otherUser.firstName',
          lastName: '$otherUser.lastName',
          profilePicture: '$otherUser.profilePicture',
        },
        lastMessage: 1,
        lastMessageTime: 1,
        lastMessageImage: 1,
        lastMessageAudio: 1,
        unreadCount: 1,
      },
    },
    { $sort: { lastMessageTime: -1 } }
  );

  let conversations = await Message.aggregate(pipeline);

  // Filter out conversations of users who are not matched/unmatched or are blocked
  conversations = conversations
    .filter((c) => {
      const oId = String(c.otherUser?._id);
      return matchStatusMap.has(oId) && !blockedIds.includes(oId);
    })
    .map((c) => {
      const oId = String(c.otherUser?._id);
      const status = matchStatusMap.get(oId);
      if (status === 'unmatched') {
        c.isUnmatched = true;
        c.otherUser.firstName = 'Hemsely User';
        c.otherUser.lastName = '';
        c.otherUser.profilePicture = null;
      } else {
        c.isUnmatched = false;
      }
      return c;
    });

  res.status(200).json({
    success: true,
    count: conversations.length,
    conversations,
  });
});

// @desc Mark messages as read
// @route PUT /api/messages/read/:senderId
// @access Private
export const markAsRead = asyncHandler(async (req, res, next) => {
  const receiver = req.user.id;
  const sender = req.params.senderId;

  await Message.updateMany(
    {
      sender,
      receiver,
      isRead: false,
    },
    {
      $set: { isRead: true, readAt: new Date() },
    }
  );

  emitToUser(sender, 'message:read', { readBy: receiver });

  res.status(200).json({
    success: true,
    message: 'Messages marked as read',
  });
});

// @desc Delete message
// @route DELETE /api/messages/:messageId
// @access Private
export const deleteMessage = asyncHandler(async (req, res, next) => {
  const message = await Message.findById(req.params.messageId);

  if (!message) {
    return res.status(404).json({
      success: false,
      message: 'Message not found',
    });
  }

  if (message.sender.toString() !== req.user.id) {
    return res.status(403).json({
      success: false,
      message: 'You can only delete your own messages',
    });
  }

  await message.deleteOne();

  res.status(200).json({
    success: true,
    message: 'Message deleted successfully',
  });
});

// @desc Delete/Clear conversation for current user
// @route DELETE /api/messages/conversation/:userId
// @access Private
export const deleteConversation = asyncHandler(async (req, res, next) => {
  const userIdStr = String(req.user._id || req.user.id);
  const targetIdStr = String(req.params.userId);

  const userObjId = mongoose.Types.ObjectId.isValid(userIdStr) ? new mongoose.Types.ObjectId(userIdStr) : userIdStr;
  const targetObjId = mongoose.Types.ObjectId.isValid(targetIdStr) ? new mongoose.Types.ObjectId(targetIdStr) : targetIdStr;

  const conversationId = conversationKey(userIdStr, targetIdStr);

  // Mark all messages in this conversation as deletedFor current user
  await Message.updateMany(
    { conversationId },
    { $addToSet: { deletedFor: userObjId } }
  );

  // Add current user to deletedBy array in Match document
  await Match.updateMany(
    {
      $or: [
        { user1: userObjId, user2: targetObjId },
        { user1: targetObjId, user2: userObjId },
        { user1: userIdStr, user2: targetIdStr },
        { user1: targetIdStr, user2: userIdStr },
      ],
    },
    { $addToSet: { deletedBy: userObjId } }
  );

  res.status(200).json({
    success: true,
    message: 'Conversation deleted successfully',
  });
});
