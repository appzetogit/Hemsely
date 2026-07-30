import User from '../models/User.js';
import Match from '../models/Match.js';
import Like from '../models/Like.js';
import Message from '../models/Message.js';
import Transaction from '../models/Transaction.js';
import { asyncHandler } from '../middleware/errorHandler.js';

// @desc Get dashboard stats + growth chart data
// @route GET /api/admin/dashboard/stats
// @access Private/Admin
export const getDashboardStats = asyncHandler(async (req, res) => {
  const days = Math.min(Math.max(parseInt(req.query.days || '14', 10), 1), 90);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startOfWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    newSignupsToday,
    newSignupsWeek,
    activeMatches,
    totalMessages,
    premiumUsers,
    revenueAgg,
    growthAgg,
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
      { $match: { createdAt: { $gte: since } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
  ]);

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
    growth: growthAgg.map((g) => ({ date: g._id, count: g.count })),
  });
});

// @desc Reset all matches and likes in the system
// @route DELETE /api/admin/dashboard/reset-matches
// @access Private/Admin
export const resetMatches = asyncHandler(async (req, res) => {
  await Promise.all([
    Match.deleteMany({}),
    Like.deleteMany({}),
  ]);

  res.status(200).json({
    success: true,
    message: 'All active matches and likes have been reset successfully',
  });
});
