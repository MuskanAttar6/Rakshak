module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverageFrom: [
    'checks/**/*.js',
    'core/**/*.js',
    'os/**/*.js',
    '!**/node_modules/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  // Electron modules need to be mocked
  moduleNameMapping: {
    '^electron$': '<rootDir>/tests/mocks/electron.js'
  }
};
