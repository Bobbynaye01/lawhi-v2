import { localDateString, normalizeArabicForSearch } from '@lawhi/shared';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TAB_BAR_SPACE } from '../../components/navigation/LawhiTabBar';
import {
  ArabicText,
  Glow,
  Icon,
  LawhiText,
  ProgressRing,
  SearchField,
  SectionHeader,
  Surface,
  Tappable,
  useSurfaceStyle,
} from '../../components/ui';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { radius, spacing } from '../../constants/theme';
import { usePrayerDays } from '../../hooks/usePrayerDays';
import { useTheme } from '../../hooks/useTheme';
import type { RootScreenProps } from '../../navigation/types';
import {
  contentRepository,
  type Dhikr,
  type DhikrCategory,
} from '../../repositories/contentRepository';
import { useAdhkarStore } from '../../stores/adhkarStore';
import { adhkarMoment } from '../../utils/adhkarMoment';
import { localized, useLocale } from '../../utils/localize';

const preview = (d: Dhikr) => (d.title ?? d.arabicText).split(/\s+/).slice(0, 9).join(' ');

export function AdhkarHomeScreen({ navigation }: RootScreenProps<'Adhkar'>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const locale = useLocale();
  const insets = useSafeAreaInsets();
  const favorites = useAdhkarStore((s) => s.favorites);
  const counts = useAdhkarStore((s) => s.counts);
  const day = useAdhkarStore((s) => s.day);
  const { days, now } = usePrayerDays();
  const [query, setQuery] = useState('');
  const plain = useSurfaceStyle('plain');

  const isToday = day === localDateString(now);
  const doneIn = (c: DhikrCategory) =>
    isToday ? c.items.filter((d) => (counts[d.id] ?? 0) >= d.repetitions).length : 0;

  const all = contentRepository.categories();
  const matches = useMemo(() => {
    const needle = normalizeArabicForSearch(query);
    if (needle.length < 2) return null;
    return all.flatMap((c) =>
      c.items
        .filter((d) =>
          normalizeArabicForSearch(`${d.title ?? ''} ${d.arabicText}`).includes(needle),
        )
        .map((d) => ({ dhikr: d, categoryId: c.id })),
    );
  }, [all, query]);

  const favoriteItems = all.flatMap((c) =>
    c.items.filter((d) => favorites.includes(d.id)).map((d) => ({ dhikr: d, categoryId: c.id })),
  );
  const featured = contentRepository.category(adhkarMoment(days, now));
  const open = (id: string) => navigation.navigate('AdhkarCategory', { id });
  const titleOf = (c: DhikrCategory) => (locale === 'ar' ? c.titleAr : localized(c, 'title', locale));

  const categoryRow = (c: DhikrCategory) => {
    const done = doneIn(c);
    return (
      <Tappable
        key={c.id}
        onPress={() => open(c.id)}
        accessibilityRole="button"
        accessibilityLabel={`${titleOf(c)}, ${t('adhkar.progress', { done, total: c.items.length })}`}
        pressedScale={0.99}
        style={[styles.row, { borderBottomColor: theme.divider }]}
      >
        <ProgressRing value={c.items.length ? done / c.items.length : 0} size={36} stroke={2}>
          <LawhiText variant="caption" tone={done ? 'primary' : 'muted'} style={{ fontSize: 11 }}>
            {c.items.length}
          </LawhiText>
        </ProgressRing>
        <View style={{ flex: 1, gap: 2 }}>
          <LawhiText variant="subtitle" numberOfLines={2}>
            {titleOf(c)}
          </LawhiText>
          <LawhiText variant="caption" tone="muted">
            {done > 0
              ? t('adhkar.progress', { done, total: c.items.length })
              : t('adhkar.itemsCount', { count: c.items.length })}
          </LawhiText>
        </View>
        {locale === 'ar' ? null : (
          <ArabicText size={18} numberOfLines={1} style={{ color: theme.textSecondary, maxWidth: 130, lineHeight: 32 }}>
            {c.titleAr}
          </ArabicText>
        )}
      </Tappable>
    );
  };

  const dhikrRow = (item: { dhikr: Dhikr; categoryId: string }, star = false) => (
    <Tappable
      key={`${star ? 'fav' : 'res'}-${item.dhikr.id}`}
      onPress={() => open(item.categoryId)}
      accessibilityRole="button"
      pressedScale={0.99}
      style={[styles.row, { borderBottomColor: theme.divider }]}
    >
      {star ? <Icon name="star" size={18} color={theme.accent} filled /> : null}
      <View style={{ flex: 1, gap: 2 }}>
        <ArabicText size={18} numberOfLines={2} style={{ lineHeight: 34 }}>
          {preview(item.dhikr)}
        </ArabicText>
        <LawhiText variant="caption" tone="muted" numberOfLines={1}>
          {item.dhikr.source}
        </LawhiText>
      </View>
      <Icon name="chevronForward" size={18} color={theme.muted} />
    </Tappable>
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={{ paddingBottom: TAB_BAR_SPACE + insets.bottom + spacing.lg }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <ScreenHeader overline={t('adhkar.overline')} title={t('tabs.adhkar')}>
        <SearchField
          value={query}
          onChangeText={setQuery}
          placeholder={t('adhkar.searchPlaceholder')}
          accessibilityLabel={t('adhkar.search')}
          arabicInput
        />
      </ScreenHeader>

      <View style={styles.body}>
        {matches ? (
          <>
            <SectionHeader title={t('adhkar.results', { count: matches.length })} />
            <Surface padded={false} style={{ overflow: 'hidden' }}>
              {matches.map((m) => dhikrRow(m))}
            </Surface>
          </>
        ) : (
          <>
            {featured ? (
              <FeaturedMoment
                title={titleOf(featured)}
                titleAr={featured.titleAr}
                done={doneIn(featured)}
                total={featured.items.length}
                onPress={() => open(featured.id)}
              />
            ) : null}

            {favoriteItems.length > 0 ? (
              <>
                <SectionHeader title={t('adhkar.favorites')} style={styles.section} />
                <Surface padded={false} style={{ overflow: 'hidden' }}>
                  {favoriteItems.map((f) => dhikrRow(f, true))}
                </Surface>
              </>
            ) : null}

            <SectionHeader title={t('adhkar.adhkar')} style={styles.section} />
            <Surface padded={false} style={{ overflow: 'hidden' }}>
              {contentRepository.categories('adhkar').map(categoryRow)}
            </Surface>

            <SectionHeader title={t('adhkar.duas')} style={styles.section} />
            <Surface padded={false} style={{ overflow: 'hidden' }}>
              {contentRepository.categories('dua').map(categoryRow)}
            </Surface>

            <SectionHeader title={t('adhkar.tools')} style={styles.section} />
            <Tappable
              onPress={() => navigation.navigate('Tasbih')}
              accessibilityRole="button"
              style={[styles.tasbih, plain]}
            >
              <View style={[styles.beads, { borderColor: theme.accent }]}>
                <View style={[styles.bead, { backgroundColor: theme.accent }]} />
              </View>
              <View style={{ flex: 1 }}>
                <LawhiText variant="subtitle">{t('adhkar.tasbih')}</LawhiText>
                <LawhiText variant="caption" tone="muted">
                  {t('adhkar.tasbihHint')}
                </LawhiText>
              </View>
              <Icon name="chevronForward" size={18} color={theme.muted} />
            </Tappable>
          </>
        )}
      </View>
    </ScrollView>
  );
}

function FeaturedMoment({
  title,
  titleAr,
  done,
  total,
  onPress,
}: {
  title: string;
  titleAr: string;
  done: number;
  total: number;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const locale = useLocale();
  const finished = total > 0 && done >= total;
  return (
    <Tappable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${t('home.now')} : ${title}, ${t('adhkar.progress', { done, total })}`}
      pressedScale={0.985}
      style={[styles.featured, useSurfaceStyle('brand')]}
    >
      <Glow width={280} height={200} color={theme.glow} opacity={0.18} style={{ top: -70, left: -60 }} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.lg }}>
        <View style={{ flex: 1, gap: 4 }}>
          <LawhiText variant="overline" style={{ color: theme.onPrimaryContainer, opacity: 0.75 }}>
            {t('home.now')}
          </LawhiText>
          <LawhiText variant="heading" style={{ color: theme.onPrimaryContainer }}>
            {title}
          </LawhiText>
          {locale === 'ar' ? null : (
            <ArabicText size={20} style={{ color: theme.onPrimaryContainer, opacity: 0.85, textAlign: 'auto', lineHeight: 36 }}>
              {titleAr}
            </ArabicText>
          )}
        </View>
        <ProgressRing value={total ? done / total : 0} size={64} stroke={3} color={theme.accent} track={theme.surface}>
          <LawhiText variant="numeral" style={{ color: theme.onPrimaryContainer, fontSize: 15 }}>
            {done}/{total}
          </LawhiText>
        </ProgressRing>
      </View>
      <View style={[styles.cta, { backgroundColor: theme.primary }]}>
        <LawhiText variant="bodyStrong" style={{ color: theme.onPrimary }}>
          {finished ? t('adhkar.completed') : done > 0 ? t('adhkar.continue') : t('adhkar.start')}
        </LawhiText>
        <Icon name={finished ? 'check' : 'chevronForward'} size={16} color={theme.onPrimary} />
      </View>
    </Tappable>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: spacing.lg, gap: spacing.sm },
  section: { marginTop: spacing.lg },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 64,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  featured: { borderRadius: radius.xl, padding: spacing.xl, gap: spacing.lg, overflow: 'hidden', marginTop: spacing.xs },
  cta: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    minHeight: 40,
  },
  tasbih: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
  },
  beads: { width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, alignItems: 'center', justifyContent: 'flex-start' },
  bead: { width: 8, height: 8, borderRadius: 4, marginTop: -4 },
});
