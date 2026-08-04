import mongoose from 'mongoose';

// Backs the rate limiter in MongoDB instead of in-process memory, so limits
// are shared correctly across multiple app instances/pods and survive a
// restart or deploy - a single in-memory Map only rate-limits its own process.
const rateLimitCounterSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  count: { type: Number, default: 0 },
  resetTime: { type: Date, required: true },
});

// TTL index: MongoDB deletes each counter once its window has passed, so
// stale buckets clean themselves up with no in-process timer needed.
rateLimitCounterSchema.index({ resetTime: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('RateLimitCounter', rateLimitCounterSchema);
