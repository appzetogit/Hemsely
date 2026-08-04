import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { resetRateLimitStoreForTests } from '../middleware/rateLimiter.js';

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterEach(async () => {
  const { collections } = mongoose.connection;
  await Promise.all(Object.values(collections).map((collection) => collection.deleteMany({})));
  await resetRateLimitStoreForTests();
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});
