import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { FlatList } from 'react-native';
import { ListRow, Screen } from '../../components/ui';
import { useTheme } from '../../hooks/useTheme';
import type { RootScreenProps } from '../../navigation/types';
import { contentRepository } from '../../repositories/contentRepository';
import { useLibraryStore } from '../../stores/libraryStore';
import { localized, useLocale } from '../../utils/localize';

export function LibraryScreen({ navigation }: RootScreenProps<'Library'>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const locale = useLocale();
  const downloads = useLibraryStore((s) => s.downloads);

  return (
    <Screen scroll={false}>
      <FlatList
        data={contentRepository.books()}
        keyExtractor={(b) => b.id}
        renderItem={({ item }) => (
          <ListRow
            title={locale === 'ar' ? item.titleAr : localized(item, 'title', locale)}
            subtitle={item.authorAr}
            leading={<Ionicons name="book" size={26} color={theme.primary} />}
            trailing={
              downloads[item.id] ? (
                <Ionicons name="cloud-done-outline" size={20} color={theme.success} accessibilityLabel={t('library.downloaded')} />
              ) : null
            }
            onPress={() => navigation.navigate('BookDetail', { bookId: item.id })}
          />
        )}
      />
    </Screen>
  );
}
