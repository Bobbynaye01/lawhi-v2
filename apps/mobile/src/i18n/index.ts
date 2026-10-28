import { DEFAULT_LOCALE, isLocale, type Locale } from '@lawhi/shared';
import { getLocales } from 'expo-localization';
import * as Updates from 'expo-updates';
import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';
import { DevSettings, I18nManager, Platform } from 'react-native';

const resources = {
  ar: { translation: require('@lawhi/i18n/ar.json') },
  fr: { translation: require('@lawhi/i18n/fr.json') },
  en: { translation: require('@lawhi/i18n/en.json') },
};

const i18n = createInstance();

/** Device language if supported, otherwise Arabic (Lawhi's primary audience). */
export function detectDeviceLocale(): Locale {
  for (const l of getLocales()) {
    if (l.languageCode && isLocale(l.languageCode)) return l.languageCode;
  }
  return DEFAULT_LOCALE;
}

export function initI18n(locale: Locale) {
  if (!i18n.isInitialized) {
    void i18n.use(initReactI18next).init({
      resources,
      lng: locale,
      fallbackLng: 'fr',
      interpolation: { escapeValue: false },
      returnNull: false,
    });
  }
  // A layout mirrored by an earlier version is undone once, at startup.
  if (applyDirection(locale)) void reload();
  return i18n;
}

/**
 * The interface keeps the same layout in every language: in Arabic only the
 * text is right-to-left (each string still flows right-to-left on its own),
 * buttons, rows and navigation do not mirror.
 * On native the layout direction is fixed at startup, so leaving a previously
 * mirrored layout requires a reload. Returns true if a reload is needed.
 */
export function applyDirection(locale: Locale): boolean {
  if (Platform.OS === 'web') {
    if (typeof document !== 'undefined') {
      document.documentElement.dir = 'ltr';
      document.documentElement.lang = locale;
    }
    return false;
  }
  I18nManager.allowRTL(false);
  if (!I18nManager.isRTL) return false;
  I18nManager.forceRTL(false);
  return true;
}

async function reload() {
  if (__DEV__) DevSettings.reload();
  else await Updates.reloadAsync();
}

export async function changeLanguage(locale: Locale) {
  await i18n.changeLanguage(locale);
  if (applyDirection(locale)) await reload();
}

export { i18n };
