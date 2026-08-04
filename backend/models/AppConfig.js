import mongoose from 'mongoose';

// Singleton document — always read/written via findOneAndUpdate({}, ..., {upsert:true}).
const appConfigSchema = new mongoose.Schema(
  {
    maintenanceMode: {
      type: Boolean,
      default: false,
    },
    signupsEnabled: {
      type: Boolean,
      default: true,
    },
    holdLikesQueue: {
      type: Boolean,
      default: false,
    },
    // Gender-ratio access queue (Phase 1: country-wide scope only).
    genderQueueEnabled: {
      type: Boolean,
      default: true,
    },
    queueRatioMale: {
      type: Number,
      default: 1,
      min: 1,
    },
    queueRatioFemale: {
      type: Number,
      default: 4,
      min: 1,
    },
    // Phase 2 (radius-based) placeholder — Phase 1 always enforces country-wide.
    queueScope: {
      type: String,
      enum: ['country', 'radius'],
      default: 'country',
    },
    queueRadiusKm: {
      type: Number,
      default: 25,
      min: 1,
    },
    dailyLikeLimit: {
      type: Number,
      default: 100,
      min: 1,
    },
    discoveryRadiusKm: {
      type: Number,
      default: 50,
      min: 1,
    },
    maxAgeGapYears: {
      type: Number,
      default: 20,
      min: 1,
    },
    minAppVersion: {
      type: String,
      default: '1.0.0',
    },
    supportEmail: {
      type: String,
      default: 'support@hemeshly.app',
    },
    boostPrice1: {
      type: Number,
      default: 199,
      min: 1,
    },
    boostPrice5: {
      type: Number,
      default: 399,
      min: 1,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('AppConfig', appConfigSchema);
