import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, Platform, StyleSheet, View } from 'react-native';
import { confirmAsync } from '../../components/ActionSheet';
import {
  AppText,
  Button,
  Card,
  ListRow,
  MessageState,
  Notice,
  Screen,
  SectionTitle,
} from '../../components/ui';
import { fonts, radius, spacing } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';
import type { RootScreenProps } from '../../navigation/types';
import { contentRepository } from '../../repositories/contentRepository';
import { deleteBook, downloadBook, type DownloadHandle } from '../../services/bookDownloads';
import { useLibraryStore } from '../../stores/libraryStore';
import { localized, useLocale } from '../../utils/localize';

export function BookDetailScreen({ route, navigation }: RootScreenProps<'BookDetail'>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const locale = useLocale();
  const book = contentRepository.book(route.params.bookId);
  const downloaded = useLibraryStore((s) => s.downloads[route.params.bookId]);
  const lastPage = useLibraryStore((s) => s.pdfPages[route.params.bookId]);
  const lastChapterId = useLibraryStore((s) => s.lastChapter[route.params.bookId]);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const handle = useRef<DownloadHandle | null>(null);

  useLayoutEffect(() => {
    if (book)
      navigation.setOptions({
        title: locale === 'ar' ? book.titleAr : localized(book, 'title', locale),
      });
  }, [navigation, book, locale]);

  useEffect(() => () => handle.current?.cancel(), []);

  if (!book) return <MessageState title={t('errors.not_found')} />;

  const startDownload = async () => {
    setError(null);
    setProgress(0);
    try {
      handle.current = downloadBook(book, setProgress);
      await handle.current.promise;
    } catch (e) {
      const code = e instanceof Error ? e.message : '';
      if (code !== 'download_cancelled' && !(e instanceof Error && e.name === 'AbortError')) {
        setError(t(code === 'not_a_pdf' ? 'library.notAPdf' : 'library.downloadFailed'));
      }
    } finally {
      handle.current = null;
      setProgress(null);
    }
  };

  const remove = async () => {
    const ok = await confirmAsync({
      title: t('library.deleteTitle'),
      message: t('library.deleteMessage'),
      confirm: t('common.delete'),
      cancel: t('common.cancel'),
      destructive: true,
    });
    if (ok) deleteBook(book.id);
  };

  const lastChapter = book.chapters.find((c) => c.id === lastChapterId);

  return (
    <Screen>
      <Card>
        <AppText style={[styles.arabicTitle, { color: theme.primary }]}>{book.titleAr}</AppText>
        <AppText variant="muted">{book.authorAr}</AppText>
        <AppText style={styles.description}>{book.description}</AppText>
      </Card>

      <SectionTitle>{t('library.pdfSection')}</SectionTitle>
      {!book.pdfUrl ? (
        <Notice tone="warning">{t('library.pdfUnavailable')}</Notice>
      ) : Platform.OS === 'web' ? (
        <Button title={t('library.openPdf')} onPress={() => void Linking.openURL(book.pdfUrl!)} />
      ) : downloaded ? (
        <View style={{ gap: spacing.sm }}>
          <Button
            title={lastPage ? t('library.resumeAtPage', { page: lastPage }) : t('library.read')}
            onPress={() => navigation.navigate('PdfReader', { bookId: book.id })}
          />
          <AppText variant="small">
            {t('library.storedSize', { mb: Math.round(downloaded.sizeBytes / 1048576) })}
          </AppText>
          <Button
            title={t('library.deleteDownload')}
            variant="secondary"
            onPress={() => void remove()}
          />
        </View>
      ) : progress !== null ? (
        <View style={{ gap: spacing.sm }} accessibilityLiveRegion="polite">
          <AppText>{t('library.downloading', { percent: Math.round(progress * 100) })}</AppText>
          <View style={[styles.track, { backgroundColor: theme.border }]}>
            <View
              style={[styles.fill, { backgroundColor: theme.primary, width: `${progress * 100}%` }]}
            />
          </View>
          <Button
            title={t('common.cancel')}
            variant="secondary"
            onPress={() => handle.current?.cancel()}
          />
        </View>
      ) : (
        <View style={{ gap: spacing.sm }}>
          <Button
            title={t('library.download', { mb: book.pdfSizeMB ?? '?' })}
            onPress={() => void startDownload()}
          />
          <AppText variant="small">{t('library.downloadHint')}</AppText>
        </View>
      )}
      {error ? <Notice tone="warning">{error}</Notice> : null}

      <SectionTitle>
        {book.isExcerpt ? t('library.excerptsSection') : t('library.textSection')}
      </SectionTitle>
      {book.isExcerpt ? <AppText variant="small">{t('library.excerptsHint')}</AppText> : null}
      {lastChapter ? (
        <Button
          title={t('library.resumeChapter', { chapter: lastChapter.title })}
          variant="secondary"
          onPress={() =>
            navigation.navigate('BookChapter', { bookId: book.id, chapterId: lastChapter.id })
          }
        />
      ) : null}
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {book.chapters.map((c) => (
          <ListRow
            key={c.id}
            title={c.title}
            subtitle={t('library.entriesCount', { count: c.entries.length })}
            onPress={() => navigation.navigate('BookChapter', { bookId: book.id, chapterId: c.id })}
          />
        ))}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  arabicTitle: { fontFamily: fonts.arabicBold, fontSize: 26, textAlign: 'center' },
  description: {
    fontFamily: fonts.arabic,
    fontSize: 17,
    lineHeight: 30,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  track: { height: 8, borderRadius: radius.pill, overflow: 'hidden' },
  fill: { height: 8 },
});
