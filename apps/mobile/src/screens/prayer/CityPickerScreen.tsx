import { useQuery } from '@tanstack/react-query';
import { useDeferredValue, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, StyleSheet, TextInput, View } from 'react-native';
import { ListRow, LoadingState, MessageState, Notice, Screen } from '../../components/ui';
import { isApiConfigured } from '../../constants/config';
import { MIN_TOUCH, radius, spacing } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';
import type { RootScreenProps } from '../../navigation/types';
import { api } from '../../services/api/endpoints';
import { useLocationStore } from '../../stores/locationStore';
import { errorKey, useLocale } from '../../utils/localize';

export function CityPickerScreen({ navigation }: RootScreenProps<'CityPicker'>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const locale = useLocale();
  const setPlace = useLocationStore((s) => s.setPlace);
  const [query, setQuery] = useState('');
  const term = useDeferredValue(query.trim());

  const search = useQuery({
    queryKey: ['cities', term, locale],
    queryFn: () => api.searchCities(term, locale),
    enabled: term.length >= 2 && isApiConfigured,
    staleTime: 24 * 60 * 60 * 1000,
    retry: 1,
  });

  return (
    <Screen scroll={false}>
      <View style={styles.box}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t('prayer.cityPlaceholder')}
          placeholderTextColor={theme.muted}
          accessibilityLabel={t('prayer.chooseCity')}
          autoFocus
          style={[
            styles.input,
            { color: theme.textPrimary, borderColor: theme.border, backgroundColor: theme.surface },
          ]}
        />
        {!isApiConfigured ? <Notice tone="warning">{t('errors.api_not_configured')}</Notice> : null}
      </View>
      {search.isFetching ? (
        <LoadingState />
      ) : search.isError ? (
        <MessageState
          tone="error"
          title={t(errorKey(search.error))}
          message={t('prayer.citySearchOffline')}
          actionLabel={t('common.retry')}
          onAction={() => void search.refetch()}
        />
      ) : search.data && search.data.length === 0 ? (
        <MessageState title={t('prayer.noCityFound')} />
      ) : (
        <FlatList
          data={search.data ?? []}
          keyExtractor={(c) => `${c.latitude},${c.longitude}`}
          renderItem={({ item }) => (
            <ListRow
              title={item.name}
              subtitle={item.displayName}
              onPress={() => {
                setPlace({
                  name: item.name,
                  country: item.country,
                  latitude: item.latitude,
                  longitude: item.longitude,
                  source: 'search',
                });
                navigation.goBack();
              }}
            />
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  box: { padding: spacing.lg, gap: spacing.sm },
  input: {
    minHeight: MIN_TOUCH,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    fontSize: 17,
  },
});
