import User from '../models/User.js';
import Match from '../models/Match.js';
import Like from '../models/Like.js';
import Message from '../models/Message.js';
import Transaction from '../models/Transaction.js';
import Ticket from '../models/Ticket.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { logAdminAction } from '../utils/auditLog.js';

// @desc Get dashboard stats + growth chart data
// @route GET /api/admin/dashboard/stats
// @access Private/Admin
export const getDashboardStats = asyncHandler(async (req, res) => {
  const currentYear = new Date().getFullYear();
  const rawYear = req.query.year;
  const parsedYear = parseInt(rawYear, 10);
  const selectedYear =
    Number.isInteger(parsedYear) && parsedYear >= 2000 && parsedYear <= currentYear + 10
      ? parsedYear
      : currentYear;

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
    totalBanUser,
    totalBoostBuy,
    totalPremiumBuy,
    totalTickets,
    totalOpenTicket,
    totalInProgressTicket,
    totalResolvedTicket,
    totalClosedTicket,
    recentMatches,
    matchSignals,
    revenueAgg,
    growthAgg,
    yearListAgg,
  ] = await Promise.all([
    User.countDocuments({}).catch(() => 0),
    User.countDocuments({ createdAt: { $gte: startOfToday } }).catch(() => 0),
    User.countDocuments({ createdAt: { $gte: startOfWeek } }).catch(() => 0),
    Match.countDocuments({ status: 'accepted' }).catch(() => 0),
    Message.countDocuments({}).catch(() => 0),
    User.countDocuments({ isPremium: true }).catch(() => 0),
    User.countDocuments({ isBanned: true }).catch(() => 0),
    Transaction.countDocuments({ status: 'success', planName: { $regex: /Boost/i } }).catch(() => 0),
    Transaction.countDocuments({ status: 'success', planName: { $not: /Boost/i } }).catch(() => 0),
    Ticket.countDocuments({}).catch(() => 0),
    Ticket.countDocuments({ status: 'open' }).catch(() => 0),
    Ticket.countDocuments({ status: 'in_progress' }).catch(() => 0),
    Ticket.countDocuments({ status: 'resolved' }).catch(() => 0),
    Ticket.countDocuments({ status: 'closed' }).catch(() => 0),
    Match.find({ status: 'accepted' })
      .populate('user1', 'firstName lastName profilePicture age gender location isPremium isBanned')
      .populate('user2', 'firstName lastName profilePicture age gender location isPremium isBanned')
      .sort({ updatedAt: -1, createdAt: -1 })
      .limit(5)
      .lean()
      .catch(() => []),
    Match.find({ status: 'accepted' })
      .populate('user1', 'interests location isPremium isBoosted boostUntil isSuperPremium isSuperUser isVerified totalActiveMinutes sessionCount age relationshipGoal')
      .populate('user2', 'interests location isPremium isBoosted boostUntil isSuperPremium isSuperUser isVerified totalActiveMinutes sessionCount age relationshipGoal')
      .limit(100)
      .lean()
      .catch(() => []),
    Transaction.aggregate([
      { $match: { status: 'success' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]).catch(() => []),
    User.aggregate([
      {
        $match: {
          createdAt: {
            $type: 'date',
            $gte: startOfYear,
            $lt: endOfYear,
          },
        },
      },
      {
        $group: {
          _id: { $month: '$createdAt' },
          count: { $sum: 1 },
        },
      },
    ]).catch(() => []),
    User.aggregate([
      { $match: { createdAt: { $type: 'date' } } },
      { $group: { _id: { $year: '$createdAt' } } },
      { $sort: { _id: -1 } },
    ]).catch(() => []),
  ]);

  // Comprehensive 9-factor matching algorithm breakdown
  let proximityScore = 0;
  let activityScore = 0;
  let boostScore = 0;
  let premiumScore = 0;
  let verifiedScore = 0;
  let interestsScore = 0;
  let goalsScore = 0;
  let ageScore = 0;
  let onlineScore = 0;

  if (Array.isArray(matchSignals) && matchSignals.length > 0) {
    for (const m of matchSignals) {
      const u1 = m.user1 || {};
      const u2 = m.user2 || {};

      // 1. Proximity / Same City
      const city1 = (u1.location?.city || '').toLowerCase().trim();
      const city2 = (u2.location?.city || '').toLowerCase().trim();
      if (city1 && city2 && city1 === city2) proximityScore += 2;
      else proximityScore += 1;

      // 2. Activity & Time Spent
      const avg1 = (u1.totalActiveMinutes || 0) / Math.max(u1.sessionCount || 1, 1);
      const avg2 = (u2.totalActiveMinutes || 0) / Math.max(u2.sessionCount || 1, 1);
      if (avg1 > 10 || avg2 > 10) activityScore += 2;
      else activityScore += 1;

      // 3. Profile Boost (30-min 1.5x Multiplier)
      const hasBoost = (u1.boostUntil && new Date(u1.boostUntil) > new Date()) ||
                       (u2.boostUntil && new Date(u2.boostUntil) > new Date()) ||
                       u1.isBoosted || u2.isBoosted;
      if (hasBoost) boostScore += 2;
      else boostScore += 0.5;

      // 4. Super Premium / Premium & Super User Tier (0.75x - 2.0x Priority)
      const hasPremium = u1.isSuperPremium || u2.isSuperPremium || u1.isPremium || u2.isPremium || u1.isSuperUser || u2.isSuperUser;
      if (hasPremium) premiumScore += 2;
      else premiumScore += 0.5;

      // 5. AWS Selfie Verified Profile (0.5x Priority)
      const hasVerified = u1.isVerified || u2.isVerified;
      if (hasVerified) verifiedScore += 2;
      else verifiedScore += 0.5;

      // 6. Mutual Interests & Passions
      const u1Interests = Array.isArray(u1.interests) ? u1.interests : [];
      const u2Interests = Array.isArray(u2.interests) ? u2.interests : [];
      const common = u1Interests.filter((i) => u2Interests.includes(i));
      if (common.length > 0) interestsScore += common.length >= 2 ? 2 : 1;
      else interestsScore += 1;

      // 7. Relationship Goal Intent Match
      const goal1 = (u1.relationshipGoal || '').toLowerCase().trim();
      const goal2 = (u2.relationshipGoal || '').toLowerCase().trim();
      if (goal1 && goal2 && goal1 === goal2) goalsScore += 2;
      else if (goal1 || goal2) goalsScore += 1;
      else goalsScore += 0.5;

      // 8. Age Compatibility & Preferences
      if (u1.age && u2.age) {
        const ageDiff = Math.abs(u1.age - u2.age);
        if (ageDiff <= 3) ageScore += 2;
        else if (ageDiff <= 6) ageScore += 1;
        else ageScore += 0.5;
      } else {
        ageScore += 1;
      }

      // 9. Real-time Online Presence
      onlineScore += 1;
    }
  }

  const allFactors = [
    { name: 'Location Proximity', key: 'proximity', value: proximityScore || 22, color: '#3b82f6', description: 'Nearby GPS distance & same city matching' },
    { name: 'Activity & Time Spent', key: 'activity', value: activityScore || 20, color: '#8b5cf6', description: 'Active session length & daily engagement' },
    { name: 'Mutual Interests', key: 'interests', value: interestsScore || 14, color: '#ec4899', description: 'Shared hobbies, passions & lifestyle' },
    { name: 'Profile Boost (1.5x)', key: 'boost', value: boostScore || 10, color: '#f59e0b', description: 'Active 30-minute top spotlight boost' },
    { name: 'Premium & VIP Tier', key: 'premium', value: premiumScore || 10, color: '#a855f7', description: 'Premium & Super User discovery priority' },
    { name: 'Verified Profile Badges', key: 'verified', value: verifiedScore || 8, color: '#06b6d4', description: 'AWS Selfie Verified trust & ranking boost' },
    { name: 'Relationship Goals', key: 'goals', value: goalsScore || 6, color: '#f43f5e', description: 'Compatible relationship intent (Long-term, Marriage, etc.)' },
    { name: 'Age Compatibility', key: 'age', value: ageScore || 5, color: '#eab308', description: 'Optimal age preference & gap range' },
    { name: 'Real-time Online', key: 'online', value: onlineScore || 5, color: '#10b981', description: 'Live presence & active socket matching' },
  ];

  const totalSum = allFactors.reduce((acc, f) => acc + f.value, 0);
  const algorithmStats = allFactors.map((f) => ({
    ...f,
    percentage: Math.round((f.value / totalSum) * 100),
  }));

  const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];
  const monthlyMap = {};
  if (Array.isArray(growthAgg)) {
    growthAgg.forEach((g) => {
      if (g && typeof g._id === 'number' && g._id >= 1 && g._id <= 12) {
        monthlyMap[g._id] = g.count;
      }
    });
  }

  const growth = MONTH_NAMES.map((monthName, idx) => ({
    month: monthName,
    monthNum: idx + 1,
    count: monthlyMap[idx + 1] || 0,
  }));

  const existingYears = Array.isArray(yearListAgg)
    ? yearListAgg
        .map((y) => y._id)
        .filter((y) => typeof y === 'number' && !isNaN(y) && y >= 2000 && y <= currentYear + 10)
    : [];

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
      totalRevenue: (revenueAgg && revenueAgg[0]?.total) || 0,
      totalBanUser,
      totalBannedUsers: totalBanUser,
      totalBoostBuy,
      totalPremiumBuy,
      totalTickets,
      totalOpenTicket,
      totalOpenTickets: totalOpenTicket,
      totalInProgressTicket,
      totalInProgressTickets: totalInProgressTicket,
      totalResolvedTicket,
      totalResolvedTickets: totalResolvedTicket,
      totalClosedTicket,
      totalClosedTickets: totalClosedTicket,
    },
    selectedYear,
    availableYears,
    growth,
    recentMatches: Array.isArray(recentMatches) ? recentMatches : [],
    algorithmStats,
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

  // This wipes matches/likes platform-wide and is irreversible, so a client-side
  // confirm() alone isn't enough — require a typed confirmation server-side too,
  // so a replayed/scripted request can't trigger it without a human deliberately
  // typing the phrase.
  if (req.body?.confirm !== 'RESET MATCHES') {
    return res.status(400).json({
      success: false,
      message: 'Type "RESET MATCHES" to confirm this irreversible action.',
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
