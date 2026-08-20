import User from '../models/User.js';
import { getOrCreateConfig } from '../controllers/appConfigController.js';
import { EARTH_RADIUS_KM } from './geoService.js';

// Users with any of these get instant access regardless of the gender queue.
const bypassesQueue = (user) => !!(user.isSuperPremium || user.isPremium || user.isSuperUser || user.isSuperSubscriber);

// Radius-scope query fragment centered on originCoords, or null when scope is
// 'country' or the origin's own location is unknown ([0,0]) — callers merge the
// result into their existing filter, so 'country' mode stays byte-for-byte
// identical to the pre-Phase-2 query with no radius fragment applied at all.
const buildRadiusFilter = (config, originCoords) => {
  if (config.queueScope !== 'radius') return null;
  const [lng, lat] = originCoords || [0, 0];
  if (lng === 0 && lat === 0) return null;
  return {
    'location.coordinates.coordinates': { $ne: [0, 0] },
    'location.coordinates': {
      $geoWithin: { $centerSphere: [[lng, lat], config.queueRadiusKm / EARTH_RADIUS_KM] },
    },
  };
};

// How many active (non-queued) males the current female count allows, given the
// configured ratio (e.g. 1:4 male:female means males may be at most 1/4 of females).
// originCoords scopes the female count to config.queueRadiusKm around that point
// when the queue is in radius mode; omit it (or pass an unknown [0,0]) for the
// country-wide count.
const getAllowedMaleCount = async (config, originCoords = null) => {
  const filter = { gender: 'female', isProfileComplete: true, isBanned: false };
  Object.assign(filter, buildRadiusFilter(config, originCoords) || {});
  const activeFemales = await User.countDocuments(filter);
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
// In radius mode there's no single "center" to run one global slot calculation
// around, so each currently-queued male is re-checked individually (oldest
// first) via evaluateQueueAccessForUser, which is location-aware — a promotion
// earlier in the loop naturally affects later males' counts in the same pass.
export const processQueueReevaluation = async (preloadedConfig = null) => {
  const config = preloadedConfig || await getOrCreateConfig();
  if (!config.genderQueueEnabled) {
    await releaseAllQueuedUsers();
    return;
  }

  if (config.queueScope === 'radius') {
    const queuedMales = await User.find({ gender: 'male', accessStatus: 'queued' }).sort({ queuedAt: 1 });
    for (const maleUser of queuedMales) {
      await evaluateQueueAccessForUser(maleUser._id, config);
    }
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

// Called once, right when a male user's profile becomes complete (and again by
// processQueueReevaluation's radius-mode loop), to decide whether they get
// instant access or join the queue. Supports both Phase 1 (country-wide) and
// Phase 2 (radius-based, scoped to config.queueRadiusKm around the user's own
// location) — a male with no known location falls back to the country-wide
// count rather than being permanently blocked for lacking GPS permission.
export const evaluateQueueAccessForUser = async (userId, preloadedConfig = null) => {
  const user = await User.findById(userId);
  if (!user || user.gender !== 'male') return null;

  const config = preloadedConfig || await getOrCreateConfig();
  if (!config.genderQueueEnabled || bypassesQueue(user)) {
    user.accessStatus = 'active';
    user.queuedAt = null;
    await user.save();
    return user;
  }

  const originCoords = user.location?.coordinates?.coordinates;
  const radiusFilter = buildRadiusFilter(config, originCoords);

  // Exclude the user being evaluated: their accessStatus still defaults to
  // 'active' at this point (it hasn't been decided yet), so counting them
  // would bias every determination one slot too high.
  const activeMaleFilter = {
    _id: { $ne: user._id },
    gender: 'male',
    isProfileComplete: true,
    isBanned: false,
    accessStatus: 'active',
  };
  Object.assign(activeMaleFilter, radiusFilter || {});
  const activeMaleCount = await User.countDocuments(activeMaleFilter);
  const allowedMales = await getAllowedMaleCount(config, radiusFilter ? originCoords : null);

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
  const user = await User.findById(userId).select('gender accessStatus queuedAt location isSuperPremium isPremium isSuperUser isSuperSubscriber');
  if (!user || user.accessStatus !== 'queued') {
    return { queued: false, position: null, totalQueued: 0 };
  }

  // Scope the displayed position/total to the same radius neighborhood that
  // actually determines this user's promotion, so the number shown isn't
  // misleading relative to what processQueueReevaluation will do for them.
  const config = await getOrCreateConfig();
  const radiusFilter = buildRadiusFilter(config, user.location?.coordinates?.coordinates);

  const positionFilter = { gender: 'male', accessStatus: 'queued', queuedAt: { $lte: user.queuedAt } };
  const totalFilter = { gender: 'male', accessStatus: 'queued' };
  Object.assign(positionFilter, radiusFilter || {});
  Object.assign(totalFilter, radiusFilter || {});

  const [position, totalQueued] = await Promise.all([
    User.countDocuments(positionFilter),
    User.countDocuments(totalFilter),
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
