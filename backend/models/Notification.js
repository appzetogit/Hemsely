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
    sentBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      required: true,
    },
    deliveryStats: {
      recipientCount: { type: Number, default: 0 },
    },
  },
  {
    timestamps: true,
  }
);

notificationSchema.index({ createdAt: -1 });

export default mongoose.model('Notification', notificationSchema);
