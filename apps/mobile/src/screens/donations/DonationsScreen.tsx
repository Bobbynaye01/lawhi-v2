import { formatMRU } from '@lawhi/shared';
import { useQuery } from '@tanstack/react-query';
import { useLayoutEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import {
  AppText,
  Button,
  Card,
  LoadingState,
  MessageState,
  Notice,
  Screen,
} from '../../components/ui';
import { MIN_TOUCH, radius, spacing } from '../../constants/theme';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import type { RootScreenProps } from '../../navigation/types';
import { api } from '../../services/api/endpoints';
import { errorKey, localized, useLocale } from '../../utils/localize';

export function DonationsScreen({ navigation }: RootScreenProps<'Donations'>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const locale = useLocale();
  const auth = useAuth();
  const causes = useQuery({ queryKey: ['donations', 'causes'], queryFn: api.causes });

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable
          accessibilityRole="button"
          onPress={() =>
            auth.session
              ? navigation.navigate('MyDonations')
              : navigation.navigate('SignIn', { redirect: 'MyDonations' })
          }
          style={{ minHeight: MIN_TOUCH, justifyContent: 'center', paddingHorizontal: spacing.sm }}
        >
          <AppText style={{ color: theme.primary }}>{t('donations.myDonations')}</AppText>
        </Pressable>
      ),
    });
  }, [navigation, auth.session, t, theme.primary]);

  if (causes.isPending) return <LoadingState />;
  if (causes.isError && !causes.data) {
    return (
      <MessageState
        tone="error"
        title={t(errorKey(causes.error))}
        message={t('donations.needsInternet')}
        actionLabel={t('common.retry')}
        onAction={() => void causes.refetch()}
      />
    );
  }

  const donate = (causeId: string) => {
    if (auth.session) navigation.navigate('DonationForm', { causeId });
    else navigation.navigate('SignIn', { redirect: 'Donations' });
  };

  return (
    <Screen>
      <Notice>{t('donations.howItWorks')}</Notice>
      {causes.isError ? <Notice tone="warning">{t('common.showingCachedData')}</Notice> : null}
      {causes.data.length === 0 ? <MessageState title={t('donations.noCauses')} /> : null}
      {causes.data.map((cause) => {
        const progress = cause.goalAmount
          ? Math.min(1, cause.confirmedAmount / cause.goalAmount)
          : null;
        return (
          <Card
            key={cause.id}
            style={cause.featured ? { borderColor: theme.accent, borderWidth: 2 } : undefined}
          >
            {cause.featured ? (
              <AppText variant="small" style={{ color: theme.accent }}>
                {t('donations.featured')}
              </AppText>
            ) : null}
            <AppText variant="heading">{localized(cause, 'title', locale)}</AppText>
            <AppText variant="muted">{localized(cause, 'description', locale)}</AppText>
            {progress !== null ? (
              <View style={{ gap: spacing.xs }}>
                <View style={[styles.track, { backgroundColor: theme.border }]}>
                  <View
                    style={[
                      styles.fill,
                      { backgroundColor: theme.success, width: `${progress * 100}%` },
                    ]}
                  />
                </View>
                <AppText variant="small">
                  {t('donations.collectedOfGoal', {
                    collected: formatMRU(cause.confirmedAmount),
                    goal: formatMRU(cause.goalAmount!),
                  })}
                </AppText>
              </View>
            ) : (
              <AppText variant="small">
                {t('donations.collected', { collected: formatMRU(cause.confirmedAmount) })}
              </AppText>
            )}
            <AppText variant="small">{t('donations.confirmedOnly')}</AppText>
            <Button title={t('donations.donate')} onPress={() => donate(cause.id)} />
          </Card>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  track: { height: 8, borderRadius: radius.pill, overflow: 'hidden' },
  fill: { height: 8 },
});
