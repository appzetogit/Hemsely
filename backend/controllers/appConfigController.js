import AppConfig from '../models/AppConfig.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { logAdminAction } from '../utils/auditLog.js';
import { releaseAllQueuedUsers, processQueueReevaluation } from '../utils/queueService.js';
import { broadcastMaintenanceMode } from '../socket/index.js';

// In-memory cache for AppConfig to eliminate repetitive DB queries across high-volume traffic
let cachedConfig = null;
let lastFetchTime = 0;
const CONFIG_CACHE_TTL_MS = 30 * 1000; // 30 seconds

export const invalidateConfigCache = () => {
  cachedConfig = null;
  lastFetchTime = 0;
};

// Singleton accessor — uses in-memory cache to handle 20,000+ live concurrent requests with zero DB bottleneck
export const getOrCreateConfig = async (forceFresh = false) => {
  const now = Date.now();
  if (!forceFresh && cachedConfig && now - lastFetchTime < CONFIG_CACHE_TTL_MS) {
    return cachedConfig;
  }

  let config = await AppConfig.findOne({});
  if (!config) {
    config = await AppConfig.create({});
  }

  cachedConfig = config;
  lastFetchTime = now;
  return config;
};

// @desc Get app config
// @route GET /api/admin/app-config
// @access Private/Admin
export const getAppConfig = asyncHandler(async (req, res) => {
  const config = await getOrCreateConfig();
  res.status(200).json({ success: true, config });
});

// @desc Update app config
// @route PUT /api/admin/app-config
// @access Private/Admin
export const updateAppConfig = asyncHandler(async (req, res) => {
  const allowedFields = [
    'maintenanceMode', 'signupsEnabled', 'holdLikesQueue', 'dailyLikeLimit',
    'discoveryRadiusKm', 'maxAgeGapYears', 'minAppVersion', 'supportEmail',
    'genderQueueEnabled', 'queueRatioMale', 'queueRatioFemale', 'queueScope', 'queueRadiusKm',
    'boostPrice1', 'boostPrice5',
  ];
  const updates = { updatedBy: req.admin.id };
  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  });

  const config = await AppConfig.findOneAndUpdate({}, updates, {
    new: true,
    upsert: true,
    runValidators: true,
  });

  cachedConfig = config;
  lastFetchTime = Date.now();

  if (config.genderQueueEnabled === false) {
    await releaseAllQueuedUsers();
  } else {
    await processQueueReevaluation();
  }

  broadcastMaintenanceMode(config.maintenanceMode);

  await logAdminAction({
    adminId: req.admin.id,
    action: 'update_app_config',
    targetType: 'AppConfig',
    targetId: config._id,
    details: updates,
    ip: req.ip,
  });

  res.status(200).json({ success: true, message: 'App config updated', config });
});
