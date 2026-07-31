import mongoose from 'mongoose';

const matchSchema = new mongoose.Schema(
  {
    user1: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    user2: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'blocked', 'unmatched'],
      default: 'pending',
    },
    initiatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    rejectedBy: mongoose.Schema.Types.ObjectId,
    rejectedAt: Date,
    unmatchedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    unmatchedAt: Date,
    deletedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    lastMessageAt: Date,
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Ensure unique match between two users
matchSchema.index({ user1: 1, user2: 1 }, { unique: true });

export default mongoose.model('Match', matchSchema);
