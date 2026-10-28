import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { confirmAsync } from '../../components/ActionSheet';
import { BookCover } from '../../components/library/BookCover';
import {
  ArabicText,
  Button,
  Icon,
  LawhiText,
  MessageState,
  Notice,
  ProgressBar,
  SectionHeader,
  Surface,
  Tappable,
} from '../../components/ui';
import { spacing } from '../../constants/theme';
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
  const insets = useSafeAreaInsets();
  const book = contentRepository.book(route.params.bookId);
  const downloaded = useLibraryStore((s) => s.downloads[route.params.bookId]);
  const lastPage = useLibraryStore((s) => s.pdfPages[route.params.bookId]);
  const lastChapterId = useLibraryStore((s) => s.lastChapter[route.params.bookId]);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const handle = useRef<DownloadHandle | null>(null);

  useLayoutEffect(() => {
    navigation.setOptions({ title: '' });
  }, [navigation]);

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
  const openChapter = (chapterId: string) =>
    navigation.navigate('BookChapter', { bookId: book.id, chapterId });

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxl }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.hero}>
        <BookCover titleAr={book.titleAr} width={96} />
        <ArabicText size={26} style={{ textAlign: 'center', color: theme.textPrimary }} accessibilityRole="header">
          {book.titleAr}
        </ArabicText>
        {locale === 'ar' ? null : (
          <LawhiText variant="title" style={{ textAlign: 'center' }}>
            {localized(book, 'title', locale)}
          </LawhiText>
        )}
        <LawhiText variant="caption" tone="secondary" style={{ textAlign: 'center' }}>
          {book.authorAr}
        </LawhiText>
      </View>

      <ArabicText size={17} style={{ color: theme.textSecondary }}>
        {book.description}
      </ArabicText>

      {lastChapter ? (
        <Button
          title={t('library.resumeChapter', { chapter: lastChapter.title })}
          icon="bookText"
          onPress={() => openChapter(lastChapter.id)}
        />
      ) : null}

      <SectionHeader
        title={book.isExcerpt ? t('library.excerptsSection') : t('library.textSection')}
        style={styles.section}
      />
      {book.isExcerpt ? (
        <LawhiText variant="caption" tone="muted">
          {t('library.excerptsHint')}
        </LawhiText>
      ) : null}
      <Surface padded={false} style={{ overflow: 'hidden' }}>
        {book.chapters.map((c, i) => (
          <Tappable
            key={c.id}
            onPress={() => openChapter(c.id)}
            accessibilityRole="button"
            pressedScale={0.99}
            style={[
              styles.chapter,
              { borderBottomColor: theme.divider },
              c.id === lastChapterId && { backgroundColor: theme.accentSoft },
            ]}
          >
            <LawhiText variant="numeral" tone="muted" style={{ width: 24, fontSize: 14 }}>
              {i + 1}
            </LawhiText>
            <View style={{ flex: 1, gap: 2 }}>
              <LawhiText variant="subtitle" numberOfLines={2}>
                {c.title}
              </LawhiText>
              <LawhiText variant="caption" tone="muted">
                {t('library.entriesCount', { count: c.entries.length })}
              </LawhiText>
            </View>
            <Icon name="chevronForward" size={18} color={theme.muted} />
          </Tappable>
        ))}
      </Surface>

      <SectionHeader title={t('library.pdfSection')} style={styles.section} />
      {!book.pdfUrl ? (
        <Notice tone="warning">{t('library.pdfUnavailable')}</Notice>
      ) : Platform.OS === 'web' ? (
        <Button
          title={t('library.openPdf')}
          icon="file"
          variant="secondary"
          onPress={() => void Linking.openURL(book.pdfUrl!)}
        />
      ) : downloaded ? (
        <View style={{ gap: spacing.sm }}>
          <Button
            title={lastPage ? t('library.resumeAtPage', { page: lastPage }) : t('library.read')}
            icon="file"
            onPress={() => navigation.navigate('PdfReader', { bookId: book.id })}
          />
          <LawhiText variant="caption" tone="muted">
            {t('library.storedSize', { mb: Math.round(downloaded.sizeBytes / 1048576) })}
          </LawhiText>
          <Button
            title={t('library.deleteDownload')}
            icon="trash"
            variant="ghost"
            onPress={() => void remove()}
          />
        </View>
      ) : progress !== null ? (
        <View style={{ gap: spacing.sm }} accessibilityLiveRegion="polite">
          <LawhiText>{t('library.downloading', { percent: Math.round(progress * 100) })}</LawhiText>
          <ProgressBar value={progress} height={4} />
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
            icon="download"
            variant="secondary"
            onPress={() => void startDownload()}
          />
          <LawhiText variant="caption" tone="muted">
            {t('library.downloadHint')}
          </LawhiText>
        </View>
      )}
      {error ? <Notice tone="warning">{error}</Notice> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.lg, gap: spacing.md },
  hero: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.lg },
  section: { marginTop: spacing.md },
  chapter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 60,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
