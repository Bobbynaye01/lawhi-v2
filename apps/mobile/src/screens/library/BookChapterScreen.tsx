import { useEffect, useLayoutEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, StyleSheet } from 'react-native';
import { AppText, Card, MessageState, Screen } from '../../components/ui';
import { fonts, spacing } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';
import type { RootScreenProps } from '../../navigation/types';
import { contentRepository } from '../../repositories/contentRepository';
import { useLibraryStore } from '../../stores/libraryStore';
import { useSettingsStore } from '../../stores/settingsStore';

export function BookChapterScreen({ route, navigation }: RootScreenProps<'BookChapter'>) {
  const { t } = useTranslation();
  const theme = useTheme();
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
    <Screen scroll={false}>
      <FlatList
        data={chapter.entries}
        keyExtractor={(e) => e.id}
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}
        renderItem={({ item }) => (
          <Card>
            <AppText variant="small">{t('library.entryNumber', { number: item.number })}</AppText>
            {item.narrator ? <AppText variant="muted">{item.narrator}</AppText> : null}
            <AppText
              style={[
                styles.text,
                { color: theme.quranText, fontSize: 19 * fontScale, lineHeight: 36 * fontScale },
              ]}
            >
              {item.text}
            </AppText>
            {item.reference ? <AppText variant="small">{item.reference}</AppText> : null}
          </Card>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  text: { fontFamily: fonts.arabic, textAlign: 'right', writingDirection: 'rtl' },
});
