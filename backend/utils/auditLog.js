import AuditLog from '../models/AuditLog.js';

// Fire-and-forget audit log write; a logging failure should never break the admin action it's recording.
export const logAdminAction = async ({ adminId, action, targetType, targetId, details, ip }) => {
  try {
    await AuditLog.create({ admin: adminId, action, targetType, targetId, details, ip });
  } catch (error) {
    console.error('Failed to write audit log:', error.message);
  }
};
