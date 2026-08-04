import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema(
  {
    transactionId: {
      type: String,
      unique: true,
      sparse: true,
    },
    subscriptionId: {
      type: String,
      sparse: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    userName: String,
    userEmail: String,
    userPhone: String,
    plan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Plan',
    },
    planName: String,
    durationDays: Number,
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: 'INR',
    },
    status: {
      type: String,
      enum: ['pending', 'success', 'failed', 'refunded'],
      default: 'pending',
    },
    gateway: {
      type: String,
      default: 'razorpay',
    },
    gatewayOrderId: String,
    gatewayPaymentId: String,
    gatewaySignature: String,
  },
  {
    timestamps: true,
  }
);

transactionSchema.index({ user: 1, createdAt: -1 });
transactionSchema.index({ status: 1, createdAt: -1 });
transactionSchema.index({ transactionId: 1 });

export default mongoose.model('Transaction', transactionSchema);
