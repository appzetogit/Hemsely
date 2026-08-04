import mongoose from 'mongoose';

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
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
      default: null,
    },
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
notificationSchema.index({ recipientUserId: 1, createdAt: -1 });
notificationSchema.index({ target: 1, segment: 1, createdAt: -1 });

export default mongoose.model('Notification', notificationSchema);
