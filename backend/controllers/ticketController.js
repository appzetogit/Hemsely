import Ticket from '../models/Ticket.js';
import AppConfig from '../models/AppConfig.js';
import { asyncHandler } from '../middleware/errorHandler.js';

// @desc Get support config (support email)
// @route GET /api/support/config
// @access Public / Private
export const getSupportConfig = asyncHandler(async (req, res) => {
  let config = await AppConfig.findOne();
  const supportEmail = config?.supportEmail || 'support@hemeshly.app';

  res.status(200).json({
    success: true,
    supportEmail,
  });
});

// @desc Create a support ticket
// @route POST /api/support/tickets
// @access Private (User)
export const createTicket = asyncHandler(async (req, res) => {
  const { subject, category, message, priority } = req.body;

  if (!subject || !message) {
    return res.status(400).json({
      success: false,
      message: 'Subject and message are required',
    });
  }

  const ticket = await Ticket.create({
    user: req.user.id,
    subject,
    category: category || 'general',
    message,
    priority: priority || 'medium',
  });

  res.status(201).json({
    success: true,
    message: 'Support ticket submitted successfully',
    ticket,
  });
});

// @desc Get current user's tickets
// @route GET /api/support/my-tickets
// @access Private (User)
export const getUserTickets = asyncHandler(async (req, res) => {
  const tickets = await Ticket.find({ user: req.user.id })
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    tickets,
  });
});

// ==================== ADMIN CONTROLLERS ====================

// @desc Get all tickets for Admin
// @route GET /api/admin/tickets
// @access Private (Admin)
export const getAdminTickets = asyncHandler(async (req, res) => {
  const { status, category, search, page = 1, limit = 20 } = req.query;

  const query = {};

  if (status && status !== 'all') {
    query.status = status;
  }

  if (category && category !== 'all') {
    query.category = category;
  }

  if (search) {
    query.$or = [
      { ticketId: { $regex: search, $options: 'i' } },
      { subject: { $regex: search, $options: 'i' } },
      { message: { $regex: search, $options: 'i' } },
    ];
  }

  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const skip = (pageNum - 1) * limitNum;

  const total = await Ticket.countDocuments(query);
  const tickets = await Ticket.find(query)
    .populate('user', 'firstName lastName name email phoneNumber profilePicture galleryImages')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitNum);

  // Status counts overview
  const [openCount, inProgressCount, resolvedCount, closedCount] = await Promise.all([
    Ticket.countDocuments({ status: 'open' }),
    Ticket.countDocuments({ status: 'in_progress' }),
    Ticket.countDocuments({ status: 'resolved' }),
    Ticket.countDocuments({ status: 'closed' }),
  ]);

  res.status(200).json({
    success: true,
    total,
    page: pageNum,
    pages: Math.ceil(total / limitNum),
    counts: {
      total: openCount + inProgressCount + resolvedCount + closedCount,
      open: openCount,
      inProgress: inProgressCount,
      resolved: resolvedCount,
      closed: closedCount,
    },
    tickets,
  });
});

// @desc Update ticket status & admin response
// @route PATCH /api/admin/tickets/:id
// @access Private (Admin)
export const updateTicketAdmin = asyncHandler(async (req, res) => {
  const { status, adminResponse, priority } = req.body;

  const ticket = await Ticket.findById(req.params.id);

  if (!ticket) {
    return res.status(404).json({
      success: false,
      message: 'Ticket not found',
    });
  }

  if (status) ticket.status = status;
  if (priority) ticket.priority = priority;

  if (adminResponse !== undefined) {
    ticket.adminResponse = adminResponse;
    ticket.respondedAt = new Date();
    ticket.respondedBy = req.admin?._id || req.admin?.id;
  }

  await ticket.save();

  const updated = await Ticket.findById(ticket._id).populate(
    'user',
    'firstName lastName name email phoneNumber profilePicture'
  );

  res.status(200).json({
    success: true,
    message: 'Ticket updated successfully',
    ticket: updated,
  });
});
