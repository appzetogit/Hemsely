import Report from '../models/Report.js';
import User from '../models/User.js';
import Admin from '../models/Admin.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { logAdminAction } from '../utils/auditLog.js';
import { stripAllHtml } from '../utils/sanitize.js';

// @desc Get paginated reports (filterable by status)
// @route GET /api/admin/reports
// @access Private/Admin
export const getReports = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page || '1', 10), 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit || '10', 10), 1), 50);
  const skip = (page - 1) * limit;

  const query = {};
  if (req.query.status && req.query.status !== 'all') {
    query.status = req.query.status;
  }

  const [reports, totalReports, pendingCount, reviewedCount, actionedCount, dismissedCount] = await Promise.all([
    Report.find(query)
      .populate('reporter', 'firstName lastName profilePicture')
      .populate('reportedUser', 'firstName lastName profilePicture isBanned')
      .populate('reviewedBy', 'firstName lastName username')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Report.countDocuments(query),
    Report.countDocuments({ status: 'pending' }),
    Report.countDocuments({ status: 'reviewed' }),
    Report.countDocuments({ status: 'actioned' }),
    Report.countDocuments({ status: 'dismissed' }),
  ]);

  res.status(200).json({
    success: true,
    reports,
    counts: {
      pending: pendingCount,
      reviewed: reviewedCount,
      actioned: actionedCount,
      dismissed: dismissedCount,
    },
    pagination: {
      page,
      limit,
      totalReports,
      totalPages: Math.max(Math.ceil(totalReports / limit), 1),
    },
  });
});

// @desc Update a report's status (mark reviewed/actioned/dismissed), optionally ban the reported user
// @route PATCH /api/admin/reports/:id/status
// @access Private/Admin
export const updateReportStatus = asyncHandler(async (req, res) => {
  const { status, notes, banReportedUser } = req.body;

  const report = await Report.findById(req.params.id);
  if (!report) {
    return res.status(404).json({ success: false, message: 'Report not found' });
  }

  report.status = status;
  report.notes = notes !== undefined ? stripAllHtml(notes) : report.notes;
  report.reviewedBy = req.admin.id;
  report.reviewedAt = new Date();
  await report.save();

  let autoBanned = false;

  if (banReportedUser) {
    await User.findByIdAndUpdate(report.reportedUser, {
      isBanned: true,
      banReason: 'You are banned by Hemsely',
      bannedAt: new Date(),
      bannedBy: req.admin.id,
      isActive: false,
    });
  } else if (status === 'actioned') {
    // Auto-ban once a user accumulates 2 reports an admin has independently
    // marked as valid ("actioned") — a single report, or unreviewed reports,
    // never trigger this on their own.
    const validReportCount = await Report.countDocuments({
      reportedUser: report.reportedUser,
      status: 'actioned',
    });

    if (validReportCount >= 2) {
      const target = await User.findById(report.reportedUser).select('isBanned');
      if (target && !target.isBanned) {
        await User.findByIdAndUpdate(report.reportedUser, {
          isBanned: true,
          banReason: 'Auto-banned after 2 admin-verified reports',
          bannedAt: new Date(),
          bannedBy: null,
          isActive: false,
        });
        autoBanned = true;
      }
    }
  }

  await logAdminAction({
    adminId: req.admin.id,
    action: 'update_report_status',
    targetType: 'Report',
    targetId: report._id,
    details: { status, banReportedUser: !!banReportedUser, autoBanned },
    ip: req.ip,
  });

  const populatedReport = await Report.findById(report._id)
    .populate('reporter', 'firstName lastName profilePicture')
    .populate('reportedUser', 'firstName lastName profilePicture isBanned')
    .populate('reviewedBy', 'firstName lastName username');

  res.status(200).json({ success: true, message: 'Report updated', report: populatedReport, autoBanned });
});
