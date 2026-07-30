import 'dotenv/config';
import mongoose from 'mongoose';
import connectDB from '../config/database.js';
import Admin from '../models/Admin.js';

const SEED_ADMIN = {
  username: 'ajaypanchal',
  email: 'panchalajay717@gmail.com',
  password: '123456',
  firstName: 'Ajay',
  lastName: 'Panchal',
  role: 'superadmin',
};

const run = async () => {
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
