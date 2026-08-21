import { jest } from '@jest/globals';
import { getOrCreateConfig, invalidateConfigCache } from '../controllers/appConfigController.js';
import { createRateLimiter, resetRateLimitStoreForTests } from '../middleware/rateLimiter.js';
import AppConfig from '../models/AppConfig.js';

describe('Scaling & Performance Optimizations', () => {
  beforeEach(async () => {
    invalidateConfigCache();
    await resetRateLimitStoreForTests();
  });

  test('AppConfig cache eliminates repeated DB queries and refreshes on demand', async () => {
    const config1 = await getOrCreateConfig();
    expect(config1).toBeDefined();

    // Second call should return cached object instantly
    const config2 = await getOrCreateConfig();
    expect(config2).toBe(config1);

    // Force fresh bypasses cache
    const config3 = await getOrCreateConfig(true);
    expect(config3).toBeDefined();
  });

  test('In-memory rate limiter executes fast and blocks excessive requests', async () => {
    const limiter = createRateLimiter({ windowMs: 60000, max: 3 });
    const req = {
      headers: { 'x-forwarded-for': '127.0.0.1' },
      baseUrl: '/api/test',
      route: { path: '/action' },
      socket: { remoteAddress: '127.0.0.1' },
    };

    let statusCode = 200;
    let responseBody = null;
    const res = {
      setHeader: jest.fn(),
      status: (code) => {
        statusCode = code;
        return {
          json: (data) => {
            responseBody = data;
          },
        };
      },
    };
    const next = jest.fn();

    // 1st request -> allow
    await limiter(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);

    // 2nd request -> allow
    await limiter(req, res, next);
    expect(next).toHaveBeenCalledTimes(2);

    // 3rd request -> allow
    await limiter(req, res, next);
    expect(next).toHaveBeenCalledTimes(3);

    // 4th request -> blocked with 429
    await limiter(req, res, next);
    expect(statusCode).toBe(429);
    expect(responseBody.success).toBe(false);
  });
});
