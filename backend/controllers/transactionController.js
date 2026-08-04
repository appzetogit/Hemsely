import Transaction from '../models/Transaction.js';
import { asyncHandler } from '../middleware/errorHandler.js';

// @desc Get paginated transactions (filterable by status/plan)
// @route GET /api/admin/transactions
// @access Private/Admin
export const getTransactions = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page || '1', 10), 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit || '10', 10), 1), 50);
  const skip = (page - 1) * limit;

  const query = {};
  if (req.query.status && req.query.status !== 'all') {
    query.status = req.query.status;
  } else {
    query.status = { $ne: 'pending' };
  }
  if (req.query.plan) {
    query.plan = req.query.plan;
  }
  if (req.query.startDate || req.query.endDate) {
    query.createdAt = {};
    if (req.query.startDate) query.createdAt.$gte = new Date(req.query.startDate);
    if (req.query.endDate) {
      // The frontend sends a bare date (e.g. "2026-08-01"), which parses to
      // 00:00 UTC - using $lte on that excluded almost the entire selected day.
      // Treat endDate as inclusive of the whole day by using the start of the
      // next day as an exclusive upper bound instead.
      const endDate = new Date(req.query.endDate);
      endDate.setUTCDate(endDate.getUTCDate() + 1);
      query.createdAt.$lt = endDate;
    }
  }

  const [transactions, totalTransactions] = await Promise.all([
    Transaction.find(query)
      .populate('user', 'firstName lastName email phoneNumber')
      .populate('plan', 'name price')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Transaction.countDocuments(query),
  ]);

  res.status(200).json({
    success: true,
    transactions,
    pagination: {
      page,
      limit,
      totalTransactions,
      totalPages: Math.max(Math.ceil(totalTransactions / limit), 1),
    },
  });
});
