/**
 * Permission Middleware for Admin & Sub-Admin RBAC
 */

/**
 * Middleware to restrict access to superadmins only.
 */
export const requireSuperadmin = (req, res, next) => {
  if (!req.admin || req.admin.role !== 'superadmin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied: Superadmin privileges required.',
    });
  }
  next();
};

/**
 * Middleware to restrict access based on specific page/feature permissions.
 * Superadmins automatically bypass all permission checks.
 * @param {string|string[]} requiredPermissions - Single permission key or array of accepted permission keys.
 */
export const requirePermission = (requiredPermissions) => {
  const permList = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];

  return (req, res, next) => {
    if (!req.admin) {
      return res.status(401).json({
        success: false,
        message: 'Admin authentication required.',
      });
    }

    // Superadmin has universal bypass
    if (req.admin.role === 'superadmin') {
      return next();
    }

    const adminPerms = Array.isArray(req.admin.permissions) ? req.admin.permissions : [];

    // Check if the admin holds at least one of the required permissions
    const hasAccess = permList.some((p) => adminPerms.includes(p));

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: `Access denied: You do not have permission for [${permList.join(', ')}].`,
      });
    }

    next();
  };
};
