import express from 'express';
import {
  adminRegister,
  adminLogin,
  adminLogout,
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
import { adminProtect } from '../middleware/auth.js';
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
router.post('/register', adminProtect, adminAuthRateLimiter, adminRegisterValidator, validate, adminRegister);
router.post('/login', adminAuthRateLimiter, adminLoginValidator, validate, adminLogin);
router.post('/logout', adminProtect, adminLogout);
router.get('/me', adminProtect, getCurrentAdmin);
router.put('/profile', adminProtect, adminProfileValidator, validate, updateAdminProfile);
router.put('/password', adminProtect, adminPasswordValidator, validate, changeAdminPassword);

// Moderation
router.get('/users', adminProtect, getModerationUsers);
router.put('/users/:id', adminProtect, mongoIdParam('id'), validate, updateUserByAdmin);
router.delete('/users/:id', adminProtect, mongoIdParam('id'), validate, deleteUserByAdmin);
router.patch('/users/:id/ban', adminProtect, mongoIdParam('id'), banUserValidator, validate, banUser);
router.patch('/users/:id/unban', adminProtect, mongoIdParam('id'), validate, unbanUser);
router.patch('/users/:id/status', adminProtect, setUserStatusValidator, validate, setUserStatus);

// Selfie verification
router.get('/selfie-verifications', adminProtect, getSelfieVerifications);
router.patch('/selfie-verifications/:id', adminProtect, reviewSelfieValidator, validate, reviewSelfieVerification);

// Gender-ratio queue
router.get('/queue-status', adminProtect, getQueueStatusSnapshot);

// Dashboard
router.get('/dashboard/stats', adminProtect, getDashboardStats);
router.delete('/dashboard/reset-matches', adminProtect, resetMatches);

// Reports
router.get('/reports', adminProtect, getReports);
router.patch('/reports/:id/status', adminProtect, updateReportStatusValidator, validate, updateReportStatus);

// Subscriptions / Plans
router.get('/subscriptions/plans', adminProtect, getPlans);
router.post('/subscriptions/plans', adminProtect, createPlan);
router.patch('/subscriptions/plans/:id', adminProtect, updatePlanValidator, validate, updatePlan);
router.delete('/subscriptions/plans/:id', adminProtect, mongoIdParam('id'), validate, deletePlan);
router.patch('/subscriptions/users/:id', adminProtect, setUserPremiumValidator, validate, setUserPremium);
router.get('/subscription-users', adminProtect, getSubscriptionUsers);

// Transactions
router.get('/transactions', adminProtect, getTransactions);

// Notifications
router.get('/notifications', adminProtect, getNotifications);
router.post('/notifications', adminProtect, sendNotificationValidator, validate, sendNotification);
router.delete('/notifications/:id', adminProtect, mongoIdParam('id'), validate, deleteNotification);

// App Config
router.get('/app-config', adminProtect, getAppConfig);
router.put('/app-config', adminProtect, appConfigValidator, validate, updateAppConfig);

// Website Pages (CMS)
router.get('/website-pages', adminProtect, getWebsitePages);
router.get('/website-pages/:slug', adminProtect, getWebsitePageBySlug);
router.put('/website-pages/:slug', adminProtect, websitePageValidator, validate, updateWebsitePage);

// Support Tickets (Support Management)
router.get('/tickets', adminProtect, getAdminTickets);
router.patch('/tickets/:id', adminProtect, mongoIdParam('id'), validate, updateTicketAdmin);

export default router;
