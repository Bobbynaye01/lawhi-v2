import { createDonationSchema, formatMRU, MAX_DONATION_AMOUNT } from '@lawhi/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { FormField } from '../../components/FormField';
import {
  AppText,
  Button,
  Card,
  LoadingState,
  MessageState,
  Notice,
  Screen,
  SectionTitle,
} from '../../components/ui';
import { MIN_TOUCH, radius, spacing } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';
import type { RootScreenProps } from '../../navigation/types';
import { api } from '../../services/api/endpoints';
import { errorKey, localized, useLocale } from '../../utils/localize';

export function DonationFormScreen({ route, navigation }: RootScreenProps<'DonationForm'>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const locale = useLocale();
  const queryClient = useQueryClient();
  const causes = useQuery({ queryKey: ['donations', 'causes'], queryFn: api.causes });
  const methods = useQuery({ queryKey: ['donations', 'methods'], queryFn: api.paymentMethods });
  const config = useQuery({ queryKey: ['config'], queryFn: api.publicConfig });

  const [methodId, setMethodId] = useState<string | null>(null);
  const [amountText, setAmountText] = useState('');
  const [donorName, setDonorName] = useState('');
  const [donorPhone, setDonorPhone] = useState('');
  const [reference, setReference] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);

  const create = useMutation({
    mutationFn: api.createDonation,
    onSuccess: (donation) => {
      void queryClient.invalidateQueries({ queryKey: ['donations'] });
      navigation.replace('DonationDetail', { donationId: donation.id });
    },
  });

  if (causes.isPending || methods.isPending || config.isPending) return <LoadingState />;
  if (methods.isError || causes.isError) {
    return (
      <MessageState
        tone="error"
        title={t(errorKey(methods.error ?? causes.error))}
        message={t('donations.needsInternet')}
        actionLabel={t('common.retry')}
        onAction={() => {
          void methods.refetch();
          void causes.refetch();
        }}
      />
    );
  }

  const cause = causes.data.find((c) => c.id === route.params.causeId);
  if (!cause) return <MessageState title={t('errors.cause_unavailable')} />;
  if (methods.data.length === 0) {
    return (
      <Screen>
        <Notice tone="warning">{t('donations.noPaymentMethod')}</Notice>
      </Screen>
    );
  }

  const presets = config.data?.donations.presets ?? [];
  const method = methods.data.find((m) => m.id === methodId) ?? null;
  const amount = Number(amountText.replace(/\s/g, ''));

  const submit = () => {
    const parsed = createDonationSchema.safeParse({
      causeId: cause.id,
      paymentMethodId: methodId ?? '',
      amount,
      donorName: donorName.trim() || undefined,
      donorPhone: donorPhone.trim() || undefined,
      reference: reference.trim() || undefined,
    });
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const field = String(issue.path[0]);
        next[field] ??= t(`donations.errors.${field}`, { max: formatMRU(MAX_DONATION_AMOUNT) });
      }
      setErrors(next);
      return;
    }
    setErrors({});
    create.mutate(parsed.data);
  };

  return (
    <Screen>
      <AppText variant="heading">{localized(cause, 'title', locale)}</AppText>

      <SectionTitle>{t('donations.step1')}</SectionTitle>
      <View style={styles.wrap} accessibilityRole="radiogroup">
        {methods.data.map((m) => (
          <Pressable
            key={m.id}
            accessibilityRole="radio"
            accessibilityState={{ selected: m.id === methodId }}
            onPress={() => setMethodId(m.id)}
            style={[
              styles.chip,
              {
                borderColor: m.id === methodId ? theme.primary : theme.border,
                backgroundColor: m.id === methodId ? theme.primary : theme.surface,
              },
            ]}
          >
            <AppText style={{ color: m.id === methodId ? theme.onPrimary : theme.textPrimary }}>
              {m.name}
            </AppText>
          </Pressable>
        ))}
      </View>
      {errors.paymentMethodId ? (
        <AppText variant="small" style={{ color: theme.danger }}>
          {errors.paymentMethodId}
        </AppText>
      ) : null}

      {method ? (
        <Card>
          <AppText variant="small">{t('donations.sendTo', { method: method.name })}</AppText>
          <AppText variant="title" selectable style={{ fontVariant: ['tabular-nums'] }}>
            {method.phoneNumber}
          </AppText>
          <Button
            title={copied ? t('donations.copied') : t('donations.copyNumber')}
            variant="secondary"
            onPress={async () => {
              await Clipboard.setStringAsync(method.phoneNumber);
              setCopied(true);
            }}
          />
          {method.instructions ? <AppText variant="muted">{method.instructions}</AppText> : null}
        </Card>
      ) : null}

      <SectionTitle>{t('donations.step2')}</SectionTitle>
      <View style={styles.wrap}>
        {presets.map((p) => (
          <Pressable
            key={p}
            accessibilityRole="button"
            accessibilityState={{ selected: amount === p }}
            onPress={() => setAmountText(String(p))}
            style={[
              styles.chip,
              {
                borderColor: amount === p ? theme.primary : theme.border,
                backgroundColor: amount === p ? theme.surfaceSunken : theme.surface,
              },
            ]}
          >
            <AppText>{formatMRU(p)}</AppText>
          </Pressable>
        ))}
      </View>
      <FormField
        label={t('donations.amountLabel')}
        value={amountText}
        onChangeText={(v) => setAmountText(v.replace(/[^\d\s]/g, ''))}
        keyboardType="number-pad"
        error={errors.amount}
        hint={amount > 0 ? formatMRU(amount) : t('donations.amountHint')}
      />

      <SectionTitle>{t('donations.step3')}</SectionTitle>
      <AppText variant="small">{t('donations.optionalInfo')}</AppText>
      <FormField
        label={t('donations.donorName')}
        value={donorName}
        onChangeText={setDonorName}
        error={errors.donorName}
        autoComplete="name"
      />
      <FormField
        label={t('donations.donorPhone')}
        value={donorPhone}
        onChangeText={setDonorPhone}
        keyboardType="phone-pad"
        error={errors.donorPhone}
        hint={t('donations.phoneHint')}
      />
      <FormField
        label={t('donations.reference')}
        value={reference}
        onChangeText={setReference}
        autoCapitalize="characters"
        error={errors.reference}
        hint={t('donations.referenceHint')}
      />

      {create.isError ? <Notice tone="warning">{t(errorKey(create.error))}</Notice> : null}
      <Notice>{t('donations.pendingExplanation')}</Notice>
      <Button title={t('donations.submit')} loading={create.isPending} onPress={submit} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    minHeight: MIN_TOUCH,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    justifyContent: 'center',
  },
});
