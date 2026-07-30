import { jest } from '@jest/globals';
import { createRateLimiter, resetRateLimitStoreForTests } from '../middleware/rateLimiter.js';

const makeReqRes = ({ ip = '1.2.3.4', baseUrl = '', path = '/', route } = {}) => {
  const req = { headers: {}, socket: { remoteAddress: ip }, baseUrl, path, route };
  const headers = {};
  const res = {
    setHeader: (key, value) => {
      headers[key] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
    headers,
  };
  return { req, res };
};

describe('createRateLimiter', () => {
  beforeEach(() => {
    resetRateLimitStoreForTests();
  });

  it('allows requests under the max and calls next()', () => {
    const limiter = createRateLimiter({ max: 3, windowMs: 60000 });
    const { req, res } = makeReqRes({ route: { path: '/login' }, baseUrl: '/api/admin' });
    const next = jest.fn();

    limiter(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.statusCode).toBeUndefined();
    expect(res.headers['X-RateLimit-Remaining']).toBe(2);
  });

  it('blocks with 429 once the max is exceeded', () => {
    const limiter = createRateLimiter({ max: 2, windowMs: 60000, message: 'slow down' });
    const next = jest.fn();

    for (let i = 0; i < 2; i += 1) {
      const { req, res } = makeReqRes({ route: { path: '/login' }, baseUrl: '/api/admin' });
      limiter(req, res, next);
      expect(res.statusCode).toBeUndefined();
    }

    const { req, res } = makeReqRes({ route: { path: '/login' }, baseUrl: '/api/admin' });
    limiter(req, res, next);

    expect(res.statusCode).toBe(429);
    expect(res.body.message).toBe('slow down');
    expect(next).toHaveBeenCalledTimes(2);
  });

  it('tracks separate buckets per client IP', () => {
    const limiter = createRateLimiter({ max: 1, windowMs: 60000 });
    const next = jest.fn();

    const first = makeReqRes({ ip: '1.1.1.1', route: { path: '/login' }, baseUrl: '/api/admin' });
    limiter(first.req, first.res, next);
    expect(first.res.statusCode).toBeUndefined();

    const second = makeReqRes({ ip: '2.2.2.2', route: { path: '/login' }, baseUrl: '/api/admin' });
    limiter(second.req, second.res, next);
    expect(second.res.statusCode).toBeUndefined();
  });

  it('tracks separate buckets per route even under the same router mount (regression: baseUrl-only key collapsed /login and /register)', () => {
    const limiter = createRateLimiter({ max: 1, windowMs: 60000 });
    const next = jest.fn();

    const loginReq = makeReqRes({ route: { path: '/login' }, baseUrl: '/api/admin' });
    limiter(loginReq.req, loginReq.res, next);
    expect(loginReq.res.statusCode).toBeUndefined();

    const registerReq = makeReqRes({ route: { path: '/register' }, baseUrl: '/api/admin' });
    limiter(registerReq.req, registerReq.res, next);
    expect(registerReq.res.statusCode).toBeUndefined();

    // A second hit on /login, though, should now be blocked on its own bucket.
    const secondLoginReq = makeReqRes({ route: { path: '/login' }, baseUrl: '/api/admin' });
    limiter(secondLoginReq.req, secondLoginReq.res, next);
    expect(secondLoginReq.res.statusCode).toBe(429);
  });

  it('shares one aggregate bucket for mount-level middleware with no matched route yet', () => {
    const limiter = createRateLimiter({ max: 1, windowMs: 60000 });
    const next = jest.fn();

    const first = makeReqRes({ baseUrl: '/api/users', route: undefined });
    limiter(first.req, first.res, next);
    expect(first.res.statusCode).toBeUndefined();

    const second = makeReqRes({ baseUrl: '/api/users', route: undefined });
    limiter(second.req, second.res, next);
    expect(second.res.statusCode).toBe(429);
  });
});
