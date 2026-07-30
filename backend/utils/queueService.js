import User from '../models/User.js';
import { getOrCreateConfig } from '../controllers/appConfigController.js';

// Users with any of these get instant access regardless of the gender queue.
const bypassesQueue = (user) => !!(user.isPremium || user.isSuperUser || user.isSuperSubscriber);

// How many active (non-queued) males the current female count allows, given the
// configured ratio (e.g. 1:4 male:female means males may be at most 1/4 of females).
const getAllowedMaleCount = async (config) => {
  const activeFemales = await User.countDocuments({
    gender: 'female',
    isProfileComplete: true,
    isBanned: false,
  });
  return Math.floor(activeFemales * (config.queueRatioMale / config.queueRatioFemale));
};

// Immediately releases all queued users when gender queue is turned OFF.
export const releaseAllQueuedUsers = async () => {
  await User.updateMany(
    { accessStatus: 'queued' },
    { $set: { accessStatus: 'active', queuedAt: null } }
  );
};

// Re-evaluates queue FIFO order when new females register or ratio expands.
export const processQueueReevaluation = async () => {
  const config = await getOrCreateConfig();
  if (!config.genderQueueEnabled) {
    await releaseAllQueuedUsers();
    return;
  }

  const activeMaleCount = await User.countDocuments({
    gender: 'male',
    isProfileComplete: true,
    isBanned: false,
    accessStatus: 'active',
  });
  const allowedMales = await getAllowedMaleCount(config);

  if (allowedMales > activeMaleCount) {
    const slotsAvailable = allowedMales - activeMaleCount;
    const queuedMalesToPromote = await User.find({
      gender: 'male',
      accessStatus: 'queued',
    })
      .sort({ queuedAt: 1 })
      .limit(slotsAvailable);

    for (const maleUser of queuedMalesToPromote) {
      maleUser.accessStatus = 'active';
      maleUser.queuedAt = null;
      await maleUser.save();
    }
  }
};

// Called once, right when a male user's profile becomes complete, to decide
// whether they get instant access or join the queue. Phase 1 is country-wide
// only — queueScope/queueRadiusKm are stored for the future radius-based Phase 2.
export const evaluateQueueAccessForUser = async (userId) => {
  const user = await User.findById(userId);
  if (!user || user.gender !== 'male') return null;

  const config = await getOrCreateConfig();
  if (!config.genderQueueEnabled || bypassesQueue(user)) {
    user.accessStatus = 'active';
    user.queuedAt = null;
    await user.save();
    return user;
  }

  // Exclude the user being evaluated: their accessStatus still defaults to
  // 'active' at this point (it hasn't been decided yet), so counting them
  // would bias every determination one slot too high.
  const activeMaleCount = await User.countDocuments({
    _id: { $ne: user._id },
    gender: 'male',
    isProfileComplete: true,
    isBanned: false,
    accessStatus: 'active',
  });
  const allowedMales = await getAllowedMaleCount(config);

  if (activeMaleCount >= allowedMales) {
    user.accessStatus = 'queued';
    user.queuedAt = user.queuedAt || new Date();
  } else {
    user.accessStatus = 'active';
    user.queuedAt = null;
  }
  await user.save();
  return user;
};

// Immediately lifts a user out of the queue — used when they buy a subscription
// or an admin grants Super User/Subscriber status.
export const releaseFromQueue = async (userId) => {
  await User.findByIdAndUpdate(userId, { accessStatus: 'active', queuedAt: null });
  await processQueueReevaluation();
};

export const getQueueStatusForUser = async (userId) => {
  const user = await User.findById(userId).select('gender accessStatus queuedAt isPremium isSuperUser isSuperSubscriber');
  if (!user || user.accessStatus !== 'queued') {
    return { queued: false, position: null, totalQueued: 0 };
  }

  const [position, totalQueued] = await Promise.all([
    User.countDocuments({ gender: 'male', accessStatus: 'queued', queuedAt: { $lte: user.queuedAt } }),
    User.countDocuments({ gender: 'male', accessStatus: 'queued' }),
  ]);

  return { queued: true, position, totalQueued };
};

// Admin-facing snapshot of current gender-ratio queue health.
export const getQueueAdminSnapshot = async () => {
  const config = await getOrCreateConfig();
  const [activeMales, activeFemales, queuedMales] = await Promise.all([
    User.countDocuments({ gender: 'male', isProfileComplete: true, isBanned: false, accessStatus: 'active' }),
    User.countDocuments({ gender: 'female', isProfileComplete: true, isBanned: false }),
    User.countDocuments({ gender: 'male', accessStatus: 'queued' }),
  ]);
  const allowedMales = await getAllowedMaleCount(config);

  return {
    ratio: { male: config.queueRatioMale, female: config.queueRatioFemale },
    scope: config.queueScope,
    enabled: config.genderQueueEnabled,
    activeMales,
    activeFemales,
    allowedMales,
    queuedMales,
  };
};

export const isBlockedByQueue = (user) => {
  if (!user) return false;
  if (bypassesQueue(user)) return false;
  return user.accessStatus === 'queued';
};
