export default {
  testEnvironment: 'node',
  transform: {},
  setupFiles: ['./tests/env.js'],
  setupFilesAfterEnv: ['./tests/setup.js'],
  testMatch: ['**/tests/**/*.test.js'],
  testTimeout: 30000,
  forceExit: true,
  clearMocks: true,
};
