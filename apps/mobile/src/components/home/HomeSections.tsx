import {
  qiblaBearing,
  type Prayer,
  type PrayerDay,
  type Riwaya,
  type SurahMeta,
  type VerseRef,
} from '@lawhi/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { radius, spacing } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';
import { quranRepository } from '../../repositories/quranRepository';
import { formatTime, localized, useLocale } from '../../utils/localize';
import { MiniLawh } from '../ui/Arch';
import { IconButton } from '../ui/Buttons';
import { Glow } from '../ui/Glow';
import { Icon, type IconName } from '../ui/Icon';
import { LogoMark } from '../ui/Layout';
import { ProgressBar, ProgressRing } from '../ui/Progress';
import { useSurfaceStyle } from '../ui/Surface';
import { Tappable } from '../ui/Tappable';
import { ArabicText, LawhiText } from '../ui/Text';
import { DayArc } from './DayArc';

/** Light header: official mark, greeting, Gregorian and Hijri dates. */
export function HomeHeader({ now, onSettings }: { now: Date; onSettings: () => void }) {
  const { t } = useTranslation();
  const locale = useLocale();
  const gregorian = new Intl.DateTimeFormat(locale === 'ar' ? 'ar-u-nu-latn' : locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(now);
  const hijri = hijriDate(now, locale);
  return (
    <View style={styles.header}>
      <LogoMark size={40} />
      <View style={{ flex: 1 }}>
        <LawhiText variant="subtitle">{t('home.greeting')}</LawhiText>
        <LawhiText variant="caption" tone="secondary" numberOfLines={1}>
          {hijri ? `${gregorian} · ${hijri}` : gregorian}
        </LawhiText>
      </View>
      <IconButton icon="settings" label={t('settings.title')} onPress={onSettings} />
    </View>
  );
}

/** Hijri date when the platform's Intl supports the Umm al-Qura calendar. */
function hijriDate(date: Date, locale: string): string | null {
  try {
    const tag = `${locale === 'ar' ? 'ar' : locale}-u-ca-islamic-umalqura-nu-latn`;
    const formatted = new Intl.DateTimeFormat(tag, { day: 'numeric', month: 'long', year: 'numeric' }).format(date);
    const year = Number(formatted.match(/\d{4}/)?.[0]);
    return year > 1300 && year < 1600 ? formatted.replace(/\s?(AH|هـ)$/, '').trim() + (locale === 'ar' ? ' هـ' : ' H') : null;
  } catch {
    return null;
  }
}

/** Next prayer laid on the day's arc — the daily rhythm at a glance. */
export function PrayerHero({
  day,
  next,
  now,
  placeName,
  onPress,
}: {
  day: PrayerDay;
  next: { prayer: Prayer; at: Date } | null;
  now: Date;
  placeName: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const locale = useLocale();
  const [width, setWidth] = useState(0);
  const minutes = next ? Math.max(0, Math.round((next.at.getTime() - now.getTime()) / 60000)) : 0;
  const countdown =
    minutes >= 60
      ? t('home.inHoursMinutes', { hours: Math.floor(minutes / 60), minutes: minutes % 60 })
      : t('home.inMinutes', { minutes });

  return (
    <Tappable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={
        next ? `${t('home.nextPrayer')} : ${t(`prayer.names.${next.prayer}`)} ${formatTime(next.at, locale)}, ${countdown}` : t('home.nextPrayer')
      }
      pressedScale={0.99}
      style={[styles.hero, useSurfaceStyle('plain')]}
    >
      <Glow width={320} height={220} color={theme.glow} opacity={0.22} style={{ top: -60, right: -70 }} />
      <View style={styles.heroTop}>
        <View style={{ flex: 1, gap: 2 }}>
          <LawhiText variant="overline" tone="muted">
            {t('home.nextPrayer')}
          </LawhiText>
          {next ? (
            <>
              <LawhiText variant="title">{t(`prayer.names.${next.prayer}`)}</LawhiText>
              <LawhiText variant="caption" tone="secondary">
                {countdown}
              </LawhiText>
            </>
          ) : null}
        </View>
        {next ? (
          <View style={{ alignItems: 'flex-end', gap: 2 }}>
            <LawhiText variant="numeralLarge" style={styles.heroTime}>
              {formatTime(next.at, locale)}
            </LawhiText>
            <View style={styles.place}>
              <Icon name="pin" size={13} color={theme.muted} />
              <LawhiText variant="caption" tone="muted" numberOfLines={1} style={{ maxWidth: 140 }}>
                {placeName}
              </LawhiText>
            </View>
          </View>
        ) : null}
      </View>
      <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ marginTop: spacing.xs }}>
        {width > 0 ? <DayArc day={day} now={now} next={next?.prayer ?? null} width={width} rise={26} /> : null}
      </View>
    </Tappable>
  );
}

/** Invitation shown until a place is known. */
export function PrayerHeroEmpty({ onPress }: { onPress: () => void }) {
  const theme = useTheme();
  const { t } = useTranslation();
  return (
    <Tappable onPress={onPress} accessibilityRole="button" style={[styles.hero, useSurfaceStyle('plain')]}>
      <Glow width={300} height={200} color={theme.glow} opacity={0.2} style={{ top: -50, right: -60 }} />
      <LawhiText variant="overline" tone="muted">
        {t('home.nextPrayer')}
      </LawhiText>
      <LawhiText variant="title" style={{ marginTop: spacing.xs }}>
        {t('home.setLocationTitle')}
      </LawhiText>
      <LawhiText variant="body" tone="secondary" style={{ marginTop: spacing.xs }}>
        {t('home.setLocation')}
      </LawhiText>
      <View style={[styles.inlineCta, { borderColor: theme.border }]}>
        <Icon name="pin" size={16} color={theme.primary} />
        <LawhiText variant="subtitle" tone="brand">
          {t('prayer.chooseLocation')}
        </LawhiText>
      </View>
    </Tappable>
  );
}

/** "Your lawh": the surah in progress written on a piece of the real wood. */
export function QuranContinueCard({
  riwaya,
  lastRead,
  onPress,
}: {
  riwaya: Riwaya;
  lastRead: VerseRef | undefined;
  onPress: () => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const locale = useLocale();
  const target = lastRead ?? { surah: 1, verse: 1 };
  const surah = quranRepository.surah(target.surah) as SurahMeta;
  const total = riwaya === 'hafs' ? surah.versesHafs : surah.versesWarsh;
  const progress = lastRead ? target.verse / total : 0;

  return (
    <Tappable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${t(lastRead ? 'quran.continueReading' : 'home.startReading')} — ${localized(surah, 'name', locale)}, ${t('quran.verseNumber', { number: target.verse })}`}
      pressedScale={0.985}
      style={[styles.quranCard, useSurfaceStyle('elevated')]}
    >
      <MiniLawh width={84} height={116} id="home-lawh">
        <View style={styles.lawhInk}>
          <ArabicText quran size={20} style={{ color: '#2A1709', textAlign: 'center', lineHeight: 36 }}>
            {surah.nameAr}
          </ArabicText>
        </View>
      </MiniLawh>
      <View style={{ flex: 1, gap: spacing.xs }}>
        <LawhiText variant="overline" tone="wood">
          {t(lastRead ? 'quran.continueReading' : 'home.startReading')}
        </LawhiText>
        <LawhiText variant="title" numberOfLines={1}>
          {locale === 'ar' ? `سورة ${surah.nameAr}` : surah.nameTranslit}
        </LawhiText>
        <LawhiText variant="caption" tone="secondary">
          {t('quran.verseNumber', { number: target.verse })} · {t(`quran.riwaya.${riwaya}`)}
        </LawhiText>
        <ProgressBar value={progress} color={theme.secondary} style={{ marginTop: spacing.sm }} />
        <View style={styles.resume}>
          <LawhiText variant="subtitle" tone="brand" style={{ fontSize: 14 }}>
            {t(lastRead ? 'home.resume' : 'home.open')}
          </LawhiText>
          <Icon name="chevronForward" size={16} color={theme.primary} />
        </View>
      </View>
    </Tappable>
  );
}

/** Qibla tile — the Kaaba at the centre, a dot on the dial already turned toward it. */
export function QiblaTile({
  place,
  onPress,
}: {
  place: { latitude: number; longitude: number; name: string } | null;
  onPress: () => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const bearing = place ? Math.round(qiblaBearing(place.latitude, place.longitude)) : null;
  return (
    <Tappable onPress={onPress} accessibilityRole="button" style={[styles.tile, useSurfaceStyle('plain')]}>
      <View style={[styles.compass, { borderColor: theme.border }]}>
        {bearing !== null && (
          <View style={[StyleSheet.absoluteFill, styles.bearing, { transform: [{ rotate: `${bearing}deg` }] }]}>
            <View style={[styles.bearingDot, { backgroundColor: theme.accent }]} />
          </View>
        )}
        <Icon name="kaaba" size={20} color={bearing === null ? theme.muted : theme.textPrimary} />
        <LawhiText variant="caption" tone="muted" style={styles.north}>
          N
        </LawhiText>
      </View>
      <View style={{ gap: 2 }}>
        <LawhiText variant="subtitle">{t('tabs.qibla')}</LawhiText>
        <LawhiText variant="caption" tone="secondary" numberOfLines={2}>
          {bearing === null ? t('home.qiblaNoPlace') : t('home.qiblaBearing', { degrees: bearing })}
        </LawhiText>
      </View>
    </Tappable>
  );
}

/** Adhkar of the moment with today's real progress. */
export function AdhkarTile({
  title,
  done,
  total,
  onPress,
}: {
  title: string;
  done: number;
  total: number;
  onPress: () => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  return (
    <Tappable onPress={onPress} accessibilityRole="button" style={[styles.tile, useSurfaceStyle('brand')]}>
      <ProgressRing value={total > 0 ? done / total : 0} size={44} stroke={2.5} color={theme.primary} track={theme.surface}>
        <Icon name="adhkar" size={18} color={theme.onPrimaryContainer} />
      </ProgressRing>
      <View style={{ gap: 2 }}>
        <LawhiText variant="overline" style={{ color: theme.onPrimaryContainer, opacity: 0.75 }}>
          {t('home.now')}
        </LawhiText>
        <LawhiText variant="subtitle" style={{ color: theme.onPrimaryContainer }} numberOfLines={2}>
          {title}
        </LawhiText>
        <LawhiText variant="caption" style={{ color: theme.onPrimaryContainer, opacity: 0.8 }}>
          {t('home.adhkarProgress', { done, total })}
        </LawhiText>
      </View>
    </Tappable>
  );
}

/** A verse of the verified text, chosen by date — editorial, quiet. */
export function VerseOfDay({
  verse,
  surah,
  onPress,
}: {
  verse: { surah: number; verse: number; text: string };
  surah: SurahMeta;
  onPress: () => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const locale = useLocale();
  return (
    <Tappable onPress={onPress} accessibilityRole="button" pressedScale={0.99} style={styles.verseBlock}>
      <View style={[styles.verseRule, { backgroundColor: theme.accent }]} />
      <LawhiText variant="overline" tone="muted" style={{ textAlign: 'center' }}>
        {t('home.verseOfDay')}
      </LawhiText>
      <ArabicText quran size={19} style={{ textAlign: 'center', marginTop: spacing.xs }}>
        {verse.text}
      </ArabicText>
      <LawhiText variant="caption" tone="secondary" style={{ textAlign: 'center', marginTop: spacing.xs }}>
        {localized(surah, 'name', locale)} · {verse.surah}:{verse.verse}
      </LawhiText>
    </Tappable>
  );
}

/** The library has its own clear card: a main destination, not a tertiary link. */
export function ShortcutCard({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: IconName;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Tappable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title} — ${subtitle}`}
      pressedScale={0.985}
      style={[styles.shortcutCard, useSurfaceStyle('elevated')]}
    >
      <View style={[styles.shortcutIcon, { backgroundColor: theme.secondaryContainer }]}>
        <Icon name={icon} size={28} color={theme.secondary} />
      </View>
      <View style={{ flex: 1, gap: spacing.xxs }}>
        <LawhiText variant="title">{title}</LawhiText>
        <LawhiText variant="caption" tone="secondary">
          {subtitle}
        </LawhiText>
      </View>
      <Icon name="chevronForward" size={20} color={theme.secondary} />
    </Tappable>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  hero: { borderRadius: radius.xl, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, overflow: 'hidden' },
  heroTime: { fontSize: 24, lineHeight: 28, letterSpacing: -0.4 },
  heroTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  place: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  inlineCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    alignSelf: 'flex-start',
    marginTop: spacing.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  quranCard: {
    flexDirection: 'row',
    gap: spacing.lg,
    borderRadius: radius.xl,
    padding: spacing.lg,
    alignItems: 'center',
  },
  lawhInk: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 18, paddingHorizontal: 6 },
  resume: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing.sm },
  tile: { flex: 1, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md, minHeight: 150 },
  compass: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bearing: { alignItems: 'center' },
  bearingDot: { width: 5, height: 5, borderRadius: 2.5, marginTop: -2.5 },
  north: { position: 'absolute', top: -3, fontSize: 9 },
  verseBlock: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md, alignItems: 'stretch' },
  verseRule: { width: 28, height: 2, borderRadius: 1, alignSelf: 'center', marginBottom: spacing.sm, opacity: 0.8 },
  shortcutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    borderRadius: radius.xl,
    padding: spacing.lg,
  },
  shortcutIcon: { width: 56, height: 56, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
});
