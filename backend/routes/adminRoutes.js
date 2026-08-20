import express from 'express';
import {
  adminRegister,
  adminLogin,
  adminLogout,
  refreshAdminToken,
  getCurrentAdmin,
  updateAdminProfile,
  changeAdminPassword,
} from '../controllers/adminAuthController.js';
import {
  banUser,
  getModerationUsers,
  unbanUser,
  updateUserByAdmin,
  deleteUserByAdmin,
  getSelfieVerifications,
  reviewSelfieVerification,
  setUserStatus,
  getQueueStatusSnapshot,
} from '../controllers/adminController.js';
import { getDashboardStats, resetMatches } from '../controllers/dashboardController.js';
import { getReports, updateReportStatus } from '../controllers/reportController.js';
import { getPlans, createPlan, updatePlan, deletePlan, setUserPremium, getSubscriptionUsers } from '../controllers/subscriptionController.js';
import { getTransactions } from '../controllers/transactionController.js';
import { sendNotification, getNotifications, deleteNotification } from '../controllers/notificationController.js';
import { getAppConfig, updateAppConfig } from '../controllers/appConfigController.js';
import { getWebsitePages, getWebsitePageBySlug, updateWebsitePage } from '../controllers/websitePageController.js';
import { getAdminTickets, updateTicketAdmin } from '../controllers/ticketController.js';
import {
  getSubAdmins,
  createSubAdmin,
  updateSubAdmin,
  toggleSubAdminStatus,
  resetSubAdminPassword,
  deleteSubAdmin,
} from '../controllers/subAdminController.js';
import { adminProtect } from '../middleware/auth.js';
import { requireSuperadmin, requirePermission } from '../middleware/permission.js';
import { adminAuthRateLimiter } from '../middleware/rateLimiter.js';
import { validate } from '../middleware/validate.js';
import { adminLoginValidator, adminRegisterValidator, banUserValidator } from '../validators/adminValidators.js';
import { mongoIdParam } from '../validators/userValidators.js';
import {
  updateReportStatusValidator,
  updatePlanValidator,
  setUserPremiumValidator,
  sendNotificationValidator,
  appConfigValidator,
  websitePageValidator,
  adminProfileValidator,
  adminPasswordValidator,
  reviewSelfieValidator,
  setUserStatusValidator,
} from '../validators/adminExtraValidators.js';

const router = express.Router();

// Auth
router.post('/register', adminProtect, requireSuperadmin, adminAuthRateLimiter, adminRegisterValidator, validate, adminRegister);
router.post('/login', adminAuthRateLimiter, adminLoginValidator, validate, adminLogin);
router.post('/refresh', adminAuthRateLimiter, refreshAdminToken);
router.post('/logout', adminProtect, adminLogout);
router.get('/me', adminProtect, getCurrentAdmin);
router.put('/profile', adminProtect, adminProfileValidator, validate, updateAdminProfile);
router.put('/password', adminProtect, adminPasswordValidator, validate, changeAdminPassword);

// Sub-Admin Management (Superadmin Only)
router.get('/subadmins', adminProtect, requireSuperadmin, getSubAdmins);
router.post('/subadmins', adminProtect, requireSuperadmin, createSubAdmin);
router.put('/subadmins/:id', adminProtect, requireSuperadmin, mongoIdParam('id'), validate, updateSubAdmin);
router.patch('/subadmins/:id/status', adminProtect, requireSuperadmin, mongoIdParam('id'), validate, toggleSubAdminStatus);
router.patch('/subadmins/:id/password', adminProtect, requireSuperadmin, mongoIdParam('id'), validate, resetSubAdminPassword);
router.delete('/subadmins/:id', adminProtect, requireSuperadmin, mongoIdParam('id'), validate, deleteSubAdmin);

// Moderation & Users
router.get('/users', adminProtect, requirePermission(['users', 'moderation']), getModerationUsers);
router.put('/users/:id', adminProtect, requirePermission(['users', 'moderation']), mongoIdParam('id'), validate, updateUserByAdmin);
router.delete('/users/:id', adminProtect, requirePermission(['users', 'moderation']), mongoIdParam('id'), validate, deleteUserByAdmin);
router.patch('/users/:id/ban', adminProtect, requirePermission(['users', 'moderation']), mongoIdParam('id'), banUserValidator, validate, banUser);
router.patch('/users/:id/unban', adminProtect, requirePermission(['users', 'moderation']), mongoIdParam('id'), validate, unbanUser);
router.patch('/users/:id/status', adminProtect, requirePermission(['users', 'moderation']), setUserStatusValidator, validate, setUserStatus);

// Selfie verification
router.get('/selfie-verifications', adminProtect, requirePermission('selfie-verification'), getSelfieVerifications);
router.patch('/selfie-verifications/:id', adminProtect, requirePermission('selfie-verification'), reviewSelfieValidator, validate, reviewSelfieVerification);

// Gender-ratio queue
router.get('/queue-status', adminProtect, requirePermission(['dashboard', 'users', 'moderation']), getQueueStatusSnapshot);

// Dashboard
router.get('/dashboard/stats', adminProtect, requirePermission('dashboard'), getDashboardStats);
router.delete('/dashboard/reset-matches', adminProtect, requirePermission('dashboard'), resetMatches);

// Reports
router.get('/reports', adminProtect, requirePermission('reports'), getReports);
router.patch('/reports/:id/status', adminProtect, requirePermission('reports'), updateReportStatusValidator, validate, updateReportStatus);

// Subscriptions / Plans
router.get('/subscriptions/plans', adminProtect, requirePermission(['subscriptions', 'boost-edit']), getPlans);
router.post('/subscriptions/plans', adminProtect, requirePermission('subscriptions'), createPlan);
router.patch('/subscriptions/plans/:id', adminProtect, requirePermission('subscriptions'), updatePlanValidator, validate, updatePlan);
router.delete('/subscriptions/plans/:id', adminProtect, requirePermission('subscriptions'), mongoIdParam('id'), validate, deletePlan);
router.patch('/subscriptions/users/:id', adminProtect, requirePermission('subscription-users'), setUserPremiumValidator, validate, setUserPremium);
router.get('/subscription-users', adminProtect, requirePermission('subscription-users'), getSubscriptionUsers);

// Transactions
router.get('/transactions', adminProtect, requirePermission('transactions'), getTransactions);

// Notifications
router.get('/notifications', adminProtect, requirePermission('notifications'), getNotifications);
router.post('/notifications', adminProtect, requirePermission('notifications'), sendNotificationValidator, validate, sendNotification);
router.delete('/notifications/:id', adminProtect, requirePermission('notifications'), mongoIdParam('id'), validate, deleteNotification);

// App Config
router.get('/app-config', adminProtect, requirePermission(['app-config', 'boost-edit']), getAppConfig);
router.put('/app-config', adminProtect, requirePermission(['app-config', 'boost-edit']), appConfigValidator, validate, updateAppConfig);

// Website Pages (CMS)
router.get('/website-pages', adminProtect, requirePermission('website-pages'), getWebsitePages);
router.get('/website-pages/:slug', adminProtect, requirePermission('website-pages'), getWebsitePageBySlug);
router.put('/website-pages/:slug', adminProtect, requirePermission('website-pages'), websitePageValidator, validate, updateWebsitePage);

// Support Tickets (Support Management)
router.get('/tickets', adminProtect, requirePermission('support'), getAdminTickets);
router.patch('/tickets/:id', adminProtect, requirePermission('support'), mongoIdParam('id'), validate, updateTicketAdmin);

export default router;
