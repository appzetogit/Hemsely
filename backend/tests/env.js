process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.JWT_EXPIRY = '1h';
process.env.REFRESH_TOKEN_SECRET = 'test-refresh-secret';
process.env.REFRESH_TOKEN_EXPIRY = '7d';
process.env.COOKIE_EXPIRY = '7';
process.env.OTP_USE_MOCK = 'true';
process.env.OTP_MOCK_CODE = '123456';
process.env.OTP_EXPIRY_MINUTES = '5';
process.env.FRONTEND_URL = 'http://localhost:5173';

// Never let tests hit the real SMS provider. smsService.js calls its own
// dotenv.config() at import time, which only fills in *unset* vars — so an
// empty string here (not `delete`) survives that and makes
// smsIndiaHubService.isConfigured() return false, falling back to the
// "log OTP to console" development-mode path instead.
process.env.SMSINDIAHUB_API_KEY = '';
process.env.SMSINDIAHUB_SENDER_ID = '';
process.env.SMSINDIAHUB_TEMPLATE_ID = '';
