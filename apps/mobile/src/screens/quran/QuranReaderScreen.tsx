import type { Riwaya, Verse } from '@lawhi/shared';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Animated,
  Easing,
  FlatList,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type GestureResponderEvent,
  type LayoutChangeEvent,
  type ViewToken,
} from 'react-native';
import { ActionSheet, type SheetAction } from '../../components/ActionSheet';
import {
  InkText,
  LAWH_SCRIM,
  LawhDomeTitle,
  lawhLayout,
  LawhStage,
  LawhSurahOpening,
  LawhVeil,
} from '../../components/quran/Lawh';
import { TextSizeSheet } from '../../components/quran/TextSizeSheet';
import { Icon } from '../../components/ui';
import { radius, spacing } from '../../constants/theme';
import type { RootScreenProps } from '../../navigation/types';
import { contentRepository } from '../../repositories/contentRepository';
import { quranRepository } from '../../repositories/quranRepository';
import { recitation, useRecitationStore } from '../../services/audio/recitationPlayer';
import { useQuranStore } from '../../stores/quranStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { localized, useLocale } from '../../utils/localize';
import { PlayerBar } from './PlayerBar';

type Item = { type: 'header'; surah: number } | { type: 'verse'; verse: Verse; index: number };

/** End-of-ayah sign followed by Arabic-Indic digits: Amiri Quran draws them as a medallion. */
const AYAH_END = String.fromCharCode(0x06dd);
const arabicDigits = (n: number) =>
  String(n)
    .split('')
    .map((d) => String.fromCharCode(0x0660 + Number(d)))
    .join('');

const HEADER_TINT = '#F3E7D2';
const native = Platform.OS !== 'web';

function buildItems(verses: Verse[]): Item[] {
  const list: Item[] = [];
  verses.forEach((verse, index) => {
    if (verse.verse === 1) list.push({ type: 'header', surah: verse.surah });
    list.push({ type: 'verse', verse, index });
  });
  return list;
}

/** What follows the last written verse: the rest of its surah, else the next surah. */
function versesAfter(riwaya: Riwaya, last: Verse): Verse[] {
  const rest = quranRepository.versesOfSurah(riwaya, last.surah).filter((v) => v.verse > last.verse);
  if (rest.length) return rest;
  return last.surah < 114 ? quranRepository.versesOfSurah(riwaya, last.surah + 1) : [];
}

/** What precedes the first written verse: the start of its surah, else the previous surah. */
function versesBefore(riwaya: Riwaya, first: Verse): Verse[] {
  const start = quranRepository.versesOfSurah(riwaya, first.surah).filter((v) => v.verse < first.verse);
  if (start.length) return start;
  return first.surah > 1 ? quranRepository.versesOfSurah(riwaya, first.surah - 1) : [];
}

export function QuranReaderScreen({ route, navigation }: RootScreenProps<'QuranReader'>) {
  const target = route.params;
  const { t } = useTranslation();
  const locale = useLocale();
  const riwaya = useSettingsStore((s) => s.riwaya);
  const fontScale = useSettingsStore((s) => s.quranFontScale);
  const saveLastRead = useQuranStore((s) => s.saveLastRead);
  const bookmarks = useQuranStore((s) => s.bookmarks);
  const toggleBookmark = useQuranStore((s) => s.toggleBookmark);
  const playing = useRecitationStore((s) => (s.status === 'idle' ? null : s.queue[s.index]));
  const listRef = useRef<FlatList<Item>>(null);
  const [sizing, setSizing] = useState(false);
  const [pinching, setPinching] = useState(false);

  // The passage that was opened; reading then flows on into the surahs around it.
  const base = useMemo(
    () =>
      target.kind === 'surah'
        ? quranRepository.versesOfSurah(riwaya, target.number)
        : quranRepository.division(riwaya, target.kind, target.number),
    [riwaya, target.kind, target.number],
  );
  const startOf = (v: Verse[]) => ({ surah: v[0]?.surah ?? 1, verse: v[0]?.verse ?? 1 });
  const [verses, setVerses] = useState(base);
  const [current, setCurrent] = useState(() => startOf(base));
  const [shownBase, setShownBase] = useState(base);
  if (shownBase !== base) {
    setShownBase(base);
    setVerses(base);
    setCurrent(startOf(base));
  }

  const items = useMemo(() => buildItems(verses), [verses]);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: '',
      headerStyle: { backgroundColor: LAWH_SCRIM },
      headerTintColor: HEADER_TINT,
      contentStyle: { backgroundColor: LAWH_SCRIM },
      headerRight: () => (
        <Pressable
          onPress={() => setSizing(true)}
          accessibilityRole="button"
          accessibilityLabel={t('settings.textSize')}
          hitSlop={10}
          style={styles.headerButton}
        >
          <Icon name="textSize" size={22} color={HEADER_TINT} />
        </Pressable>
      ),
    });
  }, [navigation, t]);

  // Open at the requested verse (e.g. "continue reading").
  const initialIndex = useMemo(() => {
    if (target.kind !== 'surah' || !target.verse) return 0;
    const i = buildItems(base).findIndex((it) => it.type === 'verse' && it.verse.verse === target.verse);
    return Math.max(0, i);
  }, [base, target]);

  // Earlier passages are only written in once the reader is in place.
  const positioned = useRef(initialIndex === 0);
  const extending = useRef(false);
  useEffect(() => {
    extending.current = false;
  }, [verses]);

  // Verse heights vary, so jump after the first render instead of initialScrollIndex.
  useEffect(() => {
    if (initialIndex === 0) return;
    const jump = setTimeout(
      () => listRef.current?.scrollToIndex({ index: initialIndex, animated: false }),
      150,
    );
    const settle = setTimeout(() => (positioned.current = true), 600);
    return () => {
      clearTimeout(jump);
      clearTimeout(settle);
    };
  }, [initialIndex]);

  useEffect(() => () => recitation.stop(), []);

  // A surah arrow opens a new passage: start writing it from the top of the board.
  const firstBase = useRef(base);
  useEffect(() => {
    if (firstBase.current === base) return;
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, [base]);

  const openSurah = (number: number) => navigation.setParams({ kind: 'surah', number, verse: undefined });

  // Pinch to enlarge or reduce the writing; it is the same setting as the text-size sheet.
  const [pinchResponder] = useState(() => {
    const pinch: { current: { distance: number; scale: number } | null } = { current: null };
    const spread = (e: GestureResponderEvent) => {
      const [a, b] = e.nativeEvent.touches;
      return a && b ? Math.hypot(a.pageX - b.pageX, a.pageY - b.pageY) : 0;
    };
    const twoFingers = (e: GestureResponderEvent) => e.nativeEvent.touches.length === 2;
    const end = () => {
      pinch.current = null;
      setPinching(false);
    };
    return PanResponder.create({
      onStartShouldSetPanResponderCapture: twoFingers,
      onMoveShouldSetPanResponderCapture: twoFingers,
      onPanResponderGrant: () => setPinching(true),
      onPanResponderMove: (e) => {
        const distance = spread(e);
        if (!distance) return;
        if (!pinch.current) {
          pinch.current = { distance, scale: useSettingsStore.getState().quranFontScale };
          return;
        }
        // The store rounds to 0.1, so the text only reflows at each visible step.
        useSettingsStore.getState().setQuranFontScale(pinch.current.scale * (distance / pinch.current.distance));
      },
      onPanResponderTerminationRequest: () => false,
      onPanResponderRelease: end,
      onPanResponderTerminate: end,
    });
  });

  const writeNext = () => {
    const last = verses[verses.length - 1];
    if (!last || extending.current) return;
    const next = versesAfter(riwaya, last);
    if (!next.length) return;
    extending.current = true;
    setVerses((v) => [...v, ...next]);
  };

  const writePrevious = () => {
    const first = verses[0];
    if (!first || extending.current || !positioned.current) return;
    const previous = versesBefore(riwaya, first);
    if (!previous.length) return;
    extending.current = true;
    setVerses((v) => [...previous, ...v]);
  };

  // Stable callback: FlatList does not support changing onViewableItemsChanged.
  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken<Item>[] }) => {
      const first = viewableItems.find((v) => v.item?.type === 'verse')?.item;
      if (first?.type === 'verse') {
        saveLastRead(useSettingsStore.getState().riwaya, {
          surah: first.verse.surah,
          verse: first.verse.verse,
        });
        setCurrent({ surah: first.verse.surah, verse: first.verse.verse });
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
      const meta = t('quran.surahMeta', {
        count: riwaya === 'hafs' ? surah.versesHafs : surah.versesWarsh,
        place: t(`quran.revelation.${surah.revelationPlace}`),
      });
      return (
        <LawhSurahOpening
          nameAr={surah.nameAr}
          subtitle={locale === 'ar' ? meta : `${localized(surah, 'name', locale)} · ${meta}`}
          basmala={quranRepository.basmalaFor(riwaya, item.surah)}
          basmalaSize={22 * fontScale}
        />
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
        style={({ pressed }) => [
          styles.verse,
          isPlaying ? styles.versePlaying : pressed ? styles.versePressed : null,
        ]}
      >
        <InkText size={24 * fontScale}>
          {verse.text} {AYAH_END}
          {arabicDigits(verse.verse)}
        </InkText>
        {marked ? (
          <View style={styles.mark}>
            <Icon name="bookmark" size={14} color="#6B3A17" filled />
          </View>
        ) : null}
      </Pressable>
    );
  };

  // The stage is measured, then the board is fitted to it (never stretched).
  const [stage, setStage] = useState<{ width: number; height: number } | null>(null);
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setStage((s) => (s && s.width === width && s.height === height ? s : { width, height }));
  };

  // Entering the reader continues the intro's camera move onto the board.
  const [enter] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (!stage) return;
    Animated.timing(enter, {
      toValue: 1,
      duration: 650,
      easing: Easing.bezier(0.2, 0, 0, 1),
      useNativeDriver: native,
    }).start();
  }, [stage !== null, enter]); // eslint-disable-line react-hooks/exhaustive-deps

  const surahNow = quranRepository.surah(current.surah);
  const sample = base.find((v) => v.text.length > 20)?.text ?? base[0]?.text ?? '';

  const scene = stage ? (() => {
    const layout = lawhLayout(stage.width, spacing.sm);
    const windowTop = layout.y + layout.dome * 0.6;
    const windowBottom = Math.min(layout.y + layout.height - 10 * layout.scale, stage.height);
    const inset = layout.width * 0.075;
    return (
      <Animated.View
        {...pinchResponder.panHandlers}
        style={[
          StyleSheet.absoluteFill,
          {
            // The lawh is laid out the same way whatever the interface language.
            direction: 'ltr',
            opacity: enter,
            transform: [{ scale: enter.interpolate({ inputRange: [0, 1], outputRange: [1.04, 1] }) }],
          },
        ]}
      >
        <LawhStage width={stage.width} height={stage.height} layout={layout} />
        <FlatList
          ref={listRef}
          style={{
            position: 'absolute',
            top: windowTop,
            left: layout.x + inset,
            width: layout.width - inset * 2,
            height: windowBottom - windowTop,
          }}
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
          onEndReached={writeNext}
          onEndReachedThreshold={1.5}
          onStartReached={writePrevious}
          onStartReachedThreshold={1}
          maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
          initialNumToRender={Math.max(12, initialIndex + 6)}
          windowSize={11}
          contentContainerStyle={{ paddingTop: 24, paddingBottom: 128 }}
          showsVerticalScrollIndicator={false}
          scrollEnabled={!pinching}
        />
        <LawhVeil
          width={stage.width}
          height={stage.height}
          layout={layout}
          top={windowTop}
          bottom={windowBottom}
        />
        {surahNow ? (
          <LawhDomeTitle
            layout={layout}
            name={surahNow.nameAr}
            caption={
              locale === 'ar'
                ? t('quran.verseNumber', { number: current.verse })
                : `${localized(surahNow, 'name', locale)} · ${t('quran.verseNumber', { number: current.verse })}`
            }
            previous={
              current.surah > 1
                ? { label: t('quran.previousSurah'), onPress: () => openSurah(current.surah - 1) }
                : undefined
            }
            next={
              current.surah < 114
                ? { label: t('quran.nextSurah'), onPress: () => openSurah(current.surah + 1) }
                : undefined
            }
          />
        ) : null}
      </Animated.View>
    );
  })() : null;

  return (
    <View style={{ flex: 1, backgroundColor: LAWH_SCRIM }} onLayout={onLayout}>
      <StatusBar style="light" />
      {scene}
      <View style={styles.player} pointerEvents="box-none">
        <PlayerBar verses={base} />
      </View>
      <TextSizeSheet visible={sizing} onClose={() => setSizing(false)} preview={sample} />
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
    </View>
  );
}

const styles = StyleSheet.create({
  verse: {
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  versePressed: { backgroundColor: 'rgba(27, 16, 9, 0.07)' },
  versePlaying: { backgroundColor: 'rgba(255, 236, 200, 0.32)' },
  mark: { position: 'absolute', top: spacing.xs, left: 0 },
  headerButton: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  player: { position: 'absolute', left: 0, right: 0, bottom: 0 },
});
