import 'dotenv/config';
import mongoose from 'mongoose';
import connectDB from '../config/database.js';
import Admin from '../models/Admin.js';

const SEED_ADMIN = {
  username: process.env.SEED_ADMIN_USERNAME || 'ajaypanchal',
  email: process.env.SEED_ADMIN_EMAIL || 'panchalajay717@gmail.com',
  password: process.env.SEED_ADMIN_PASSWORD,
  firstName: process.env.SEED_ADMIN_FIRST_NAME || 'Ajay',
  lastName: process.env.SEED_ADMIN_LAST_NAME || 'Panchal',
  role: 'superadmin',
};

const run = async () => {
  if (!SEED_ADMIN.password) {
    console.error('❌ Set SEED_ADMIN_PASSWORD before running this script (no default password is provided).');
    process.exit(1);
  }

  await connectDB();

  const existing = await Admin.findOne({ email: SEED_ADMIN.email });

  if (existing) {
    existing.username = SEED_ADMIN.username;
    existing.firstName = SEED_ADMIN.firstName;
    existing.lastName = SEED_ADMIN.lastName;
    existing.role = SEED_ADMIN.role;
    existing.password = SEED_ADMIN.password; // re-hashed by the Admin pre-save hook
    existing.isActive = true;
    existing.loginAttempts = 0;
    existing.lockUntil = undefined;
    await existing.save();
    console.log(`Updated existing admin: ${existing.email}`);
  } else {
    const admin = await Admin.create(SEED_ADMIN);
    console.log(`Created admin: ${admin.email}`);
  }

  await mongoose.connection.close();
  process.exit(0);
};

run().catch((error) => {
  console.error('Failed to seed admin:', error);
  process.exit(1);
});
