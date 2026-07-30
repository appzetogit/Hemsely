import 'dotenv/config';
import mongoose from 'mongoose';
import connectDB from '../config/database.js';
import Plan from '../models/Plan.js';

// These mirror the fixed plans shown to users on the Premium screen
// (frontend/src/modules/user/pages/PremiumPage.jsx). Plans are static —
// admins may only edit price via the admin panel, never create/delete these.
const STATIC_PLANS = [
  {
    slug: 'premium',
    name: 'Premium',
    description: 'Get full access to priority discovery, unlimited likes, read receipts, and direct chat!',
    price: 499,
    durationDays: 30,
    isSystemPlan: true,
    isActive: true,
    features: [
      'Unlimited Likes',
      'Location Changes (Passport Mode)',
      'View Who Likes You',
      'Unlimited Rewinds',
      '1 Profile Boost per week',
      'Advanced Filters',
      'Priority Profile Visibility',
    ],
  },
];

const run = async () => {
  await connectDB();
  await Plan.deleteMany({ name: { $in: ['Weekly Lite', 'Monthly', '3 Months VIP'] } });

  for (const planData of STATIC_PLANS) {
    const { slug, ...fields } = planData;
    const existing = await Plan.findOne({ name: fields.name, isSystemPlan: true });
    if (existing) {
      existing.description = fields.description;
      existing.durationDays = fields.durationDays;
      existing.features = fields.features;
      existing.isActive = fields.isActive;
      // Intentionally leave price untouched on re-run so an admin's price edit isn't clobbered.
      await existing.save();
      console.log(`Updated static plan: ${fields.name}`);
    } else {
      await Plan.create(fields);
      console.log(`Created static plan: ${fields.name}`);
    }
  }

  await mongoose.connection.close();
  process.exit(0);
};

run().catch((error) => {
  console.error('Failed to seed plans:', error);
  process.exit(1);
});
