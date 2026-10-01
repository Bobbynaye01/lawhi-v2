/** @type {import('jest').Config} */
module.exports = {
  rootDir: '..',
  testRegex: 'test/.*[.]e2e-spec[.]ts$',
  transform: { '^.+[.]ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.test.json' }] },
  testEnvironment: 'node',
  globalSetup: '<rootDir>/test/global-setup.js',
  setupFiles: ['<rootDir>/test/env.js'],
  testTimeout: 30000,
};
