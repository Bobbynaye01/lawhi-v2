import { formatMRU } from '@lawhi/shared';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { FlatList } from 'react-native';
import { AppText, ListRow, LoadingState, MessageState, Screen } from '../../components/ui';
import { useTheme } from '../../hooks/useTheme';
import type { RootScreenProps } from '../../navigation/types';
import { api } from '../../services/api/endpoints';
import { errorKey, formatDateTime, localized, useLocale } from '../../utils/localize';
import { statusColor } from './DonationDetailScreen';

export function MyDonationsScreen({ navigation }: RootScreenProps<'MyDonations'>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const locale = useLocale();
  const donations = useQuery({ queryKey: ['donations', 'mine'], queryFn: api.myDonations });

  if (donations.isPending) return <LoadingState />;
  if (donations.isError) {
    return (
      <MessageState
        tone="error"
        title={t(errorKey(donations.error))}
        actionLabel={t('common.retry')}
        onAction={() => void donations.refetch()}
      />
    );
  }
  if (donations.data.length === 0) return <MessageState title={t('donations.noDonations')} />;

  return (
    <Screen scroll={false}>
      <FlatList
        data={donations.data}
        keyExtractor={(d) => d.id}
        onRefresh={() => void donations.refetch()}
        refreshing={donations.isRefetching}
        renderItem={({ item }) => (
          <ListRow
            title={`${formatMRU(item.amount)} · ${localized(item.cause, 'title', locale)}`}
            subtitle={`${item.code} · ${formatDateTime(item.createdAt, locale)}`}
            trailing={<AppText style={{ color: statusColor(item.status, theme) }}>{t(`donations.status.${item.status}`)}</AppText>}
            onPress={() => navigation.navigate('DonationDetail', { donationId: item.id })}
          />
        )}
      />
    </Screen>
  );
}
