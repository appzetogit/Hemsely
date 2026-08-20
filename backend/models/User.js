import mongoose from 'mongoose';
import bcryptjs from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      default: '',
    },
    lastName: {
      type: String,
      default: '',
    },
    email: {
      type: String,
      sparse: true,
      lowercase: true,
      trim: true,
    },
    phoneNumber: {
      type: String,
      required: [true, 'Please provide a phone number'],
      unique: true,
    },
    password: {
      type: String,
      select: false,
      default: null,
    },
    profilePicture: {
      type: String,
      default: null,
    },
    bio: {
      type: String,
      maxlength: 500,
      default: '',
    },
    age: {
      type: Number,
      min: 18,
      max: 120,
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other', ''],
      default: '',
    },
    interestedIn: {
      type: [String],
      enum: ['male', 'female', 'both'],
      default: ['both'],
    },
    interests: [String],
    relationshipGoal: {
      type: String,
      default: '',
    },
    location: {
      address: { type: String, default: '' },
      city: { type: String, default: '' },
      state: { type: String, default: '' },
      coordinates: {
        type: {
          type: String,
          enum: ['Point'],
          default: 'Point',
        },
        coordinates: {
          type: [Number], // [longitude, latitude]
          default: [0, 0],
        },
      },
    },
    height: {
      value: Number,
      unit: {
        type: String,
        enum: ['cm', 'ft', 'Feet'],
        default: 'ft',
      },
    },
    languages: [String],
    prompts: [
      {
        question: String,
        answer: String,
      },
    ],
    bodyType: String,
    religion: String,
    education: String,
    profession: String,
    smokingStatus: String,
    drinkingStatus: String,
    galleryImages: [
      {
        url: String,
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    isProfileComplete: {
      type: Boolean,
      default: false,
    },
    otpCode: {
      type: String,
      default: null,
    },
    otpExpires: {
      type: Date,
      default: null,
    },
    isPremium: {
      type: Boolean,
      default: false,
    },
    boostCount: {
      type: Number,
      default: 0,
    },
    premiumExpiry: Date,
    isVerified: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isPaused: {
      type: Boolean,
      default: false,
    },
    showActiveStatus: {
      type: Boolean,
      default: true,
    },
    isBanned: {
      type: Boolean,
      default: false,
    },
    banReason: {
      type: String,
      default: '',
    },
    bannedAt: Date,
    bannedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      default: null,
    },
    lastSeen: Date,
    blockedUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    reportedUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],

    // Admin-assignable status badges
    isSuperPremium: {
      type: Boolean,
      default: false,
      index: true,
    },
    wasPremiumBeforeSuper: {
      type: Boolean,
      default: false,
    },
    isSuperUser: {
      type: Boolean,
      default: false,
    },
    isSuperSubscriber: {
      type: Boolean,
      default: false,
    },

    // Selfie verification (automated via AWS Rekognition, falling back to manual admin review)
    selfiePhoto: {
      type: String,
      default: null,
    },
    selfieStatus: {
      type: String,
      enum: ['not_submitted', 'pending', 'approved', 'rejected'],
      default: 'not_submitted',
    },
    selfieReviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      default: null,
    },
    selfieReviewedAt: Date,
    selfieRejectionReason: {
      type: String,
      default: '',
    },

    // Gender-ratio queue gating (Phase 1: country-wide)
    accessStatus: {
      type: String,
      enum: ['active', 'queued'],
      default: 'active',
    },
    queuedAt: Date,

    // Session/time-spent tracking, feeds the discovery ranking algorithm
    totalActiveMinutes: {
      type: Number,
      default: 0,
    },
    sessionCount: {
      type: Number,
      default: 0,
    },

    // Profile Boost feature
    boostUntil: {
      type: Date,
      default: null,
    },
    isBoosted: {
      type: Boolean,
      default: false,
    },

    // FCM Push Notification Tokens per platform
    fcmtokenweb: {
      type: String,
      default: null,
    },
    fcmtokenmobile: {
      type: String,
      default: null,
    },
    fcmtokenios: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving if provided
userSchema.pre('save', async function (next) {
  if (!this.password || !this.isModified('password')) {
    return next();
  }

  const salt = await bcryptjs.genSalt(10);
  this.password = await bcryptjs.hash(this.password, salt);
  next();
});

// Index for geospatial queries
userSchema.index({ 'location.coordinates': '2dsphere' });

// Covers the discovery-feed and access-queue filters, which otherwise full-scan
// the whole collection on every request (isBanned/isActive/isPaused/gender/age).
userSchema.index({ isBanned: 1, isActive: 1, isPaused: 1, gender: 1, age: 1 });

// Method to compare password
userSchema.methods.matchPassword = async function (enteredPassword) {
  if (!this.password) return false;
  return await bcryptjs.compare(enteredPassword, this.password);
};

export default mongoose.model('User', userSchema);
