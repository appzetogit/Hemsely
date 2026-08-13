import mongoose from 'mongoose';

const ticketSchema = new mongoose.Schema(
  {
    ticketId: {
      type: String,
      unique: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    subject: {
      type: String,
      required: [true, 'Subject is required'],
      trim: true,
      maxlength: [200, 'Subject cannot exceed 200 characters'],
    },
    category: {
      type: String,
      enum: ['general', 'account', 'billing', 'bug', 'safety', 'other'],
      default: 'general',
    },
    message: {
      type: String,
      required: [true, 'Message is required'],
      maxlength: [2000, 'Message cannot exceed 2000 characters'],
    },
    status: {
      type: String,
      enum: ['open', 'in_progress', 'resolved', 'closed'],
      default: 'open',
      index: true,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },
    adminResponse: {
      type: String,
      default: '',
      maxlength: [2000, 'Admin response cannot exceed 2000 characters'],
    },
    respondedAt: {
      type: Date,
    },
    respondedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
    },
  },
  {
    timestamps: true,
  }
);

// Auto-generate a human readable Ticket ID before save, retrying on the rare collision
// since `unique: true` alone would otherwise surface as a generic duplicate-key error.
ticketSchema.pre('save', async function (next) {
  if (!this.ticketId) {
    const Ticket = this.constructor;
    let candidate;
    let attempts = 0;
    do {
      candidate = `TCK-${Math.floor(100000 + Math.random() * 900000)}`;
      attempts += 1;
    } while (attempts < 5 && (await Ticket.exists({ ticketId: candidate })));
    this.ticketId = candidate;
  }
  next();
});

// Covers the admin ticket list, which filters by status and always sorts by createdAt.
ticketSchema.index({ status: 1, createdAt: -1 });

const Ticket = mongoose.model('Ticket', ticketSchema);

export default Ticket;
