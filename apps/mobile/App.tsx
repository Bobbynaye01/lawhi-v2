import { Amiri_400Regular, Amiri_700Bold, useFonts } from '@expo-google-fonts/amiri';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import * as Linking from 'expo-linking';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { I18nextProvider } from 'react-i18next';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { lightPalette } from './src/constants/theme';
import { useIsDark } from './src/hooks/useTheme';
import { useNotificationSync } from './src/hooks/useNotificationSync';
import { detectDeviceLocale, i18n, initI18n } from './src/i18n';
import { navigationRef, RootNavigator } from './src/navigation/RootNavigator';
import { handleAuthLink } from './src/services/authLinks';
import { supabase } from './src/services/supabase';
import { registerBackgroundTasks } from './src/services/backgroundTasks';
import { reconcileDownloads } from './src/services/bookDownloads';
import { useSettingsStore } from './src/stores/settingsStore';

const DAY = 24 * 60 * 60 * 1000;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      // Keep server data for a week so causes etc. stay visible offline.
      gcTime: 7 * DAY,
      retry: 1,
    },
  },
});

// Only public, non-personal data is persisted to disk.
const persister = createAsyncStoragePersister({ storage: AsyncStorage, key: 'lawhi.query-cache' });
const PERSISTED_ROOT_KEYS = new Set(['config', 'donations']);
const PRIVATE_SUB_KEYS = new Set(['mine', 'detail']);

/** Runs once, as soon as persisted settings are loaded: language, downloads, background tasks. */
function bootstrap() {
  const { locale, setLocale } = useSettingsStore.getState();
  const effective = locale ?? detectDeviceLocale();
  if (!locale) setLocale(effective);
  initI18n(effective);
  reconcileDownloads();
  void registerBackgroundTasks();
}
if (useSettingsStore.persist.hasHydrated()) bootstrap();
else useSettingsStore.persist.onFinishHydration(bootstrap);

function useSettingsHydrated() {
  const [hydrated, setHydrated] = useState(useSettingsStore.persist.hasHydrated());
  useEffect(() => useSettingsStore.persist.onFinishHydration(() => setHydrated(true)), []);
  return hydrated;
}

/** E-mail links (account confirmation, password recovery) opened in the app. */
function useAuthLinks(ready: boolean) {
  const url = Linking.useLinkingURL();
  useEffect(() => {
    if (!ready || !url) return;
    void handleAuthLink(url).then((result) => {
      if (result === 'recovery' && navigationRef.isReady()) navigationRef.navigate('ResetPassword');
    });
  }, [ready, url]);

  // On the web, supabase-js reads the link itself and emits PASSWORD_RECOVERY.
  useEffect(() => {
    if (!ready || !supabase) return;
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' && navigationRef.isReady())
        navigationRef.navigate('ResetPassword');
    });
    return () => data.subscription.unsubscribe();
  }, [ready]);
}

function AppShell() {
  const isDark = useIsDark();
  const [navReady, setNavReady] = useState(false);
  useNotificationSync();
  useAuthLinks(navReady);
  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <RootNavigator onReady={() => setNavReady(true)} />
    </>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({ Amiri_400Regular, Amiri_700Bold });
  const hydrated = useSettingsHydrated();

  if (!fontsLoaded || !hydrated || !i18n.isInitialized) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: lightPalette.background,
        }}
      >
        <ActivityIndicator color={lightPalette.primary} size="large" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <I18nextProvider i18n={i18n}>
        <PersistQueryClientProvider
          client={queryClient}
          persistOptions={{
            persister,
            maxAge: 7 * DAY,
            dehydrateOptions: {
              shouldDehydrateQuery: (q) =>
                q.state.status === 'success' &&
                PERSISTED_ROOT_KEYS.has(String(q.queryKey[0])) &&
                !PRIVATE_SUB_KEYS.has(String(q.queryKey[1])),
            },
          }}
        >
          <AppShell />
        </PersistQueryClientProvider>
      </I18nextProvider>
    </SafeAreaProvider>
  );
}
