import 'dotenv/config';
import mongoose from 'mongoose';
import connectDB from '../config/database.js';
import User from '../models/User.js';

const run = async () => {
  await connectDB();

  // Find all users who have submitted a selfie photo and are currently pending
  const pendingUsers = await User.find({ selfiePhoto: { $exists: true, $ne: '' }, selfieStatus: 'pending' });

  console.log(`Found ${pendingUsers.length} pending users with selfies.`);

  for (const user of pendingUsers) {
    user.selfieStatus = 'approved';
    user.isVerified = true;
    user.selfieReviewedAt = new Date();
    user.selfieRejectionReason = '';
    await user.save();
    console.log(`✅ Approved selfie verification for user: ${user.firstName} ${user.lastName} (${user.phoneNumber})`);
  }

  console.log('All pending selfies updated to approved!');
  await mongoose.connection.close();
  process.exit(0);
};

run().catch((error) => {
  console.error('Failed to approve pending selfies:', error);
  process.exit(1);
});
