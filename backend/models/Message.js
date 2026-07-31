import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    image: String,
    audio: String,
    audioDuration: Number,
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: Date,
    deletedFor: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    // Deterministic sorted-pair key so a conversation can be queried/grouped
    // with a single equality match instead of an $or across both directions.
    conversationId: {
      type: String,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

messageSchema.pre('save', function (next) {
  if (this.sender && this.receiver) {
    this.conversationId = [this.sender.toString(), this.receiver.toString()].sort().join('_');
  }
  next();
});

// Index for efficient querying
messageSchema.index({ sender: 1, receiver: 1, createdAt: -1 });
messageSchema.index({ conversationId: 1, createdAt: 1 });

export default mongoose.model('Message', messageSchema);
