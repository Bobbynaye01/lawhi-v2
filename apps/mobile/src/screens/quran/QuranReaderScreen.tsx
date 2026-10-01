import { Ionicons } from '@expo/vector-icons';
import type { Verse } from '@lawhi/shared';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, StyleSheet, View, type ViewToken } from 'react-native';
import { ActionSheet, type SheetAction } from '../../components/ActionSheet';
import { AppText, Screen } from '../../components/ui';
import { fonts, MIN_TOUCH, radius, spacing } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';
import type { RootScreenProps } from '../../navigation/types';
import { contentRepository } from '../../repositories/contentRepository';
import { quranRepository } from '../../repositories/quranRepository';
import { recitation, useRecitationStore } from '../../services/audio/recitationPlayer';
import { useQuranStore } from '../../stores/quranStore';
import { FONT_SCALE, useSettingsStore } from '../../stores/settingsStore';
import { localized, useLocale } from '../../utils/localize';
import { PlayerBar } from './PlayerBar';

type Item = { type: 'header'; surah: number } | { type: 'verse'; verse: Verse; index: number };

export function QuranReaderScreen({ route, navigation }: RootScreenProps<'QuranReader'>) {
  const target = route.params;
  const { t } = useTranslation();
  const theme = useTheme();
  const locale = useLocale();
  const riwaya = useSettingsStore((s) => s.riwaya);
  const fontScale = useSettingsStore((s) => s.quranFontScale);
  const setFontScale = useSettingsStore((s) => s.setQuranFontScale);
  const saveLastRead = useQuranStore((s) => s.saveLastRead);
  const bookmarks = useQuranStore((s) => s.bookmarks);
  const toggleBookmark = useQuranStore((s) => s.toggleBookmark);
  const playing = useRecitationStore((s) => (s.status === 'idle' ? null : s.queue[s.index]));
  const listRef = useRef<FlatList<Item>>(null);

  const verses = useMemo(
    () =>
      target.kind === 'surah'
        ? quranRepository.versesOfSurah(riwaya, target.number)
        : quranRepository.division(riwaya, target.kind, target.number),
    [riwaya, target.kind, target.number],
  );

  const items = useMemo(() => {
    const list: Item[] = [];
    verses.forEach((verse, index) => {
      if (verse.verse === 1) list.push({ type: 'header', surah: verse.surah });
      list.push({ type: 'verse', verse, index });
    });
    return list;
  }, [verses]);

  const title =
    target.kind === 'surah'
      ? localized(quranRepository.surah(target.number)!, 'name', locale)
      : t(`quran.${target.kind}Number`, { number: target.number });

  useLayoutEffect(() => {
    const adjust = (delta: number) => setFontScale(fontScale + delta);
    navigation.setOptions({
      title,
      headerRight: () => (
        <View style={{ flexDirection: 'row' }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('quran.smallerText')}
            disabled={fontScale <= FONT_SCALE.min}
            onPress={() => adjust(-FONT_SCALE.step)}
            style={styles.headerButton}
          >
            <AppText style={{ fontSize: 15 }}>A−</AppText>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('quran.largerText')}
            disabled={fontScale >= FONT_SCALE.max}
            onPress={() => adjust(FONT_SCALE.step)}
            style={styles.headerButton}
          >
            <AppText style={{ fontSize: 20 }}>A+</AppText>
          </Pressable>
        </View>
      ),
    });
  }, [navigation, title, fontScale, setFontScale, t]);

  // Open at the requested verse (e.g. "continue reading").
  const initialIndex = useMemo(() => {
    if (target.kind !== 'surah' || !target.verse) return 0;
    const i = items.findIndex((it) => it.type === 'verse' && it.verse.verse === target.verse);
    return Math.max(0, i);
  }, [items, target]);

  // Verse heights vary, so jump after the first render instead of initialScrollIndex.
  useEffect(() => {
    if (initialIndex === 0) return;
    const id = setTimeout(
      () => listRef.current?.scrollToIndex({ index: initialIndex, animated: false }),
      150,
    );
    return () => clearTimeout(id);
  }, [initialIndex]);

  useEffect(() => () => recitation.stop(), []);

  // Stable callback: FlatList does not support changing onViewableItemsChanged.
  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken<Item>[] }) => {
      const first = viewableItems.find((v) => v.item?.type === 'verse')?.item;
      if (first?.type === 'verse') {
        saveLastRead(useSettingsStore.getState().riwaya, {
          surah: first.verse.surah,
          verse: first.verse.verse,
        });
      }
    },
    [saveLastRead],
  );

  const [selected, setSelected] = useState<{ verse: Verse; index: number } | null>(null);

  const sheetActions = (): SheetAction[] => {
    if (!selected) return [];
    const { verse, index } = selected;
    const marked = bookmarks.some(
      (b) => b.riwaya === riwaya && b.surah === verse.surah && b.verse === verse.verse,
    );
    const reciterId = useSettingsStore.getState().reciterByRiwaya[riwaya];
    const reciter = reciterId ? contentRepository.reciter(reciterId) : undefined;
    return [
      ...(reciter
        ? [
            {
              label: t('quran.playFromHere'),
              onPress: () => void recitation.start(reciter, verses, index),
            },
          ]
        : []),
      {
        label: marked ? t('quran.removeBookmark') : t('quran.addBookmark'),
        onPress: () => toggleBookmark(riwaya, verse),
      },
    ];
  };

  const renderItem = ({ item }: { item: Item }) => {
    if (item.type === 'header') {
      const surah = quranRepository.surah(item.surah)!;
      const basmala = quranRepository.basmalaFor(riwaya, item.surah);
      return (
        <View
          style={[styles.header, { borderColor: theme.accent, backgroundColor: theme.card }]}
          accessibilityRole="header"
        >
          <AppText style={[styles.surahName, { color: theme.primary }]}>{surah.nameAr}</AppText>
          {basmala ? (
            <AppText style={[styles.basmala, { color: theme.quranText }]}>{basmala}</AppText>
          ) : null}
        </View>
      );
    }
    const { verse, index } = item;
    const isPlaying = playing?.surah === verse.surah && playing.verse === verse.verse;
    const marked = bookmarks.some(
      (b) => b.riwaya === riwaya && b.surah === verse.surah && b.verse === verse.verse,
    );
    return (
      <Pressable
        onPress={() => setSelected({ verse, index })}
        accessibilityRole="button"
        accessibilityLabel={t('quran.verseA11y', { surah: verse.surah, verse: verse.verse })}
        accessibilityHint={t('quran.verseHint')}
        style={[
          styles.verse,
          { borderBottomColor: theme.border },
          isPlaying && { backgroundColor: theme.card },
        ]}
      >
        <AppText
          style={[
            styles.verseText,
            { color: theme.quranText, fontSize: 24 * fontScale, lineHeight: 46 * fontScale },
          ]}
        >
          {verse.text} ﴿{verse.verse}﴾
        </AppText>
        {marked ? (
          <Ionicons name="bookmark" size={16} color={theme.accent} style={styles.mark} />
        ) : null}
      </Pressable>
    );
  };

  return (
    <Screen scroll={false} edges={['bottom']}>
      <FlatList
        ref={listRef}
        data={items}
        renderItem={renderItem}
        keyExtractor={(it) =>
          it.type === 'header' ? `h${it.surah}` : `v${it.verse.surah}:${it.verse.verse}`
        }
        onScrollToIndexFailed={({ index }) =>
          setTimeout(() => listRef.current?.scrollToIndex({ index, animated: false }), 200)
        }
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
        initialNumToRender={Math.max(12, initialIndex + 6)}
        windowSize={11}
      />
      <PlayerBar verses={verses} />
      <ActionSheet
        visible={selected !== null}
        title={
          selected
            ? `${localized(quranRepository.surah(selected.verse.surah)!, 'name', locale)} ${selected.verse.surah}:${selected.verse.verse}`
            : ''
        }
        actions={sheetActions()}
        onClose={() => setSelected(null)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    margin: spacing.lg,
    padding: spacing.lg,
    borderWidth: 1.5,
    borderRadius: radius.lg,
    alignItems: 'center',
    gap: spacing.sm,
  },
  surahName: { fontFamily: fonts.arabicBold, fontSize: 26 },
  basmala: { fontFamily: fonts.arabic, fontSize: 22, textAlign: 'center' },
  verse: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  verseText: { fontFamily: fonts.arabic, textAlign: 'right', writingDirection: 'rtl' },
  mark: { position: 'absolute', top: spacing.sm, left: spacing.sm },
  headerButton: {
    minWidth: MIN_TOUCH,
    minHeight: MIN_TOUCH,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
