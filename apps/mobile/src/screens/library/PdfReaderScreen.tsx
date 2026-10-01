import { useLayoutEffect, useState, type ComponentType } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, StyleSheet, UIManager, View } from 'react-native';
import type { PdfProps } from 'react-native-pdf';
import { AppText, MessageState, Screen } from '../../components/ui';
import { spacing } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';
import type { RootScreenProps } from '../../navigation/types';
import { contentRepository } from '../../repositories/contentRepository';
import { useLibraryStore } from '../../stores/libraryStore';
import { localized, useLocale } from '../../utils/localize';

/**
 * react-native-pdf is a native module: present in development/production
 * builds, absent from Expo Go. Loaded lazily so the app never crashes at
 * startup; without it the PDF opens in the phone's own viewer.
 */
function loadNativePdf(): ComponentType<PdfProps> | null {
  if (!UIManager.getViewManagerConfig?.('RNPDFPdfView')) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return (require('react-native-pdf') as { default: ComponentType<PdfProps> }).default;
  } catch {
    return null;
  }
}
const Pdf = loadNativePdf();

/** In-app PDF reader for downloaded books, with page resume. */
export function PdfReaderScreen({ route, navigation }: RootScreenProps<'PdfReader'>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const locale = useLocale();
  const { bookId } = route.params;
  const book = contentRepository.book(bookId);
  const download = useLibraryStore((s) => s.downloads[bookId]);
  const initialPage = useLibraryStore.getState().pdfPages[bookId] ?? 1;
  const savePdfPage = useLibraryStore((s) => s.savePdfPage);
  const [page, setPage] = useState({ current: initialPage, total: 0 });
  const [failed, setFailed] = useState(false);

  useLayoutEffect(() => {
    if (book)
      navigation.setOptions({
        title: locale === 'ar' ? book.titleAr : localized(book, 'title', locale),
      });
  }, [navigation, book, locale]);

  if (!Pdf) {
    return (
      <MessageState
        title={t('library.nativeReaderUnavailable')}
        actionLabel={book?.pdfUrl ? t('library.openPdf') : undefined}
        onAction={book?.pdfUrl ? () => void Linking.openURL(book.pdfUrl!) : undefined}
      />
    );
  }

  if (!download || failed) {
    return (
      <MessageState
        tone="error"
        title={t('library.cannotOpen')}
        message={t('library.cannotOpenHint')}
      />
    );
  }

  return (
    <Screen scroll={false}>
      <Pdf
        source={{ uri: download.uri }}
        page={initialPage}
        enablePaging={false}
        onPageChanged={(current, total) => {
          setPage({ current, total });
          savePdfPage(bookId, current);
        }}
        onError={() => setFailed(true)}
        style={[styles.pdf, { backgroundColor: theme.background }]}
      />
      <View
        style={[styles.footer, { borderTopColor: theme.border, backgroundColor: theme.surface }]}
      >
        <AppText variant="small" accessibilityLiveRegion="polite">
          {page.total > 0
            ? t('library.pageOf', { page: page.current, total: page.total })
            : t('common.loading')}
        </AppText>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pdf: { flex: 1 },
  footer: { padding: spacing.sm, alignItems: 'center', borderTopWidth: StyleSheet.hairlineWidth },
});
