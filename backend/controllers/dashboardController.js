import User from '../models/User.js';
import Match from '../models/Match.js';
import Like from '../models/Like.js';
import Message from '../models/Message.js';
import Transaction from '../models/Transaction.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { logAdminAction } from '../utils/auditLog.js';

// @desc Get dashboard stats + growth chart data
// @route GET /api/admin/dashboard/stats
// @access Private/Admin
export const getDashboardStats = asyncHandler(async (req, res) => {
  const currentYear = new Date().getFullYear();
  const selectedYear = parseInt(req.query.year || currentYear, 10);

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startOfWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const startOfYear = new Date(selectedYear, 0, 1);
  const endOfYear = new Date(selectedYear + 1, 0, 1);

  const [
    totalUsers,
    newSignupsToday,
    newSignupsWeek,
    activeMatches,
    totalMessages,
    premiumUsers,
    revenueAgg,
    growthAgg,
    yearListAgg,
  ] = await Promise.all([
    User.countDocuments({}),
    User.countDocuments({ createdAt: { $gte: startOfToday } }),
    User.countDocuments({ createdAt: { $gte: startOfWeek } }),
    Match.countDocuments({ status: 'accepted' }),
    Message.countDocuments({}),
    User.countDocuments({ isPremium: true }),
    Transaction.aggregate([
      { $match: { status: 'success' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    User.aggregate([
      { $match: { createdAt: { $gte: startOfYear, $lt: endOfYear } } },
      {
        $group: {
          _id: { $month: '$createdAt' },
          count: { $sum: 1 },
        },
      },
    ]),
    User.aggregate([
      { $group: { _id: { $year: '$createdAt' } } },
      { $sort: { _id: -1 } },
    ]),
  ]);

  const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];
  const monthlyMap = {};
  growthAgg.forEach((g) => {
    monthlyMap[g._id] = g.count;
  });

  const growth = MONTH_NAMES.map((monthName, idx) => ({
    month: monthName,
    monthNum: idx + 1,
    count: monthlyMap[idx + 1] || 0,
  }));

  const existingYears = yearListAgg.map((y) => y._id).filter(Boolean);
  const minYear = existingYears.length ? Math.min(currentYear, ...existingYears) : currentYear;
  const availableYears = [];
  for (let y = minYear; y <= currentYear + 5; y++) {
    availableYears.push(y);
  }

  res.status(200).json({
    success: true,
    stats: {
      totalUsers,
      newSignupsToday,
      newSignupsWeek,
      activeMatches,
      totalMessages,
      premiumUsers,
      totalRevenue: revenueAgg[0]?.total || 0,
    },
    selectedYear,
    availableYears,
    growth,
  });
});

// @desc Reset all matches and likes in the system
// @route DELETE /api/admin/dashboard/reset-matches
// @access Private/Admin
export const resetMatches = asyncHandler(async (req, res) => {
  if (req.admin?.role !== 'superadmin') {
    return res.status(403).json({
      success: false,
      message: 'Only a superadmin can reset all matches and likes',
    });
  }

  const [matchResult, likeResult] = await Promise.all([
    Match.deleteMany({}),
    Like.deleteMany({}),
  ]);

  await logAdminAction({
    adminId: req.admin.id,
    action: 'reset_matches',
    targetType: 'System',
    details: { matchesDeleted: matchResult.deletedCount, likesDeleted: likeResult.deletedCount },
    ip: req.ip,
  });

  res.status(200).json({
    success: true,
    message: 'All active matches and likes have been reset successfully',
  });
});
