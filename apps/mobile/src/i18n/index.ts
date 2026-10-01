import { DEFAULT_LOCALE, isLocale, isRtl, type Locale } from '@lawhi/shared';
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
  applyDirection(locale);
  return i18n;
}

/**
 * On native, the layout direction is fixed at startup: switching between an
 * RTL and an LTR language requires a reload. Returns true if a reload is needed.
 */
export function applyDirection(locale: Locale): boolean {
  const rtl = isRtl(locale);
  if (Platform.OS === 'web') {
    if (typeof document !== 'undefined') {
      document.documentElement.dir = rtl ? 'rtl' : 'ltr';
      document.documentElement.lang = locale;
    }
    return false;
  }
  I18nManager.allowRTL(true);
  if (I18nManager.isRTL === rtl) return false;
  I18nManager.forceRTL(rtl);
  return true;
}

export async function changeLanguage(locale: Locale) {
  await i18n.changeLanguage(locale);
  if (applyDirection(locale)) {
    if (__DEV__) DevSettings.reload();
    else await Updates.reloadAsync();
  }
}

export default i18n;
