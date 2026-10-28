/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  setupFiles: ['<rootDir>/jest.setup.js'],
  testMatch: ['<rootDir>/src/**/*.test.{ts,tsx}'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@lawhi/.*|i18next|react-i18next|zustand|@tanstack/.*))',
  ],
  moduleNameMapper: {
    // The "react-native" export condition points at an .mjs build Jest cannot
    // require; Node's resolution picks the package's CommonJS build instead.
    '^lucide-react-native$': require.resolve('lucide-react-native'),
  },
};
