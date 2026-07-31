import mongoose from 'mongoose';
import User from '../models/User.js';
import Like from '../models/Like.js';
import Match from '../models/Match.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { emitToUser } from '../socket/index.js';
import { getOrCreateConfig } from './appConfigController.js';
import { isBlockedByQueue, getQueueStatusForUser } from '../utils/queueService.js';

// @desc Like a user
// @route POST /api/matches/like/:userId
// @access Private
export const likeUser = asyncHandler(async (req, res, next) => {
  const likedBy = req.user.id;
  const likedUser = req.params.userId;

  if (likedBy === likedUser) {
    return res.status(400).json({
      success: false,
      message: 'Cannot like yourself',
    });
  }

  const likingUser = await User.findById(likedBy).select('accessStatus isPremium isSuperUser isSuperSubscriber');
  if (likingUser && isBlockedByQueue(likingUser)) {
    const queueStatus = await getQueueStatusForUser(likedBy);
    return res.status(403).json({
      success: false,
      queued: true,
      ...queueStatus,
      message: 'You are in the access queue. Get a subscription for instant access, or wait for your turn.',
    });
  }

  const config = await getOrCreateConfig();
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const likesToday = await Like.countDocuments({ likedBy, createdAt: { $gte: startOfToday } });

  if (!likingUser?.isPremium && likesToday >= config.dailyLikeLimit) {
    return res.status(429).json({
      success: false,
      message: `You've reached your daily like limit of ${config.dailyLikeLimit}. Try again tomorrow.`,
    });
  }

  const likedByObj = mongoose.Types.ObjectId.isValid(likedBy) ? new mongoose.Types.ObjectId(likedBy) : likedBy;
  const likedUserObj = mongoose.Types.ObjectId.isValid(likedUser) ? new mongoose.Types.ObjectId(likedUser) : likedUser;

  // Check if already liked
  let like = await Like.findOne({
    $or: [
      { likedBy: likedByObj, likedUser: likedUserObj },
      { likedBy, likedUser },
    ],
  });

  if (!like) {
    like = await Like.create({ likedBy: likedByObj, likedUser: likedUserObj });
  }

  // Check if mutual like exists
  const mutualLike = await Like.findOne({
    $or: [
      { likedBy: likedUserObj, likedUser: likedByObj },
      { likedBy: likedUser, likedUser: likedBy },
    ],
  });

  let match = await Match.findOne({
    $or: [
      { user1: likedByObj, user2: likedUserObj },
      { user1: likedUserObj, user2: likedByObj },
      { user1: likedBy, user2: likedUser },
      { user1: likedUser, user2: likedBy },
    ],
  });

  if (mutualLike) {
    if (!match) {
      match = await Match.create({
        user1: likedByObj,
        user2: likedUserObj,
        initiatedBy: likedByObj,
        status: 'accepted',
      });
    } else {
      match.status = 'accepted';
      match.initiatedBy = likedByObj;
      match.unmatchedBy = null;
      match.unmatchedAt = null;
      match.deletedBy = [];
      await match.save();
    }

    emitToUser(likedUser, 'new_match', { match, otherUserId: likedBy });

    return res.status(200).json({
      success: true,
      message: "It's a match!",
      isMatched: true,
      match,
    });
  }

  res.status(200).json({
    success: true,
    message: 'User liked successfully',
    isMatched: false,
  });
});

// @desc Unmatch a user
// @route POST /api/matches/unmatch/:userId
// @access Private
export const unmatchUser = asyncHandler(async (req, res, next) => {
  const userId = req.user?._id || req.user?.id;
  const targetId = req.params?.userId;

  try {
    if (userId && targetId) {
      const uId = userId.toString();
      const tId = targetId.toString();

      const userObjId = mongoose.Types.ObjectId.isValid(uId) ? new mongoose.Types.ObjectId(uId) : uId;
      const targetObjId = mongoose.Types.ObjectId.isValid(tId) ? new mongoose.Types.ObjectId(tId) : tId;

      // Update or create Match document with 'unmatched' status
      let match = await Match.findOne({
        $or: [
          { user1: userObjId, user2: targetObjId },
          { user1: targetObjId, user2: userObjId },
          { user1: uId, user2: tId },
          { user1: tId, user2: uId },
        ],
      });

      if (match) {
        match.status = 'unmatched';
        match.unmatchedBy = userObjId;
        match.unmatchedAt = new Date();
        await match.save();
      } else {
        await Match.create({
          user1: userObjId,
          user2: targetObjId,
          initiatedBy: userObjId,
          status: 'unmatched',
          unmatchedBy: userObjId,
          unmatchedAt: new Date(),
        });
      }

      // Remove likes so that users can swipe/like each other again in future
      await Like.deleteMany({
        $or: [
          { likedBy: userObjId, likedUser: targetObjId },
          { likedBy: targetObjId, likedUser: userObjId },
          { likedBy: uId, likedUser: tId },
          { likedBy: tId, likedUser: uId },
        ],
      });

      try {
        emitToUser(tId, 'user_unmatched', { unmatchBy: uId, targetId: tId });
        emitToUser(uId, 'user_unmatched', { unmatchBy: tId, targetId: uId });
      } catch (err) {
        // Ignore socket emit error
      }
    }
  } catch (err) {
    console.error('Error in unmatchUser:', err);
  }

  res.status(200).json({
    success: true,
    message: 'User unmatched successfully',
  });
});

// @desc Unlike a user
// @route DELETE /api/matches/unlike/:userId
// @access Private
export const unlikeUser = asyncHandler(async (req, res, next) => {
  const likedBy = req.user?._id || req.user?.id;
  const likedUser = req.params?.userId;

  try {
    if (likedBy && likedUser && mongoose.Types.ObjectId.isValid(likedUser) && mongoose.Types.ObjectId.isValid(likedBy)) {
      await Like.findOneAndDelete({ likedBy, likedUser });
      await Match.deleteMany({
        $or: [
          { user1: likedBy, user2: likedUser },
          { user1: likedUser, user2: likedBy },
        ],
      });
    }
  } catch (err) {
    console.error('Error in unlikeUser:', err);
  }

  res.status(200).json({
    success: true,
    message: 'Like removed successfully',
  });
});

// @desc Get all matches
// @route GET /api/matches
// @access Private
export const getMatches = asyncHandler(async (req, res, next) => {
  const userId = req.user.id;

  const userDoc = await User.findById(userId).select('blockedUsers');
  const blockedIds = (userDoc?.blockedUsers || []).map((id) => String(id));

  let matches = await Match.find({
    $or: [{ user1: userId }, { user2: userId }],
    status: 'accepted',
  })
    .populate('user1', 'firstName lastName profilePicture')
    .populate('user2', 'firstName lastName profilePicture')
    .sort({ lastMessageAt: -1 });

  matches = matches.filter((m) => {
    const otherId = String(m.user1?._id) === String(userId) ? String(m.user2?._id) : String(m.user1?._id);
    return !blockedIds.includes(otherId);
  });

  res.status(200).json({
    success: true,
    count: matches.length,
    matches,
  });
});

// @desc Get likes you received
// @route GET /api/matches/likes/received
// @access Private
export const getLikesReceived = asyncHandler(async (req, res, next) => {
  const userId = req.user.id;

  const config = await getOrCreateConfig();
  if (config.holdLikesQueue) {
    return res.status(200).json({
      success: true,
      queued: true,
      count: 0,
      likes: [],
    });
  }

  const likes = await Like.find({ likedUser: userId })
    .populate('likedBy', 'firstName lastName profilePicture bio age gender')
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    queued: false,
    count: likes.length,
    likes,
  });
});

// @desc Get likes you sent
// @route GET /api/matches/likes/sent
// @access Private
export const getLikesSent = asyncHandler(async (req, res, next) => {
  const userId = req.user.id;

  const likes = await Like.find({ likedBy: userId })
    .populate('likedUser', 'firstName lastName profilePicture bio age gender')
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: likes.length,
    likes,
  });
});

// @desc Accept match request
// @route PUT /api/matches/:matchId/accept
// @access Private
export const acceptMatch = asyncHandler(async (req, res, next) => {
  let match = await Match.findById(req.params.matchId);

  if (!match) {
    return res.status(404).json({
      success: false,
      message: 'Match not found',
    });
  }

  if (match.user1.toString() !== req.user.id && match.user2.toString() !== req.user.id) {
    return res.status(403).json({
      success: false,
      message: 'You are not a participant in this match',
    });
  }

  match.status = 'accepted';
  await match.save();

  res.status(200).json({
    success: true,
    message: 'Match accepted',
    match,
  });
});

// @desc Reject match request
// @route PUT /api/matches/:matchId/reject
// @access Private
export const rejectMatch = asyncHandler(async (req, res, next) => {
  let match = await Match.findById(req.params.matchId);

  if (!match) {
    return res.status(404).json({
      success: false,
      message: 'Match not found',
    });
  }

  if (match.user1.toString() !== req.user.id && match.user2.toString() !== req.user.id) {
    return res.status(403).json({
      success: false,
      message: 'You are not a participant in this match',
    });
  }

  match.status = 'rejected';
  match.rejectedBy = req.user.id;
  match.rejectedAt = new Date();
  await match.save();

  res.status(200).json({
    success: true,
    message: 'Match rejected',
    match,
  });
});
