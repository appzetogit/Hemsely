import mongoose from 'mongoose';
import './Admin.js';
import './User.js';

const notificationSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please provide a title'],
      trim: true,
    },
    body: {
      type: String,
      required: [true, 'Please provide a message body'],
      trim: true,
    },
    target: {
      type: String,
      enum: ['all', 'segment', 'user'],
      default: 'all',
    },
    segment: {
      type: String,
      enum: ['premium', 'free', 'inactive', ''],
      default: '',
    },
    targetUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    recipientUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    sentBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      default: null,
    },
    deliveryStats: {
      recipientCount: { type: Number, default: 0 },
      successCount: { type: Number, default: 0 },
      failureCount: { type: Number, default: 0 },
      invalidTokensRemoved: { type: Number, default: 0 },
    },
    type: {
      type: String,
      default: 'broadcast',
    },
    // Per-user read state. A broadcast/segment notification is one shared document
    // read by many users, so "read" can't be a single boolean on the doc itself —
    // that would mark it read for every recipient the moment any one of them opens it.
    readBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

notificationSchema.index({ createdAt: -1 });
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 259200 }); // TTL index: auto-delete notifications after 3 days (259,200 seconds)
notificationSchema.index({ recipientUserId: 1, createdAt: -1 });
notificationSchema.index({ target: 1, segment: 1, createdAt: -1 });

export default mongoose.model('Notification', notificationSchema);
