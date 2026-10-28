import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  createNavigationContainerRef,
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
  type Theme,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { LawhiTabBar } from '../components/navigation/LawhiTabBar';
import { fonts } from '../constants/theme';
import { useIsDark, useTheme } from '../hooks/useTheme';
import { useIsArabicUi } from '../hooks/useTypography';
import { AccountScreen } from '../screens/account/AccountScreen';
import {
  ForgotPasswordScreen,
  ResetPasswordScreen,
  SignInScreen,
  SignUpScreen,
} from '../screens/account/AuthScreens';
import { AdhkarCategoryScreen } from '../screens/adhkar/AdhkarCategoryScreen';
import { AdhkarHomeScreen } from '../screens/adhkar/AdhkarHomeScreen';
import { TasbihScreen } from '../screens/adhkar/TasbihScreen';
import { DonationDetailScreen } from '../screens/donations/DonationDetailScreen';
import { DonationFormScreen } from '../screens/donations/DonationFormScreen';
import { CauseEditorScreen } from '../screens/donations/CauseEditorScreen';
import { DonationsScreen } from '../screens/donations/DonationsScreen';
import { SadaqaAdminScreen } from '../screens/donations/SadaqaAdminScreen';
import { MyDonationsScreen } from '../screens/donations/MyDonationsScreen';
import { HomeScreen } from '../screens/home/HomeScreen';
import { BookChapterScreen } from '../screens/library/BookChapterScreen';
import { BookDetailScreen } from '../screens/library/BookDetailScreen';
import { LibraryScreen } from '../screens/library/LibraryScreen';
import { PdfReaderScreen } from '../screens/library/PdfReaderScreen';
import { CityPickerScreen } from '../screens/prayer/CityPickerScreen';
import { PrayerScreen } from '../screens/prayer/PrayerScreen';
import { QiblaScreen } from '../screens/qibla/QiblaScreen';
import { BookmarksScreen } from '../screens/quran/BookmarksScreen';
import { QuranHomeScreen } from '../screens/quran/QuranHomeScreen';
import { QuranReaderScreen } from '../screens/quran/QuranReaderScreen';
import { QuranSearchScreen } from '../screens/quran/QuranSearchScreen';
import { SettingsScreen } from '../screens/settings/SettingsScreen';
import type { RootStackParamList, TabParamList } from './types';

/** Lets non-screen code (e.g. deep-link handling) navigate. */
export const navigationRef = createNavigationContainerRef<RootStackParamList>();

const Tab = createBottomTabNavigator<TabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

function Tabs() {
  const { t } = useTranslation();
  const theme = useTheme();
  const arabic = useIsArabicUi();
  return (
    <Tab.Navigator
      tabBar={(props) => <LawhiTabBar {...props} />}
      screenOptions={{ headerShown: false, animation: 'fade' }}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: t('tabs.home') }} />
      <Tab.Screen name="Quran" component={QuranHomeScreen} options={{ title: t('tabs.quran') }} />
      <Tab.Screen name="Prayer" component={PrayerScreen} options={{ title: t('tabs.prayer') }} />
      <Tab.Screen name="Qibla" component={QiblaScreen} options={{ title: t('tabs.qibla') }} />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: t('settings.title'),
          headerShown: true,
          headerStyle: { backgroundColor: theme.background },
          headerShadowVisible: false,
          headerTintColor: theme.textPrimary,
          headerTitleStyle: {
            fontFamily: arabic ? fonts.arabicSemiBold : fonts.displayMedium,
            fontSize: 19,
          },
        }}
      />
    </Tab.Navigator>
  );
}

export function RootNavigator({ onReady }: { onReady?: () => void }) {
  const { t } = useTranslation();
  const arabic = useIsArabicUi();
  const theme = useTheme();
  const isDark = useIsDark();
  const base = isDark ? DarkTheme : DefaultTheme;
  const navTheme: Theme = {
    ...base,
    colors: {
      ...base.colors,
      primary: theme.primary,
      background: theme.background,
      card: theme.surface,
      text: theme.textPrimary,
      border: theme.border,
    },
  };

  return (
    <NavigationContainer
      ref={navigationRef}
      onReady={onReady}
      theme={navTheme}
      documentTitle={{ formatter: () => t('app.name') }}
    >
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: theme.background },
          headerShadowVisible: false,
          headerTintColor: theme.textPrimary,
          headerTitleStyle: {
            fontFamily: arabic ? fonts.arabicSemiBold : fonts.displayMedium,
            fontSize: 19,
          },
          headerBackButtonDisplayMode: 'minimal',
          contentStyle: { backgroundColor: theme.background },
          animation: 'fade_from_bottom',
        }}
      >
        <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
        <Stack.Screen name="QuranReader" component={QuranReaderScreen} options={{ title: '' }} />
        <Stack.Screen
          name="QuranSearch"
          component={QuranSearchScreen}
          options={{ title: t('quran.search') }}
        />
        <Stack.Screen
          name="Bookmarks"
          component={BookmarksScreen}
          options={{ title: t('quran.bookmarks') }}
        />
        <Stack.Screen
          name="Adhkar"
          component={AdhkarHomeScreen}
          options={{ title: t('tabs.adhkar') }}
        />
        <Stack.Screen
          name="AdhkarCategory"
          component={AdhkarCategoryScreen}
          options={{ title: '' }}
        />
        <Stack.Screen
          name="Tasbih"
          component={TasbihScreen}
          options={{ title: t('adhkar.tasbih') }}
        />
        <Stack.Screen
          name="Library"
          component={LibraryScreen}
          options={{ title: t('library.title') }}
        />
        <Stack.Screen name="BookDetail" component={BookDetailScreen} options={{ title: '' }} />
        <Stack.Screen name="BookChapter" component={BookChapterScreen} options={{ title: '' }} />
        <Stack.Screen name="PdfReader" component={PdfReaderScreen} options={{ title: '' }} />
        <Stack.Screen
          name="Donations"
          component={DonationsScreen}
          options={{ title: t('donations.title') }}
        />
        <Stack.Screen
          name="DonationForm"
          component={DonationFormScreen}
          options={{ title: t('donations.newDonation') }}
        />
        <Stack.Screen
          name="DonationDetail"
          component={DonationDetailScreen}
          options={{ title: t('donations.detailTitle') }}
        />
        <Stack.Screen
          name="MyDonations"
          component={MyDonationsScreen}
          options={{ title: t('donations.myDonations') }}
        />
        <Stack.Screen
          name="SadaqaAdmin"
          component={SadaqaAdminScreen}
          options={{ title: t('donations.admin.title') }}
        />
        <Stack.Screen name="CauseEditor" component={CauseEditorScreen} options={{ title: '' }} />
        <Stack.Screen
          name="CityPicker"
          component={CityPickerScreen}
          options={{ title: t('prayer.chooseCity') }}
        />
        <Stack.Screen
          name="Account"
          component={AccountScreen}
          options={{ title: t('settings.account') }}
        />
        <Stack.Screen
          name="SignIn"
          component={SignInScreen}
          options={{ title: t('auth.signIn') }}
        />
        <Stack.Screen
          name="SignUp"
          component={SignUpScreen}
          options={{ title: t('auth.createAccount') }}
        />
        <Stack.Screen
          name="ForgotPassword"
          component={ForgotPasswordScreen}
          options={{ title: t('auth.forgotPassword') }}
        />
        <Stack.Screen
          name="ResetPassword"
          component={ResetPasswordScreen}
          options={{ title: t('auth.newPassword') }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
