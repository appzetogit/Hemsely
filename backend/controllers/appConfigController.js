import AppConfig from '../models/AppConfig.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { logAdminAction } from '../utils/auditLog.js';
import { releaseAllQueuedUsers, processQueueReevaluation } from '../utils/queueService.js';
import { broadcastMaintenanceMode } from '../socket/index.js';

// Singleton accessor — creates the config doc with defaults on first read.
export const getOrCreateConfig = async () => {
  let config = await AppConfig.findOne({});
  if (!config) {
    config = await AppConfig.create({});
  }
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
