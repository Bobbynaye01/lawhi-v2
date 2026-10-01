import Constants from 'expo-constants';

/**
 * Public configuration only. EXPO_PUBLIC_* values are embedded in the app
 * bundle and readable by anyone: never put a secret here (no service-role key).
 */
export const config = {
  apiUrl: (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/$/, ''),
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
  /** True only when a legally obtained adhan file was bundled (see assets/sounds/README.md). */
  hasAdhanSound: Boolean(Constants.expoConfig?.extra?.hasAdhanSound),
} as const;

export const isApiConfigured = config.apiUrl.length > 0;
export const isAuthConfigured = config.supabaseUrl.length > 0 && config.supabaseAnonKey.length > 0;
