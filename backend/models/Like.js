import mongoose from 'mongoose';

const likeSchema = new mongoose.Schema(
  {
    likedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    likedUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    isMatched: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Ensure unique likes (a user can only like another user once)
likeSchema.index({ likedBy: 1, likedUser: 1 }, { unique: true });

export default mongoose.model('Like', likeSchema);
