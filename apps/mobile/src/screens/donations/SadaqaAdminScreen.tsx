import { formatMRU, normalizeMauritanianPhone } from '@lawhi/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusPill } from '../../components/donations/CauseCard';
import { FormField } from '../../components/FormField';
import {
  Button,
  LawhiText,
  ListRow,
  LoadingState,
  MessageState,
  SectionHeader,
  Surface,
} from '../../components/ui';
import { radius, spacing } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';
import type { RootScreenProps } from '../../navigation/types';
import { api } from '../../services/api/endpoints';
import { errorKey } from '../../utils/localize';
import { useIsAdmin } from './DonationsScreen';

export const ADMIN_CAUSES_KEY = ['admin', 'causes'] as const;

/** Balance, Bankily number and projects — visible to admins only, enforced by the API. */
export function SadaqaAdminScreen({ navigation }: RootScreenProps<'SadaqaAdmin'>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const isAdmin = useIsAdmin();
  const summary = useQuery({ queryKey: ['donations', 'summary'], queryFn: api.donationSummary });
  const causes = useQuery({ queryKey: ADMIN_CAUSES_KEY, queryFn: api.admin.causes });
  const [total, setTotal] = useState<string | null>(null);
  const [phone, setPhone] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: api.admin.updateSummary,
    onSuccess: (data) => {
      queryClient.setQueryData(['donations', 'summary'], data);
      setTotal(null);
      setPhone(null);
    },
  });

  if (summary.isPending || causes.isPending) return <LoadingState />;
  if (causes.isError && !causes.data) {
    return (
      <MessageState
        tone="error"
        title={t(errorKey(causes.error))}
        actionLabel={t('common.retry')}
        onAction={() => void causes.refetch()}
      />
    );
  }
  if (!isAdmin) return <MessageState tone="error" title={t('errors.forbidden')} />;

  const totalText = total ?? String(summary.data?.totalAmount ?? '');
  const phoneText = phone ?? summary.data?.bankilyPhone ?? '';
  const totalValue = totalText ? Number(totalText) : null;
  const phoneValue = normalizeMauritanianPhone(phoneText);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxl }]}
      keyboardShouldPersistTaps="handled"
    >
      <SectionHeader title={t('donations.admin.summaryTitle')} />
      <Surface style={styles.card}>
        <FormField
          label={t('donations.admin.totalLabel')}
          value={totalText}
          onChangeText={(v) => setTotal(v.replace(/\D/g, ''))}
          keyboardType="number-pad"
          hint={totalValue !== null ? formatMRU(totalValue) : undefined}
        />
        <Button
          title={t('donations.admin.saveTotal')}
          disabled={totalValue === null}
          loading={save.isPending && save.variables?.totalAmount !== undefined}
          onPress={() => totalValue !== null && save.mutate({ totalAmount: totalValue })}
        />
        <View style={[styles.divider, { backgroundColor: theme.divider }]} />
        <FormField
          label={t('donations.admin.bankilyLabel')}
          value={phoneText}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          placeholder="22 33 44 55"
          error={phoneText && !phoneValue ? t('donations.errors.donorPhone') : null}
        />
        <Button
          title={t('donations.admin.saveNumber')}
          variant="secondary"
          disabled={!phoneValue}
          loading={save.isPending && save.variables?.bankilyPhone !== undefined}
          onPress={() => phoneValue && save.mutate({ bankilyPhone: phoneValue })}
        />
        <View accessibilityLiveRegion="polite">
          {save.isError ? (
            <LawhiText variant="caption" style={{ color: theme.danger }}>
              {t(errorKey(save.error))}
            </LawhiText>
          ) : save.isSuccess ? (
            <LawhiText variant="caption" style={{ color: theme.success }}>
              {t('donations.admin.saved')}
            </LawhiText>
          ) : null}
        </View>
      </Surface>

      <SectionHeader
        title={t('donations.admin.projects')}
        action={t('donations.admin.newProject')}
        onAction={() => navigation.navigate('CauseEditor', {})}
      />
      <Surface padded={false} style={{ overflow: 'hidden', borderRadius: radius.lg }}>
        {causes.data.map((cause) => (
          <ListRow
            key={cause.id}
            title={cause.titleFr}
            subtitle={cause.active ? undefined : t('donations.admin.hidden')}
            trailing={<StatusPill status={cause.status} />}
            onPress={() => navigation.navigate('CauseEditor', { causeId: cause.id })}
          />
        ))}
      </Surface>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.md },
  card: { borderRadius: radius.xl, gap: spacing.md },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: spacing.xs },
});
