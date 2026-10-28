import { Amiri_400Regular } from '@expo-google-fonts/amiri/400Regular';
import { AmiriQuran_400Regular } from '@expo-google-fonts/amiri-quran/400Regular';
import { Fraunces_500Medium } from '@expo-google-fonts/fraunces/500Medium';
import { Fraunces_600SemiBold } from '@expo-google-fonts/fraunces/600SemiBold';
import { IBMPlexSansArabic_400Regular } from '@expo-google-fonts/ibm-plex-sans-arabic/400Regular';
import { IBMPlexSansArabic_500Medium } from '@expo-google-fonts/ibm-plex-sans-arabic/500Medium';
import { IBMPlexSansArabic_600SemiBold } from '@expo-google-fonts/ibm-plex-sans-arabic/600SemiBold';
import { Manrope_400Regular } from '@expo-google-fonts/manrope/400Regular';
import { Manrope_500Medium } from '@expo-google-fonts/manrope/500Medium';
import { Manrope_600SemiBold } from '@expo-google-fonts/manrope/600SemiBold';
import { Manrope_700Bold } from '@expo-google-fonts/manrope/700Bold';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { useFonts } from 'expo-font';
import * as Linking from 'expo-linking';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { I18nextProvider } from 'react-i18next';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { IntroSplash } from './src/components/intro/IntroSplash';
import { useIsDark, useTheme } from './src/hooks/useTheme';
import { useNotificationSync } from './src/hooks/useNotificationSync';
import { detectDeviceLocale, i18n, initI18n } from './src/i18n';
import { navigationRef, RootNavigator } from './src/navigation/RootNavigator';
import { handleAuthLink } from './src/services/authLinks';
import { supabase } from './src/services/supabase';
import { registerBackgroundTasks } from './src/services/backgroundTasks';
import { reconcileDownloads } from './src/services/bookDownloads';
import { useIntroStore } from './src/stores/introStore';
import { useSettingsStore } from './src/stores/settingsStore';

// The dark native splash stays until fonts and settings are ready; the animated
// intro then starts from the same dark frame.
void SplashScreen.preventAutoHideAsync().catch(() => undefined);

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
  const theme = useTheme();
  const [navReady, setNavReady] = useState(false);
  const introDone = useIntroStore((s) => s.done);
  const markIntroDone = useIntroStore((s) => s.markDone);
  useNotificationSync();
  useAuthLinks(navReady);
  return (
    <>
      <StatusBar style={!introDone || isDark ? 'light' : 'dark'} />
      <RootNavigator onReady={() => setNavReady(true)} />
      {introDone ? null : <IntroSplash background={theme.background} onDone={markIntroDone} />}
    </>
  );
}

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    Amiri_400Regular,
    AmiriQuran_400Regular,
    Fraunces_500Medium,
    Fraunces_600SemiBold,
    IBMPlexSansArabic_400Regular,
    IBMPlexSansArabic_500Medium,
    IBMPlexSansArabic_600SemiBold,
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
  });
  const hydrated = useSettingsHydrated();
  const ready = (fontsLoaded || Boolean(fontError)) && hydrated && i18n.isInitialized;

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync().catch(() => undefined);
  }, [ready]);

  // Native splash (same dark colour as the intro's first frame) is still shown.
  if (!ready) return null;

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
