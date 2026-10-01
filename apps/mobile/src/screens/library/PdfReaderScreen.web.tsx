import { useTranslation } from 'react-i18next';
import { Linking } from 'react-native';
import { MessageState, Screen } from '../../components/ui';
import type { RootScreenProps } from '../../navigation/types';
import { contentRepository } from '../../repositories/contentRepository';

/** On the web, PDFs open in the browser's own viewer (react-native-pdf is native-only). */
export function PdfReaderScreen({ route }: RootScreenProps<'PdfReader'>) {
  const { t } = useTranslation();
  const book = contentRepository.book(route.params.bookId);
  return (
    <Screen scroll={false}>
      <MessageState
        title={t('library.webPdfTitle')}
        actionLabel={book?.pdfUrl ? t('library.openPdf') : undefined}
        onAction={book?.pdfUrl ? () => void Linking.openURL(book.pdfUrl!) : undefined}
      />
    </Screen>
  );
}
