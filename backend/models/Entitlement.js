import mongoose from 'mongoose';

const entitlementSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    platform: {
      type: String,
      enum: ['google_play', 'ios_app_store', 'admin_override'],
      default: 'google_play',
    },
    packageName: {
      type: String,
      required: true,
      trim: true,
    },
    productId: {
      type: String,
      required: true,
      trim: true,
    },
    purchaseToken: {
      type: String,
      required: true,
      trim: true,
      unique: true, // Prevents duplicate/replay attacks
    },
    orderId: {
      type: String,
      trim: true,
    },
    productType: {
      type: String,
      enum: ['subscription', 'inapp_consumable', 'inapp_non_consumable'],
      default: 'subscription',
    },
    purchaseState: {
      type: String,
      enum: ['PURCHASED', 'PENDING', 'CANCELED', 'REFUNDED'],
      default: 'PURCHASED',
    },
    acknowledgementState: {
      type: String,
      enum: ['ACKNOWLEDGED', 'NOT_ACKNOWLEDGED'],
      default: 'ACKNOWLEDGED',
    },
    consumptionState: {
      type: String,
      enum: ['NOT_CONSUMED', 'CONSUMED'],
      default: 'NOT_CONSUMED',
    },
    subscriptionState: {
      type: String,
      enum: [
        'SUBSCRIPTION_STATE_UNSPECIFIED',
        'SUBSCRIPTION_STATE_PENDING',
        'SUBSCRIPTION_STATE_ACTIVE',
        'SUBSCRIPTION_STATE_PAUSED',
        'SUBSCRIPTION_STATE_IN_GRACE_PERIOD',
        'SUBSCRIPTION_STATE_ON_HOLD',
        'SUBSCRIPTION_STATE_CANCELED',
        'SUBSCRIPTION_STATE_EXPIRED',
      ],
      default: 'SUBSCRIPTION_STATE_ACTIVE',
    },
    purchaseTime: {
      type: Date,
      default: Date.now,
    },
    expiryTime: {
      type: Date,
    },
    autoRenewing: {
      type: Boolean,
      default: true,
    },
    priceAmountMicros: {
      type: Number,
      default: 0,
    },
    priceCurrencyCode: {
      type: String,
      default: 'INR',
    },
    environment: {
      type: String,
      enum: ['production', 'test', 'sandbox'],
      default: 'production',
    },
    rawVerificationData: {
      type: mongoose.Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

entitlementSchema.index({ user: 1, productId: 1, expiryTime: -1 });
entitlementSchema.index({ purchaseToken: 1 }, { unique: true });
entitlementSchema.index({ orderId: 1 });
entitlementSchema.index({ subscriptionState: 1 });

export default mongoose.model('Entitlement', entitlementSchema);
