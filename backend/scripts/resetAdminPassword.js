import 'dotenv/config';
import mongoose from 'mongoose';
import connectDB from '../config/database.js';
import Admin from '../models/Admin.js';

const identifier = process.argv[2] || process.env.RESET_ADMIN_EMAIL || process.env.SEED_ADMIN_EMAIL || 'panchalajay717@gmail.com';
const newPassword = process.argv[3] || process.env.RESET_ADMIN_PASSWORD || process.env.SEED_ADMIN_PASSWORD;

const run = async () => {
  if (!newPassword) {
    console.error('❌ Usage: node scripts/resetAdminPassword.js <email_or_username> <new_password>');
    console.error('   Or set RESET_ADMIN_PASSWORD / SEED_ADMIN_PASSWORD in environment.');
    process.exit(1);
  }

  await connectDB();

  const query = identifier.includes('@')
    ? { email: identifier.toLowerCase() }
    : { username: identifier };

  const admin = await Admin.findOne(query);

  if (!admin) {
    console.error(`❌ Admin account not found matching "${identifier}".`);
    await mongoose.connection.close();
    process.exit(1);
  }

  admin.password = newPassword; // Will be hashed by pre-save hook
  admin.isActive = true;
  admin.loginAttempts = 0;
  admin.lockUntil = undefined;

  await admin.save();

  console.log(`✅ Admin account "${admin.email}" (username: "${admin.username}") password reset and unlocked successfully!`);

  await mongoose.connection.close();
  process.exit(0);
};

run().catch((err) => {
  console.error('❌ Error resetting admin password:', err);
  process.exit(1);
});
