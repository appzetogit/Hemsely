import { isAllowedOrigin, corsOptionsDelegate } from '../utils/originUtils.js';

describe('originUtils - CORS & CSRF Origin Verification', () => {
  it('allows requests with no origin (e.g. mobile app, same-origin, curl)', () => {
    expect(isAllowedOrigin(undefined)).toBe(true);
    expect(isAllowedOrigin(null)).toBe(true);
    expect(isAllowedOrigin('')).toBe(true);
  });

  it('allows hemsely.com and www.hemsely.com', () => {
    expect(isAllowedOrigin('https://hemsely.com')).toBe(true);
    expect(isAllowedOrigin('https://www.hemsely.com')).toBe(true);
    expect(isAllowedOrigin('http://hemsely.com')).toBe(true);
    expect(isAllowedOrigin('http://www.hemsely.com')).toBe(true);
  });

  it('allows subdomains of hemsely.com', () => {
    expect(isAllowedOrigin('https://app.hemsely.com')).toBe(true);
    expect(isAllowedOrigin('https://admin.hemsely.com')).toBe(true);
    expect(isAllowedOrigin('https://api.hemsely.com')).toBe(true);
  });

  it('allows localhost and 127.0.0.1 origins', () => {
    expect(isAllowedOrigin('http://localhost:5173')).toBe(true);
    expect(isAllowedOrigin('http://localhost:3000')).toBe(true);
    expect(isAllowedOrigin('http://127.0.0.1:5173')).toBe(true);
  });

  it('allows origins configured in process.env.FRONTEND_URL', () => {
    process.env.FRONTEND_URL = 'https://custom-domain.com,https://another-domain.com';
    expect(isAllowedOrigin('https://custom-domain.com')).toBe(true);
    expect(isAllowedOrigin('https://another-domain.com')).toBe(true);
  });

  it('blocks unauthorized origins', () => {
    expect(isAllowedOrigin('https://evil-hacker.com')).toBe(false);
    expect(isAllowedOrigin('https://fake-hemsely.com.attacker.org')).toBe(false);
    expect(isAllowedOrigin('https://nothemsely.com')).toBe(false);
  });

  it('handles invalid URL strings gracefully', () => {
    expect(isAllowedOrigin('not-a-valid-url')).toBe(false);
  });

  it('corsOptionsDelegate sets credentials and origin dynamically for allowed origins', (done) => {
    const req = { headers: { origin: 'https://hemsely.com' } };
    corsOptionsDelegate(req, (err, options) => {
      expect(err).toBeNull();
      expect(options.origin).toBe('https://hemsely.com');
      expect(options.credentials).toBe(true);
      done();
    });
  });

  it('corsOptionsDelegate rejects unauthorized origins', (done) => {
    const req = { headers: { origin: 'https://malicious.com' } };
    corsOptionsDelegate(req, (err, options) => {
      expect(err).toBeNull();
      expect(options.origin).toBe(false);
      done();
    });
  });
});
