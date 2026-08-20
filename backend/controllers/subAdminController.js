import Admin from '../models/Admin.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { validatePassword, validateEmailStrict } from '../utils/validators.js';

export const ALLOWED_PERMISSIONS = [
  'dashboard',
  'users',
  'moderation',
  'selfie-verification',
  'reports',
  'support',
  'subscriptions',
  'boost-edit',
  'subscription-users',
  'transactions',
  'notifications',
  'app-config',
  'website-pages',
];

// @desc Get all Sub-Admins
// @route GET /api/admin/subadmins
// @access Private (Superadmin only)
export const getSubAdmins = asyncHandler(async (req, res) => {
  const subAdmins = await Admin.find({ _id: { $ne: req.admin.id }, role: { $ne: 'superadmin' } })
    .select('-password')
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: subAdmins.length,
    subAdmins,
  });
});

// @desc Create a new Sub-Admin
// @route POST /api/admin/subadmins
// @access Private (Superadmin only)
export const createSubAdmin = asyncHandler(async (req, res) => {
  const { username, email, password, firstName, lastName, permissions } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Email and password are required.',
    });
  }

  const cleanEmail = String(email).trim().toLowerCase();

  const emailCheck = validateEmailStrict(cleanEmail);
  if (!emailCheck.isValid) {
    return res.status(400).json({
      success: false,
      message: emailCheck.message,
    });
  }

  if (!validatePassword(password)) {
    return res.status(400).json({
      success: false,
      message: 'Password must be at least 6 characters.',
    });
  }

  // Check if email already exists
  const existingEmail = await Admin.findOne({ email: cleanEmail });
  if (existingEmail) {
    return res.status(400).json({
      success: false,
      message: 'An admin account with that email already exists.',
    });
  }

  // Auto-generate clean username from email or input
  let baseUsername = (username?.trim() || cleanEmail.split('@')[0]).replace(/[^a-zA-Z0-9_]/g, '');
  if (baseUsername.length < 3) {
    baseUsername = `sub_${baseUsername || 'admin'}`;
  }

  let finalUsername = baseUsername;
  let collision = await Admin.findOne({ username: finalUsername });
  while (collision) {
    finalUsername = `${baseUsername}${Math.floor(1000 + Math.random() * 9000)}`;
    collision = await Admin.findOne({ username: finalUsername });
  }

  // Filter valid permissions
  const validPermissions = Array.isArray(permissions)
    ? permissions.filter((p) => typeof p === 'string' && ALLOWED_PERMISSIONS.includes(p))
    : [];

  const newSubAdmin = await Admin.create({
    username: finalUsername,
    email: cleanEmail,
    password,
    firstName: firstName?.trim() || '',
    lastName: lastName?.trim() || '',
    role: 'subadmin',
    permissions: validPermissions,
    createdById: req.admin.id,
    isActive: true,
  });

  res.status(201).json({
    success: true,
    message: 'Sub-Admin created successfully',
    subAdmin: {
      _id: newSubAdmin._id,
      id: newSubAdmin._id,
      username: newSubAdmin.username,
      email: newSubAdmin.email,
      firstName: newSubAdmin.firstName,
      lastName: newSubAdmin.lastName,
      role: newSubAdmin.role,
      permissions: newSubAdmin.permissions,
      isActive: newSubAdmin.isActive,
      createdAt: newSubAdmin.createdAt,
    },
  });
});

// @desc Update Sub-Admin details & permissions
// @route PUT /api/admin/subadmins/:id
// @access Private (Superadmin only)
export const updateSubAdmin = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { firstName, lastName, email, permissions } = req.body || {};

  const subAdmin = await Admin.findById(id);
  if (!subAdmin) {
    return res.status(404).json({
      success: false,
      message: 'Sub-Admin account not found.',
    });
  }

  if (subAdmin.role === 'superadmin') {
    return res.status(403).json({
      success: false,
      message: 'Cannot modify Superadmin account via Sub-Admin endpoint.',
    });
  }

  if (email) {
    const cleanEmail = String(email).trim().toLowerCase();
    const emailCheck = validateEmailStrict(cleanEmail);
    if (!emailCheck.isValid) {
      return res.status(400).json({
        success: false,
        message: emailCheck.message,
      });
    }

    const duplicate = await Admin.findOne({ email: cleanEmail, _id: { $ne: id } });
    if (duplicate) {
      return res.status(400).json({
        success: false,
        message: 'Another admin account already uses this email address.',
      });
    }
    subAdmin.email = cleanEmail;
  }

  if (firstName !== undefined) subAdmin.firstName = firstName.trim();
  if (lastName !== undefined) subAdmin.lastName = lastName.trim();

  if (Array.isArray(permissions)) {
    subAdmin.permissions = permissions.filter((p) => typeof p === 'string' && ALLOWED_PERMISSIONS.includes(p));
  }

  await subAdmin.save();

  res.status(200).json({
    success: true,
    message: 'Sub-Admin updated successfully',
    subAdmin: {
      _id: subAdmin._id,
      id: subAdmin._id,
      username: subAdmin.username,
      email: subAdmin.email,
      firstName: subAdmin.firstName,
      lastName: subAdmin.lastName,
      role: subAdmin.role,
      permissions: subAdmin.permissions,
      isActive: subAdmin.isActive,
      updatedAt: subAdmin.updatedAt,
    },
  });
});

// @desc Toggle Sub-Admin Active / Inactive status
// @route PATCH /api/admin/subadmins/:id/status
// @access Private (Superadmin only)
export const toggleSubAdminStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const subAdmin = await Admin.findById(id);
  if (!subAdmin) {
    return res.status(404).json({
      success: false,
      message: 'Sub-Admin account not found.',
    });
  }

  if (subAdmin.role === 'superadmin' || String(subAdmin._id) === String(req.admin.id)) {
    return res.status(403).json({
      success: false,
      message: 'Cannot change active status of Superadmin or current account.',
    });
  }

  if (typeof req.body.isActive === 'boolean') {
    subAdmin.isActive = req.body.isActive;
  } else {
    subAdmin.isActive = !subAdmin.isActive;
  }

  await subAdmin.save();

  res.status(200).json({
    success: true,
    message: `Sub-Admin account ${subAdmin.isActive ? 'activated' : 'deactivated'} successfully`,
    subAdmin: {
      _id: subAdmin._id,
      id: subAdmin._id,
      isActive: subAdmin.isActive,
    },
  });
});

// @desc Reset Sub-Admin Password by Superadmin
// @route PATCH /api/admin/subadmins/:id/password
// @access Private (Superadmin only)
export const resetSubAdminPassword = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { newPassword } = req.body || {};

  if (!newPassword || !validatePassword(newPassword)) {
    return res.status(400).json({
      success: false,
      message: 'New password must be at least 6 characters.',
    });
  }

  const subAdmin = await Admin.findById(id).select('+password');
  if (!subAdmin) {
    return res.status(404).json({
      success: false,
      message: 'Sub-Admin account not found.',
    });
  }

  if (subAdmin.role === 'superadmin') {
    return res.status(403).json({
      success: false,
      message: 'Cannot reset Superadmin password through this endpoint.',
    });
  }

  subAdmin.password = newPassword;
  subAdmin.loginAttempts = 0;
  subAdmin.lockUntil = undefined;
  await subAdmin.save();

  res.status(200).json({
    success: true,
    message: 'Sub-Admin password reset successfully',
  });
});

// @desc Delete Sub-Admin
// @route DELETE /api/admin/subadmins/:id
// @access Private (Superadmin only)
export const deleteSubAdmin = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (String(id) === String(req.admin.id)) {
    return res.status(400).json({
      success: false,
      message: 'You cannot delete your own account.',
    });
  }

  const subAdmin = await Admin.findById(id);
  if (!subAdmin) {
    return res.status(404).json({
      success: false,
      message: 'Sub-Admin account not found.',
    });
  }

  if (subAdmin.role === 'superadmin') {
    return res.status(403).json({
      success: false,
      message: 'Superadmin accounts cannot be deleted.',
    });
  }

  await Admin.findByIdAndDelete(id);

  res.status(200).json({
    success: true,
    message: 'Sub-Admin account deleted successfully',
  });
});
