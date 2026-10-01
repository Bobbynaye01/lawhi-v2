/* global jest */
// In-memory AsyncStorage for stores and the query persister.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// Native-only modules that have no Jest mock of their own.
jest.mock('react-native-blob-util', () => ({}));
jest.mock('expo-audio', () => ({
  createAudioPlayer: () => ({
    addListener: jest.fn(),
    replace: jest.fn(),
    play: jest.fn(),
    pause: jest.fn(),
    setActiveForLockScreen: jest.fn(),
    clearLockScreenControls: jest.fn(),
  }),
  setAudioModeAsync: jest.fn().mockResolvedValue(undefined),
}));
