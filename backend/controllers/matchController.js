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

  // Check if already liked
  let like = await Like.findOne({ likedBy, likedUser });

  if (like) {
    return res.status(400).json({
      success: false,
      message: 'You have already liked this user',
    });
  }

  // Create like
  like = await Like.create({ likedBy, likedUser });

  // Check if mutual like exists
  const mutualLike = await Like.findOne({ likedBy: likedUser, likedUser: likedBy });

  if (mutualLike) {
    // Create match
    let match = await Match.findOne({
      $or: [
        { user1: likedBy, user2: likedUser },
        { user1: likedUser, user2: likedBy },
      ],
    });

    if (!match) {
      match = await Match.create({
        user1: likedBy,
        user2: likedUser,
        initiatedBy: likedBy,
        status: 'accepted',
      });
    }

    emitToUser(likedUser, 'new_match', { match, otherUserId: likedBy });

    return res.status(201).json({
      success: true,
      message: 'It\'s a match!',
      isMatched: true,
      match,
    });
  }

  res.status(201).json({
    success: true,
    message: 'User liked successfully',
    isMatched: false,
  });
});

// @desc Unlike a user
// @route DELETE /api/matches/unlike/:userId
// @access Private
export const unlikeUser = asyncHandler(async (req, res, next) => {
  const likedBy = req.user.id;
  const likedUser = req.params.userId;

  const like = await Like.findOneAndDelete({ likedBy, likedUser });

  if (!like) {
    return res.status(404).json({
      success: false,
      message: 'Like not found',
    });
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

  const matches = await Match.find({
    $or: [{ user1: userId }, { user2: userId }],
    status: 'accepted',
  })
    .populate('user1', 'firstName lastName profilePicture')
    .populate('user2', 'firstName lastName profilePicture')
    .sort({ lastMessageAt: -1 });

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
