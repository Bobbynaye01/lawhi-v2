import { useEffect, useLayoutEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArabicText, LawhiText, MessageState } from '../../components/ui';
import { spacing } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';
import type { RootScreenProps } from '../../navigation/types';
import { contentRepository } from '../../repositories/contentRepository';
import { useLibraryStore } from '../../stores/libraryStore';
import { useSettingsStore } from '../../stores/settingsStore';

function Separator() {
  const theme = useTheme();
  return <View style={[styles.separator, { backgroundColor: theme.divider }]} />;
}

export function BookChapterScreen({ route, navigation }: RootScreenProps<'BookChapter'>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const fontScale = useSettingsStore((s) => s.quranFontScale);
  const saveLastChapter = useLibraryStore((s) => s.saveLastChapter);
  const { bookId, chapterId } = route.params;
  const chapter = contentRepository.book(bookId)?.chapters.find((c) => c.id === chapterId);

  useLayoutEffect(() => {
    if (chapter) navigation.setOptions({ title: chapter.title });
  }, [navigation, chapter]);

  useEffect(() => {
    if (chapter) saveLastChapter(bookId, chapter.id);
  }, [bookId, chapter, saveLastChapter]);

  if (!chapter) return <MessageState title={t('errors.not_found')} />;

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: theme.background }}
      data={chapter.entries}
      keyExtractor={(e) => e.id}
      contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xxl }}
      ItemSeparatorComponent={Separator}
      showsVerticalScrollIndicator={false}
      renderItem={({ item }) => (
        <View style={styles.entry}>
          <LawhiText variant="overline" tone="accent">
            {t('library.entryNumber', { number: item.number })}
          </LawhiText>
          {item.narrator ? (
            <ArabicText size={16} style={{ color: theme.textSecondary }}>
              {item.narrator}
            </ArabicText>
          ) : null}
          <ArabicText size={20 * fontScale}>{item.text}</ArabicText>
          {item.reference ? (
            <LawhiText variant="caption" tone="muted">
              {item.reference}
            </LawhiText>
          ) : null}
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  entry: { paddingHorizontal: spacing.lg, paddingVertical: spacing.xl, gap: spacing.sm },
  separator: { height: StyleSheet.hairlineWidth, marginHorizontal: spacing.lg },
});
