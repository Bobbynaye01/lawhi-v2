import type { CauseStatus } from '@lawhi/shared';
import { useFocusEffect } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { useCallback, useLayoutEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BalanceCard } from '../../components/donations/BalanceCard';
import { BankilyBlock } from '../../components/donations/BankilyBlock';
import { CauseCard } from '../../components/donations/CauseCard';
import {
  LawhiText,
  LoadingState,
  MessageState,
  Notice,
  SectionHeader,
  Tappable,
} from '../../components/ui';
import { MIN_TOUCH, spacing } from '../../constants/theme';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import type { RootScreenProps } from '../../navigation/types';
import { api } from '../../services/api/endpoints';
import { errorKey } from '../../utils/localize';

/** Shared by every viewer: refreshed often so all donors see the same figures. */
const REFRESH_MS = 30_000;
const STATUS_ORDER: Record<CauseStatus, number> = { ongoing: 0, upcoming: 1, completed: 2 };

export function useIsAdmin(): boolean {
  const auth = useAuth();
  const me = useQuery({
    queryKey: ['me', auth.session?.user.id],
    queryFn: api.me,
    enabled: Boolean(auth.session),
    staleTime: 5 * 60_000,
  });
  return me.data?.role === 'admin';
}

export function DonationsScreen({ navigation }: RootScreenProps<'Donations'>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const isAdmin = useIsAdmin();
  const summary = useQuery({
    queryKey: ['donations', 'summary'],
    queryFn: api.donationSummary,
    refetchInterval: REFRESH_MS,
  });
  const causes = useQuery({
    queryKey: ['donations', 'causes'],
    queryFn: api.causes,
    refetchInterval: REFRESH_MS,
  });

  useFocusEffect(
    useCallback(() => {
      void summary.refetch();
      void causes.refetch();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: isAdmin
        ? () => (
            <Tappable
              accessibilityRole="button"
              onPress={() => navigation.navigate('SadaqaAdmin')}
              style={{
                minHeight: MIN_TOUCH,
                justifyContent: 'center',
                paddingHorizontal: spacing.sm,
              }}
            >
              <LawhiText variant="bodyStrong" tone="brand">
                {t('donations.admin.manage')}
              </LawhiText>
            </Tappable>
          )
        : undefined,
    });
  }, [navigation, isAdmin, t]);

  if (summary.isPending || causes.isPending) return <LoadingState />;
  const failed = summary.isError || causes.isError;
  if (failed && !summary.data && !causes.data) {
    return (
      <MessageState
        tone="error"
        title={t(errorKey(summary.error ?? causes.error))}
        message={t('donations.needsInternet')}
        actionLabel={t('common.retry')}
        onAction={() => {
          void summary.refetch();
          void causes.refetch();
        }}
      />
    );
  }

  const ordered = [...(causes.data ?? [])].sort(
    (a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status],
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxl }]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={summary.isRefetching || causes.isRefetching}
          onRefresh={() => {
            void summary.refetch();
            void causes.refetch();
          }}
          tintColor={theme.primary}
          colors={[theme.primary]}
        />
      }
    >
      {failed ? <Notice tone="warning">{t('common.showingCachedData')}</Notice> : null}
      {summary.data ? (
        <>
          <BalanceCard amount={summary.data.totalAmount} updatedAt={summary.data.updatedAt} />
          <BankilyBlock phone={summary.data.bankilyPhone} />
        </>
      ) : null}

      <View style={{ gap: spacing.md }}>
        <SectionHeader title={t('donations.projects')} />
        {ordered.length === 0 ? (
          <LawhiText tone="secondary">{t('donations.noCauses')}</LawhiText>
        ) : (
          ordered.map((cause) => <CauseCard key={cause.id} cause={cause} />)
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.lg },
});
