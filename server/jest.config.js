module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js'],
  collectCoverageFrom: [
    'routes/**/*.js',
    'models/**/*.js',
    'services/**/*.js',
    '!**/node_modules/**'
  ],
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup.js'],
  testTimeout: 30000
};