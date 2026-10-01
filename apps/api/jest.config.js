/** @type {import('jest').Config} */
module.exports = {
  rootDir: 'src',
  testRegex: '[.]spec[.]ts$',
  transform: { '^.+[.]ts$': ['ts-jest', { tsconfig: '<rootDir>/../tsconfig.test.json' }] },
  testEnvironment: 'node',
  clearMocks: true,
};
