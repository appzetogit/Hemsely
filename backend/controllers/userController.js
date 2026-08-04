import mongoose from 'mongoose';
import User from '../models/User.js';
import Like from '../models/Like.js';
import Match from '../models/Match.js';
import Message from '../models/Message.js';
import Report from '../models/Report.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { evaluateQueueAccessForUser, isBlockedByQueue, getQueueStatusForUser, processQueueReevaluation } from '../utils/queueService.js';
import { getOrCreateConfig } from './appConfigController.js';
import { rankProfiles } from '../utils/rankingService.js';
import { haversineKm, EARTH_RADIUS_KM } from '../utils/geoService.js';
import { stripAllHtml } from '../utils/sanitize.js';
import { generateOtpCode, getOtpExpiry, isOtpValid, lastTenDigits } from '../utils/otpService.js';
import { compareFacesWithAWS } from '../services/awsRekognitionService.js';


// @desc Get the current user's gender-ratio queue status
// @route GET /api/users/queue-status
// @access Private
export const getQueueStatus = asyncHandler(async (req, res, next) => {
  const status = await getQueueStatusForUser(req.user.id);
  res.status(200).json({ success: true, ...status });
});

// @desc Get user profile
// @route GET /api/users/:id
// @access Private
export const getUserProfile = asyncHandler(async (req, res, next) => {
  const targetId = req.params.id === 'me' ? req.user.id : req.params.id;
  const user = await User.findById(targetId).select('-otpCode -otpExpires -fcmtokenweb -fcmtokenmobile -fcmtokenios');

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found',
    });
  }

  if (user.isPremium && user.premiumExpiry && new Date(user.premiumExpiry) < new Date()) {
    user.isPremium = false;
    await User.findByIdAndUpdate(user._id, { isPremium: false });
  }

  if (user.isBoosted && (!user.boostUntil || new Date(user.boostUntil) < new Date())) {
    user.isBoosted = false;
    await User.findByIdAndUpdate(user._id, { isBoosted: false });
  }

  res.status(200).json({
    success: true,
    user,
  });
});

// @desc Consume 1 boost credit and activate a 30-minute profile boost window
// @route POST /api/users/boost/activate
// @access Private
export const activateBoost = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id);

  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  if (!user.boostCount || user.boostCount < 1) {
    return res.status(400).json({ success: false, message: 'No boost credits available' });
  }

  user.boostCount -= 1;
  user.boostUntil = new Date(Date.now() + 30 * 60 * 1000);
  user.isBoosted = true;
  await user.save();

  res.status(200).json({ success: true, user, boostCount: user.boostCount, boostUntil: user.boostUntil });
});

// @desc Update user profile
// @route PUT /api/users/:id
// @access Private
export const updateUserProfile = asyncHandler(async (req, res, next) => {
  if (req.params.id && req.params.id !== 'me' && req.params.id !== req.user.id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Forbidden: Cannot modify another user profile',
    });
  }

  let user = await User.findById(req.user.id);
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found',
    });
  }

  // Handle single name field (e.g., "Rohan Sharma" -> firstName: "Rohan", lastName: "Sharma")
  if (req.body.name && typeof req.body.name === 'string') {
    const parts = req.body.name.trim().split(/\s+/);
    req.body.firstName = parts[0] || req.body.name;
    req.body.lastName = parts.slice(1).join(' ') || '';
  }

  // Handle dob string to calculate age if age is not explicitly passed
  if (req.body.dob && !req.body.age) {
    const birthDate = new Date(req.body.dob);
    if (!isNaN(birthDate.getTime())) {
      const today = new Date();
      let calculatedAge = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        calculatedAge--;
      }
      if (calculatedAge >= 18) {
        req.body.age = calculatedAge;
      }
    }
  }

  // Keep only the schema fields of each prompt — extra keys like a client-side
  // `id` collide with Mongoose's reserved subdocument `id` virtual (CastError).
  if (Array.isArray(req.body.prompts)) {
    req.body.prompts = req.body.prompts.map((p) => ({
      question: p?.question || '',
      answer: p?.answer || '',
    }));
  }

  // Fields that can be updated
  const allowedFields = [
    'firstName',
    'lastName',
    'email',
    'gender',
    'interestedIn',
    'bio',
    'age',
    'interests',
    'relationshipGoal',
    'location',
    'height',
    'bodyType',
    'religion',
    'education',
    'profession',
    'smokingStatus',
    'drinkingStatus',
    'languages',
    'prompts',
    'profilePicture',
    'galleryImages',
    'isProfileComplete',
    'isActive',
    'isPaused',
    'showActiveStatus',
  ];

  const updates = {};
  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  });

  if (updates.bio !== undefined) {
    updates.bio = stripAllHtml(updates.bio);
  }
  if (Array.isArray(updates.prompts)) {
    updates.prompts = updates.prompts.map((p) => ({
      question: stripAllHtml(p.question || ''),
      answer: stripAllHtml(p.answer || ''),
    }));
  }

  if (updates.firstName || req.body.isProfileComplete !== undefined || req.body.gender || req.body.interests) {
    updates.isProfileComplete = true;
  }

  const wasProfileComplete = user.isProfileComplete;

  user = await User.findByIdAndUpdate(user._id, updates, {
    new: true,
    runValidators: true,
  });

  // The gender-ratio queue decision is made once, the moment a male user's
  // profile first becomes complete (i.e. the point they'd start using Discovery).
  if (!wasProfileComplete && user.isProfileComplete && user.gender === 'male') {
    user = await evaluateQueueAccessForUser(user._id);
  } else if (user.isProfileComplete && user.gender === 'female') {
    await processQueueReevaluation();
  }

  res.status(200).json({
    success: true,
    message: 'Profile updated successfully',
    user,
  });
});

// @desc Upload profile picture
// @route POST /api/users/:id/profile-picture
// @access Private
export const uploadProfilePicture = asyncHandler(async (req, res, next) => {
  if (req.params.id !== req.user.id) {
    return res.status(403).json({
      success: false,
      message: 'You can only update your own profile',
    });
  }

  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'No file uploaded',
    });
  }

  const user = await User.findByIdAndUpdate(
    req.params.id,
    { profilePicture: req.file.path },
    { new: true }
  );

  res.status(200).json({
    success: true,
    message: 'Profile picture uploaded successfully',
    user,
  });
});

// @desc Submit a selfie for manual verification review
// @route POST /api/users/:id/selfie
// @access Private
export const submitSelfie = asyncHandler(async (req, res, next) => {
  if (req.params.id !== req.user.id) {
    return res.status(403).json({
      success: false,
      message: 'You can only submit a selfie for your own profile',
    });
  }

  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'No selfie uploaded',
    });
  }

  const profileInput = req.user.profilePicture || (req.user.galleryImages && req.user.galleryImages[0]?.url) || null;
  const result = await compareFacesWithAWS(profileInput, req.file.path, true);
  const isVerified = Boolean(result.verified);
  const selfieStatus = isVerified ? 'approved' : 'pending';

  const user = await User.findByIdAndUpdate(
    req.params.id,
    {
      selfiePhoto: req.file.path,
      selfieStatus,
      isVerified: isVerified || Boolean(req.user.isVerified),
      selfieReviewedBy: isVerified ? req.user._id : null,
      selfieReviewedAt: isVerified ? new Date() : null,
      selfieRejectionReason: '',
    },
    { new: true }
  );

  res.status(200).json({
    success: true,
    message: isVerified ? 'Selfie photo verified successfully!' : 'Selfie submitted for review',
    user,
  });
});

// @desc Verify selfie using AWS Rekognition Facial Recognition API
// @route POST /api/users/selfie-verify-aws
// @access Private
export const verifySelfieAWS = asyncHandler(async (req, res, next) => {
  const userId = req.user.id;
  const user = await User.findById(userId);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User profile not found',
    });
  }

  // Determine selfie photo input (uploaded file or base64 selfie data)
  let selfieInput = null;
  let selfiePhotoPath = user.selfiePhoto || null;

  if (req.file) {
    // Prefer the compressed on-disk copy (req.file.path) over the raw upload buffer:
    // uploadSelfieMiddleware compresses to max 800x800/q75 before saving, but leaves
    // req.file.buffer as the original, uncompressed bytes — a modern phone-camera photo
    // easily exceeds AWS Rekognition's 5MB image-bytes limit and fails the API call.
    selfieInput = req.file.path || req.file.buffer;
    selfiePhotoPath = req.file.path || req.file.filename;
  } else if (req.body?.selfieData) {
    selfieInput = req.body.selfieData;
  }

  if (!selfieInput) {
    return res.status(400).json({
      success: false,
      message: 'No selfie photo provided for AWS Rekognition verification',
    });
  }

  // Save selfie photo path on user object
  if (selfiePhotoPath) {
    user.selfiePhoto = selfiePhotoPath;
  }

  // Profile image input from user document
  const profileInput = user.profilePicture || (user.galleryImages && user.galleryImages[0]?.url) || null;

  // Extract frame color state (green vs red) when selfie was captured
  const isFaceInFrame = req.body?.isFaceInFrame !== 'false' && req.body?.isFaceInFrame !== false;

  try {
    // Perform face matching via AWS Rekognition Service
    const result = await compareFacesWithAWS(profileInput, selfieInput, isFaceInFrame);

    if (result.verified) {
      user.isVerified = true;
      user.selfieStatus = 'approved';
      user.selfiePhoto = selfiePhotoPath || user.selfiePhoto || profileInput;
      user.selfieReviewedAt = new Date();
      user.selfieRejectionReason = '';
      await user.save();

      return res.status(200).json({
        success: true,
        verified: true,
        selfieStatus: 'approved',
        similarity: result.similarity,
        isMock: result.isMock,
        message: result.message || 'Account activated and verified!',
        user,
      });
    } else {
      // If no face detected at all, reject immediately so user gets feedback to retake
      if (result.noFaceDetected) {
        user.isVerified = false;
        user.selfieStatus = 'rejected';
        user.selfiePhoto = selfiePhotoPath || user.selfiePhoto || profileInput;
        user.selfieRejectionReason = result.message || 'No human face detected in selfie photo.';
        await user.save();

        return res.status(200).json({
          success: true,
          verified: false,
          noFaceDetected: true,
          selfieStatus: 'rejected',
          similarity: 0,
          isMock: result.isMock,
          message: result.message || 'No human face detected in selfie photo. Please try again with a clear photo showing your face.',
          user,
        });
      }

      // Auto verification failed (no match, or AWS service error) — route to pending for manual admin review
      if (result.error) {
        console.error(`[Selfie Verification] AWS Rekognition service error for user ${userId}: ${result.message}`);
      }
      user.isVerified = false;
      user.selfieStatus = 'pending';
      user.selfiePhoto = selfiePhotoPath || user.selfiePhoto || profileInput;
      user.selfieRejectionReason = '';
      await user.save();

      return res.status(200).json({
        success: true,
        verified: false,
        pending: true,
        selfieStatus: 'pending',
        similarity: result.similarity || 0,
        isMock: result.isMock,
        message: result.message || 'Your selfie has been submitted for manual admin verification and is currently under review.',
        user,
      });
    }
  } catch (err) {
    // On any service error, save captured photo and route to pending for manual admin review
    user.isVerified = false;
    user.selfieStatus = 'pending';
    user.selfiePhoto = selfiePhotoPath || user.selfiePhoto || profileInput;
    user.selfieRejectionReason = '';
    await user.save();

    return res.status(200).json({
      success: true,
      verified: false,
      pending: true,
      selfieStatus: 'pending',
      message: 'Your selfie has been submitted for manual admin verification and is currently under review.',
      user,
    });
  }
});


// @desc Add gallery images
// @route POST /api/users/:id/gallery
// @access Private
export const addGalleryImages = asyncHandler(async (req, res, next) => {
  if (req.params.id !== req.user.id) {
    return res.status(403).json({
      success: false,
      message: 'You can only update your own profile',
    });
  }

  if (!req.files || req.files.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'No files uploaded',
    });
  }

  const user = await User.findById(req.params.id);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found',
    });
  }

  req.files.forEach((file) => {
    user.galleryImages.push({
      url: file.path,
      uploadedAt: new Date(),
    });
  });

  await user.save();

  res.status(200).json({
    success: true,
    message: `${req.files.length} image(s) added successfully`,
    user,
  });
});

// @desc Delete gallery image
// @route DELETE /api/users/:id/gallery/:imageId
// @access Private
export const deleteGalleryImage = asyncHandler(async (req, res, next) => {
  if (req.params.id !== req.user.id) {
    return res.status(403).json({
      success: false,
      message: 'You can only update your own profile',
    });
  }

  const user = await User.findById(req.params.id);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found',
    });
  }

  user.galleryImages = user.galleryImages.filter(
    (image) => image._id.toString() !== req.params.imageId
  );

  await user.save();

  res.status(200).json({
    success: true,
    message: 'Image deleted successfully',
    user,
  });
});

// @desc Get discovery feed
// @route GET /api/users/discovery/feed
// @access Private
export const getDiscoveryFeed = asyncHandler(async (req, res, next) => {
  const currentUser = await User.findById(req.user.id);

  if (!currentUser) {
    return res.status(404).json({
      success: false,
      message: 'User not found',
    });
  }

  if (isBlockedByQueue(currentUser)) {
    const queueStatus = await getQueueStatusForUser(currentUser._id);
    return res.status(403).json({
      success: false,
      queued: true,
      ...queueStatus,
      message: 'You are in the access queue. Get a subscription for instant access, or wait for your turn.',
    });
  }

  const config = await getOrCreateConfig();
  const page = Math.max(parseInt(req.query.page || '1', 10), 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit || '20', 10), 1), 50);
  const skip = (page - 1) * limit;
  const effectiveRadiusKm = parseFloat(req.query.distanceKm || config.discoveryRadiusKm || '50');

  const userIdStr = String(req.user._id || req.user.id);
  const userObjId = mongoose.Types.ObjectId.isValid(userIdStr) ? new mongoose.Types.ObjectId(userIdStr) : userIdStr;

  // Already-liked users shouldn't reappear in the feed
  const likedUserIds = await Like.find({
    $or: [{ likedBy: userObjId }, { likedBy: userIdStr }],
  }).distinct('likedUser');

  // Only active ('accepted') matched users shouldn't reappear in discovery. Unmatched users CAN reappear!
  const activeMatches = await Match.find({
    status: 'accepted',
    $or: [
      { user1: userObjId },
      { user2: userObjId },
      { user1: userIdStr },
      { user2: userIdStr },
    ],
  }).select('user1 user2');

  const activeMatchedUserIds = activeMatches.map((m) => {
    const u1 = String(m.user1);
    return u1 === userIdStr ? String(m.user2) : u1;
  });

  const rawExcluded = [
    userIdStr,
    ...(currentUser.blockedUsers || []).map((id) => String(id)),
    ...likedUserIds.map((id) => String(id)),
    ...activeMatchedUserIds,
  ];

  const excludedObjIds = rawExcluded
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));

  // Build query to find matching profiles
  const query = {
    _id: { $nin: [...rawExcluded, ...excludedObjIds] },
    isBanned: false,
    isPaused: { $ne: true },
    isActive: { $ne: false },
  };

  // Filter candidates who are interested in current user's gender (or haven't set restrictive preference)
  if (currentUser.gender) {
    query.$or = [
      { interestedIn: currentUser.gender },
      { interestedIn: { $size: 0 } },
      { interestedIn: { $exists: false } },
      { interestedIn: null },
    ];
  }

  // Enforce Max Age Gap if configured and requester has age
  if (currentUser.age && config.maxAgeGapYears) {
    const minAge = Math.max(18, currentUser.age - config.maxAgeGapYears);
    const maxAge = currentUser.age + config.maxAgeGapYears;
    const ageFilter = {
      $or: [
        { age: { $gte: minAge, $lte: maxAge } },
        { age: { $exists: false } },
        { age: null },
      ],
    };
    if (query.$or) {
      query.$and = [{ $or: query.$or }, ageFilter];
      delete query.$or;
    } else {
      query.$or = ageFilter.$or;
    }
  }

  // If current user has gender preference, filter by it
  if (Array.isArray(currentUser.interestedIn) && currentUser.interestedIn.length > 0) {
    query.gender = { $in: currentUser.interestedIn };
  }

  const [myLng, myLat] = currentUser.location?.coordinates?.coordinates || [0, 0];
  const myLocationKnown = myLng !== 0 || myLat !== 0;

  // Distance pre-filter: only apply strict geo radius limit when explicitly requested by client via distanceKm query parameter
  if (req.query.distanceKm && myLocationKnown) {
    const distanceKm = parseFloat(req.query.distanceKm);
    query['location.coordinates'] = {
      $geoWithin: { $centerSphere: [[myLng, myLat], distanceKm / EARTH_RADIUS_KM] },
    };
    query['location.coordinates.coordinates'] = { $ne: [0, 0] };
  }

  // Rank within a bounded candidate pool (Super User > Premium+Verified > Verified >
  // Premium tier, plus online status and average time-spent) rather than natural
  // DB order, then paginate the already-ranked list.
  const CANDIDATE_POOL_SIZE = 200;
  const [candidates, totalCount] = await Promise.all([
    User.find(query).limit(CANDIDATE_POOL_SIZE).lean(),
    User.countDocuments(query),
  ]);

  // Attach a display-only distance to every candidate, independent of whether
  // the distance FILTER is active, so the UI can show "X km away" whenever
  // both sides' locations are known. Never a fake/zero distance otherwise.
  const withDistance = candidates.map((c) => {
    const [cLng, cLat] = c.location?.coordinates?.coordinates || [0, 0];
    const theirLocationKnown = cLng !== 0 || cLat !== 0;
    return {
      ...c,
      distanceKm:
        myLocationKnown && theirLocationKnown
          ? Math.round(haversineKm(myLat, myLng, cLat, cLng) * 10) / 10
          : null,
    };
  });

  const ranked = rankProfiles(withDistance);
  const users = ranked.slice(skip, skip + limit);

  res.status(200).json({
    success: true,
    count: users.length,
    hasMore: skip + users.length < Math.min(totalCount, CANDIDATE_POOL_SIZE),
    users,
  });
});

// @desc Block user
// @route POST /api/users/:id/block/:blockedUserId
// @access Private
export const blockUser = asyncHandler(async (req, res, next) => {
  if (req.params.id !== req.user.id) {
    return res.status(403).json({
      success: false,
      message: 'You can only manage your own block list',
    });
  }

  const user = await User.findById(req.params.id);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found',
    });
  }

  if (!user.blockedUsers.includes(req.params.blockedUserId)) {
    user.blockedUsers.push(req.params.blockedUserId);
  }

  await user.save();

  res.status(200).json({
    success: true,
    message: 'User blocked successfully',
  });
});

// @desc Unblock user
// @route POST /api/users/:id/unblock/:blockedUserId
// @access Private
export const unblockUser = asyncHandler(async (req, res, next) => {
  if (req.params.id !== req.user.id) {
    return res.status(403).json({
      success: false,
      message: 'You can only manage your own block list',
    });
  }

  const user = await User.findById(req.params.id);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found',
    });
  }

  user.blockedUsers = user.blockedUsers.filter(
    (blockedUser) => blockedUser.toString() !== req.params.blockedUserId
  );

  await user.save();

  res.status(200).json({
    success: true,
    message: 'User unblocked successfully',
  });
});

// @desc Report user
// @route POST /api/users/:id/report/:reportedUserId
// @access Private
export const reportUser = asyncHandler(async (req, res, next) => {
  if (req.params.id !== req.user.id) {
    return res.status(403).json({
      success: false,
      message: 'You can only report users as yourself',
    });
  }

  const user = await User.findById(req.params.id);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found',
    });
  }

  if (!user.reportedUsers.includes(req.params.reportedUserId)) {
    user.reportedUsers.push(req.params.reportedUserId);
  }

  await user.save();

  // Real, admin-queryable report record (the embedded reportedUsers array above
  // is kept only for quick "have I already reported this person" checks).
  await Report.create({
    reporter: req.user.id,
    reportedUser: req.params.reportedUserId,
    category: req.body.category || 'other',
    reason: req.body.reason || '',
  });

  res.status(200).json({
    success: true,
    message: 'User reported successfully',
  });
});

// @desc Delete user profile
// @route DELETE /api/users/:id
// @access Private
// @desc Send a fresh OTP that must be entered to confirm account deletion
// @route POST /api/users/:id/request-delete-otp
// @access Private
export const requestAccountDeletionOtp = asyncHandler(async (req, res, next) => {
  if (req.params.id !== req.user.id) {
    return res.status(403).json({
      success: false,
      message: 'You can only request this for your own account',
    });
  }

  const user = await User.findById(req.params.id);
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  const last10Digits = lastTenDigits(user.phoneNumber);
  user.otpCode = generateOtpCode(last10Digits);
  user.otpExpires = getOtpExpiry();
  await user.save();

  console.log(`📱 [ACCOUNT DELETION OTP] Phone: ${user.phoneNumber} | OTP: ${user.otpCode}`);

  res.status(200).json({
    success: true,
    message: 'A confirmation code has been sent to your registered phone number',
  });
});

export const deleteUserProfile = asyncHandler(async (req, res, next) => {
  if (req.params.id !== req.user.id) {
    return res.status(403).json({
      success: false,
      message: 'You can only delete your own account',
    });
  }

  const user = await User.findById(req.params.id);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found',
    });
  }

  const enteredOtp = req.body?.otp ? String(req.body.otp).trim() : '';
  const last10Digits = lastTenDigits(user.phoneNumber);
  if (!enteredOtp || !isOtpValid(user, enteredOtp, last10Digits)) {
    return res.status(400).json({
      success: false,
      message: 'Please confirm this action with the code sent to your phone',
    });
  }

  await User.findByIdAndDelete(req.params.id);

  // Cascade cleanup: remove the deleted user's likes, matches, and messages
  // so downstream populate() calls never resolve a null user reference.
  await Promise.all([
    Like.deleteMany({ $or: [{ likedBy: req.params.id }, { likedUser: req.params.id }] }),
    Match.deleteMany({ $or: [{ user1: req.params.id }, { user2: req.params.id }] }),
    Message.deleteMany({ $or: [{ sender: req.params.id }, { receiver: req.params.id }] }),
  ]);

  res.status(200).json({
    success: true,
    message: 'Account deleted successfully',
  });
});

// @desc Get list of blocked users
// @route GET /api/users/:id/blocked
// @access Private
export const getBlockedUsers = asyncHandler(async (req, res, next) => {
  if (req.params.id !== req.user.id) {
    return res.status(403).json({
      success: false,
      message: 'You can only view your own block list',
    });
  }

  const user = await User.findById(req.params.id).populate({
    path: 'blockedUsers',
    select: 'firstName lastName name profilePicture galleryImages age phone email',
  });

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found',
    });
  }

  res.status(200).json({
    success: true,
    blockedUsers: user.blockedUsers || [],
  });
});
