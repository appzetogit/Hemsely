import 'dotenv/config';
import mongoose from 'mongoose';
import connectDB from '../config/database.js';
import Plan from '../models/Plan.js';

// These mirror the fixed plans shown to users on the Premium screen
// (frontend/src/modules/user/pages/PremiumPage.jsx). Plans are static —
// admins may only edit price via the admin panel, never create/delete these.
const STATIC_PLANS = [
  {
    slug: 'weekly',
    productId: 'hemsely_premium_weekly',
    name: '1 Week',
    description: 'Get 7 days of full VIP access, unlimited likes, and instant discovery!',
    price: 199,
    durationDays: 7,
    badge: '7 DAYS',
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
  {
    slug: 'monthly',
    productId: 'hemsely_premium_monthly',
    name: '1 Month',
    description: 'Full monthly access to priority discovery, unlimited likes, and Change location!',
    price: 499,
    durationDays: 30,
    badge: 'POPULAR',
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
  {
    slug: '3months',
    productId: 'hemsely_premium_3months',
    name: '3 Months',
    description: 'Best value VIP pass with 90 days of full discovery and profile boosts!',
    price: 1199,
    durationDays: 90,
    badge: 'BEST VALUE',
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
  // Clean up any old single plan named "Premium" if transitioning to duration-based names
  await Plan.deleteMany({ name: { $in: ['Premium', 'Weekly Lite', 'Monthly', '3 Months VIP'] } });

  for (const planData of STATIC_PLANS) {
    const existing = await Plan.findOne({
      $or: [{ name: planData.name }, { productId: planData.productId }, { slug: planData.slug }],
      isSystemPlan: true
    });
    if (existing) {
      existing.name = planData.name;
      existing.slug = planData.slug;
      existing.productId = planData.productId;
      existing.badge = planData.badge;
      existing.description = planData.description;
      existing.durationDays = planData.durationDays;
      existing.features = planData.features;
      existing.isActive = planData.isActive;
      // Intentionally preserve price if admin previously configured it, or set default if missing
      if (!existing.price) existing.price = planData.price;
      await existing.save();
      console.log(`Updated static plan: ${planData.name}`);
    } else {
      await Plan.create(planData);
      console.log(`Created static plan: ${planData.name}`);
    }
  }

  await mongoose.connection.close();
  process.exit(0);
};

run().catch((error) => {
  console.error('Failed to seed plans:', error);
  process.exit(1);
});
