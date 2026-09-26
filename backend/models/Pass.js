import mongoose from 'mongoose';

const passSchema = new mongoose.Schema(
  {
    passedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    passedUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 },
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to ensure uniqueness per user pair and fast lookup
passSchema.index({ passedBy: 1, passedUser: 1 }, { unique: true });
passSchema.index({ passedBy: 1, expiresAt: 1 });

export default mongoose.model('Pass', passSchema);
