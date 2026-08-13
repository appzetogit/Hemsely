import mongoose from 'mongoose';
import bcryptjs from 'bcryptjs';

const adminSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, 'Please provide a username'],
      unique: true,
      minlength: 3,
    },
    email: {
      // Format is validated at the route layer (express-validator's isEmail()) -
      // a second, stricter regex here previously rejected valid addresses like
      // "name+tag@domain.com" or a TLD longer than 3 characters.
      type: String,
      required: [true, 'Please provide an email'],
      unique: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: 6,
      select: false,
    },
    firstName: String,
    lastName: String,
    profilePicture: String,
    role: {
      type: String,
      enum: ['admin', 'superadmin'],
      default: 'admin',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: Date,
    loginAttempts: {
      type: Number,
      default: 0,
    },
    lockUntil: Date,
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
adminSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }

  const salt = await bcryptjs.genSalt(10);
  this.password = await bcryptjs.hash(this.password, salt);
  return next();
});

// Method to compare password
adminSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcryptjs.compare(enteredPassword, this.password);
};

// Method to check if account is locked
adminSchema.methods.isLocked = function () {
  const maxAttempts = 10;
  const attempts = typeof this.loginAttempts === 'number' ? this.loginAttempts : 0;
  if (attempts < maxAttempts) {
    return false;
  }
  return !!(this.lockUntil && this.lockUntil > Date.now());
};

// Method to increment login attempts
adminSchema.methods.incLoginAttempts = function () {
  // If we have a previous lock that has expired, restart at 1
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $set: { loginAttempts: 1 },
      $unset: { lockUntil: 1 },
    });
  }
  // Otherwise we're incrementing
  const updates = { $inc: { loginAttempts: 1 } };
  // Lock the account if we've reached max attempts (10 failed attempts)
  const maxAttempts = 10;
  const lockTimeMs = 30 * 60 * 1000; // 30 minutes
  const attempts = typeof this.loginAttempts === 'number' ? this.loginAttempts : 0;

  if (attempts + 1 >= maxAttempts && !this.isLocked()) {
    updates.$set = { lockUntil: Date.now() + lockTimeMs };
  }
  return this.updateOne(updates);
};

// Method to reset login attempts
adminSchema.methods.resetLoginAttempts = function () {
  return this.updateOne({
    $set: { loginAttempts: 0 },
    $unset: { lockUntil: 1 },
  });
};

export default mongoose.model('Admin', adminSchema);
