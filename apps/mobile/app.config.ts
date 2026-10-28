/// <reference types="node" />
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { ConfigContext, ExpoConfig } from 'expo/config';

const ADHAN_SOUND = './assets/sounds/adhan.wav';
/** The adhan option only exists when a legally obtained file has been added (see assets/sounds/README.md). */
const hasAdhanSound = existsSync(join(__dirname, ADHAN_SOUND));

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Lawhi',
  slug: 'lawhi',
  scheme: 'lawhi',
  version: '2.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  ios: {
    // Same identifier as the Flutter app so this version replaces it.
    bundleIdentifier: 'com.lawhi.lawhi',
    buildNumber: '2',
    supportsTablet: true,
    infoPlist: {
      CFBundleDisplayName: 'لوحي',
      NSLocationWhenInUseUsageDescription:
        'Lawhi utilise votre position pour calculer les horaires de prière et la direction de la Qibla.',
      UIBackgroundModes: ['audio'],
    },
  },
  android: {
    package: 'com.lawhi.lawhi',
    versionCode: 2,
    adaptiveIcon: {
      backgroundColor: '#D8BB8C',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
    },
    permissions: [
      'ACCESS_COARSE_LOCATION',
      'ACCESS_FINE_LOCATION',
      'POST_NOTIFICATIONS',
      'SCHEDULE_EXACT_ALARM',
      'RECEIVE_BOOT_COMPLETED',
    ],
    blockedPermissions: ['android.permission.RECORD_AUDIO'],
    predictiveBackGestureEnabled: false,
  },
  web: {
    favicon: './assets/favicon.png',
    name: 'Lawhi — لوحي',
  },
  plugins: [
    'expo-localization',
    [
      'expo-splash-screen',
      // Empty, dark: the first frame of the animated intro (src/components/intro).
      { backgroundColor: '#0D0906', image: './assets/splash-empty.png', imageWidth: 1 },
    ],
    ['expo-audio', { enableBackgroundPlayback: true }],
    'expo-background-task',
    'expo-font',
    'react-native-blob-util',
    [
      'expo-location',
      {
        locationWhenInUsePermission:
          'Lawhi utilise votre position pour calculer les horaires de prière et la direction de la Qibla.',
      },
    ],
    ['expo-notifications', { sounds: hasAdhanSound ? [ADHAN_SOUND] : [] }],
    'expo-updates',
  ],
  extra: {
    hasAdhanSound,
  },
});
