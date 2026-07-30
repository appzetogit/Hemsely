import mongoose from 'mongoose';

const planSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a plan name'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    price: {
      type: Number,
      required: [true, 'Please provide a price'],
      min: 0,
    },
    currency: {
      type: String,
      default: 'INR',
    },
    durationDays: {
      type: Number,
      required: [true, 'Please provide a duration in days'],
      min: 1,
    },
    features: {
      type: [String],
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    // System (seeded) plans are static — admins may only edit their price,
    // and they cannot be deleted. Only a non-system plan is fully editable.
    isSystemPlan: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('Plan', planSchema);
