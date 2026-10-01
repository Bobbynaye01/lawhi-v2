import type { Locale } from '@lawhi/shared';
import { useTranslation } from 'react-i18next';
import { i18n } from '../i18n';
import { ApiError } from '../services/api/client';

const suffix: Record<Locale, 'Ar' | 'Fr' | 'En'> = { ar: 'Ar', fr: 'Fr', en: 'En' };

/** Picks `titleAr` / `titleFr` / `titleEn` (or any `<field><Lang>`) for the current language. */
export function localized<T extends object>(item: T, field: string, locale: Locale): string {
  const record = item as Record<string, unknown>;
  const value = record[`${field}${suffix[locale]}`] ?? record[`${field}Fr`] ?? record[`${field}Ar`];
  return typeof value === 'string' ? value : '';
}

export function useLocale(): Locale {
  const { i18n } = useTranslation();
  const lang = i18n.language;
  return lang === 'ar' || lang === 'en' ? lang : 'fr';
}

/** Intl locale: Arabic with Latin digits, as commonly used in Mauritania. */
export function intlLocale(locale: Locale): string {
  return locale === 'ar' ? 'ar-u-nu-latn' : locale === 'fr' ? 'fr-FR' : 'en-GB';
}

export function formatTime(date: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

export function formatDate(date: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(date);
}

export function formatDateTime(iso: string, locale: Locale): string {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

/** Translation key for any thrown error (API codes are listed under errors.*). */
export function errorKey(error: unknown): string {
  if (error instanceof ApiError) {
    const key = `errors.${error.code}`;
    if (i18n.exists(key)) return key;
  }
  return 'errors.unknown_error';
}
