import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable } from 'react-native';
import { ListRow, MessageState, Screen } from '../../components/ui';
import { MIN_TOUCH } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';
import type { RootScreenProps } from '../../navigation/types';
import { quranRepository } from '../../repositories/quranRepository';
import { useQuranStore } from '../../stores/quranStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { localized, useLocale } from '../../utils/localize';

export function BookmarksScreen({ navigation }: RootScreenProps<'Bookmarks'>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const locale = useLocale();
  const bookmarks = useQuranStore((s) => s.bookmarks);
  const toggleBookmark = useQuranStore((s) => s.toggleBookmark);
  const setRiwaya = useSettingsStore((s) => s.setRiwaya);

  if (bookmarks.length === 0) {
    return (
      <Screen scroll={false}>
        <MessageState title={t('quran.noBookmarks')} message={t('quran.noBookmarksHint')} />
      </Screen>
    );
  }

  return (
    <Screen scroll={false}>
      <FlatList
        data={bookmarks}
        keyExtractor={(b) => `${b.riwaya}-${b.surah}-${b.verse}`}
        renderItem={({ item }) => (
          <ListRow
            title={`${localized(quranRepository.surah(item.surah)!, 'name', locale)} ${item.surah}:${item.verse}`}
            subtitle={t(`quran.riwaya.${item.riwaya}`)}
            onPress={() => {
              setRiwaya(item.riwaya);
              navigation.navigate('QuranReader', {
                kind: 'surah',
                number: item.surah,
                verse: item.verse,
              });
            }}
            trailing={
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('quran.removeBookmark')}
                onPress={() => toggleBookmark(item.riwaya, item)}
                style={{
                  minWidth: MIN_TOUCH,
                  minHeight: MIN_TOUCH,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="trash-outline" size={20} color={theme.danger} />
              </Pressable>
            }
          />
        )}
      />
    </Screen>
  );
}
