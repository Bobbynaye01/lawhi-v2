import { normalizeArabicForSearch } from '@lawhi/shared';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BookCover } from '../../components/library/BookCover';
import { UnderlineTabs } from '../../components/quran/QuranParts';
import {
  ArabicText,
  Icon,
  LawhiText,
  SearchField,
  SectionHeader,
  Surface,
  Tappable,
  useSurfaceStyle,
} from '../../components/ui';
import { radius, spacing } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';
import type { RootScreenProps } from '../../navigation/types';
import { contentRepository, type Book } from '../../repositories/contentRepository';
import { useLibraryStore } from '../../stores/libraryStore';
import { localized, useLocale } from '../../utils/localize';

type Shelf = 'all' | 'hadith' | 'adhkar';
/** Books of remembrance and supplication; every other book is a hadith collection. */
const ADHKAR_BOOKS = new Set(['hisn', 'adhkar_nawawi']);

export function LibraryScreen({ navigation }: RootScreenProps<'Library'>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const locale = useLocale();
  const insets = useSafeAreaInsets();
  const downloads = useLibraryStore((s) => s.downloads);
  const lastChapter = useLibraryStore((s) => s.lastChapter);
  const pdfPages = useLibraryStore((s) => s.pdfPages);
  const [query, setQuery] = useState('');
  const [shelf, setShelf] = useState<Shelf>('all');
  const elevated = useSurfaceStyle('elevated');

  const books = contentRepository.books();
  const titleOf = (b: Book) => (locale === 'ar' ? b.titleAr : localized(b, 'title', locale));

  const results = useMemo(() => {
    const needle = normalizeArabicForSearch(query.trim()).toLowerCase();
    if (needle.length < 2) return null;
    const hits: { book: Book; chapterId: string; chapterTitle: string; snippet: string | null }[] = [];
    for (const book of books) {
      const bookMatch = normalizeArabicForSearch(
        `${book.titleAr} ${book.titleFr} ${book.titleEn}`,
      )
        .toLowerCase()
        .includes(needle);
      for (const chapter of book.chapters) {
        const entry = chapter.entries.find((e) =>
          normalizeArabicForSearch(`${e.text} ${e.narrator ?? ''}`).includes(needle),
        );
        const chapterMatch = normalizeArabicForSearch(chapter.title).toLowerCase().includes(needle);
        if (entry || chapterMatch || (bookMatch && chapter === book.chapters[0])) {
          hits.push({
            book,
            chapterId: chapter.id,
            chapterTitle: chapter.title,
            snippet: entry ? entry.text.split(/\s+/).slice(0, 14).join(' ') : null,
          });
        }
      }
    }
    return hits;
  }, [books, query]);

  const recent = books.filter((b) => lastChapter[b.id] || pdfPages[b.id]);
  const shelved = books.filter((b) =>
    shelf === 'all' ? true : shelf === 'adhkar' ? ADHKAR_BOOKS.has(b.id) : !ADHKAR_BOOKS.has(b.id),
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxl }]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <LawhiText variant="overline" tone="muted">
        {t('library.overline')}
      </LawhiText>
      <SearchField
        value={query}
        onChangeText={setQuery}
        placeholder={t('library.searchPlaceholder')}
        accessibilityLabel={t('library.search')}
      />

      {results ? (
        <>
          <SectionHeader title={t('adhkar.results', { count: results.length })} style={styles.section} />
          {results.length === 0 ? (
            <LawhiText tone="muted">{t('library.noResults')}</LawhiText>
          ) : (
            <Surface padded={false} style={{ overflow: 'hidden' }}>
              {results.map((r) => (
                <Tappable
                  key={`${r.book.id}-${r.chapterId}`}
                  onPress={() => navigation.navigate('BookChapter', { bookId: r.book.id, chapterId: r.chapterId })}
                  accessibilityRole="button"
                  pressedScale={0.99}
                  style={[styles.row, { borderBottomColor: theme.divider }]}
                >
                  <View style={{ flex: 1, gap: 2 }}>
                    <LawhiText variant="caption" tone="muted" numberOfLines={1}>
                      {titleOf(r.book)} · {r.chapterTitle}
                    </LawhiText>
                    {r.snippet ? (
                      <ArabicText size={17} numberOfLines={2} style={{ lineHeight: 32 }}>
                        {r.snippet}
                      </ArabicText>
                    ) : null}
                  </View>
                  <Icon name="chevronForward" size={18} color={theme.muted} />
                </Tappable>
              ))}
            </Surface>
          )}
        </>
      ) : (
        <>
          {recent.length > 0 ? (
            <>
              <SectionHeader title={t('library.recent')} style={styles.section} />
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: spacing.md }}
                style={{ marginHorizontal: -spacing.lg }}
              >
                <View style={{ width: spacing.lg - spacing.md }} />
                {recent.map((b) => {
                  const chapter = b.chapters.find((c) => c.id === lastChapter[b.id]);
                  return (
                    <Tappable
                      key={b.id}
                      onPress={() =>
                        chapter
                          ? navigation.navigate('BookChapter', { bookId: b.id, chapterId: chapter.id })
                          : navigation.navigate('BookDetail', { bookId: b.id })
                      }
                      accessibilityRole="button"
                      style={[styles.recent, elevated]}
                    >
                      <BookCover titleAr={b.titleAr} width={44} />
                      <View style={{ flex: 1, gap: 2 }}>
                        <LawhiText variant="bodyStrong" numberOfLines={1}>
                          {titleOf(b)}
                        </LawhiText>
                        <LawhiText variant="caption" tone="secondary" numberOfLines={2}>
                          {chapter ? chapter.title : t('library.atPage', { page: pdfPages[b.id] })}
                        </LawhiText>
                      </View>
                    </Tappable>
                  );
                })}
                <View style={{ width: spacing.lg - spacing.md }} />
              </ScrollView>
            </>
          ) : null}

          <View style={styles.section}>
            <UnderlineTabs
              value={shelf}
              onChange={setShelf}
              tabs={[
                { value: 'all', label: t('library.all') },
                { value: 'hadith', label: t('library.hadith') },
                { value: 'adhkar', label: t('library.adhkarBooks') },
              ]}
            />
          </View>
          <View>
            {shelved.map((b) => (
              <Tappable
                key={b.id}
                onPress={() => navigation.navigate('BookDetail', { bookId: b.id })}
                accessibilityRole="button"
                accessibilityLabel={titleOf(b)}
                pressedScale={0.99}
                style={[styles.book, { borderBottomColor: theme.divider }]}
              >
                <BookCover titleAr={b.titleAr} />
                <View style={{ flex: 1, gap: 3 }}>
                  <LawhiText variant="subtitle" numberOfLines={2}>
                    {titleOf(b)}
                  </LawhiText>
                  <LawhiText variant="caption" tone="secondary" numberOfLines={1}>
                    {b.authorAr}
                  </LawhiText>
                  <View style={styles.tags}>
                    <Tag label={t('library.offline')} />
                    {b.pdfUrl ? <Tag label={t('library.pdfOnly')} /> : null}
                    {downloads[b.id] ? <Tag label={t('library.downloaded')} tone="success" /> : null}
                  </View>
                </View>
                <Icon name="chevronForward" size={18} color={theme.muted} />
              </Tappable>
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}

function Tag({ label, tone }: { label: string; tone?: 'success' }) {
  const theme = useTheme();
  return (
    <View style={[styles.tag, { backgroundColor: tone ? theme.primaryContainer : theme.surfaceSunken }]}>
      <LawhiText variant="caption" tone={tone ? 'brand' : 'muted'} style={{ fontSize: 11 }}>
        {label}
      </LawhiText>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, gap: spacing.md },
  section: { marginTop: spacing.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  recent: {
    width: 250,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
  },
  book: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tags: { flexDirection: 'row', gap: spacing.xs, marginTop: 2 },
  tag: { borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 1 },
});
