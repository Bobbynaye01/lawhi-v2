import { formatMRU, isFinalStatus, type DonationStatus } from '@lawhi/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, View } from 'react-native';
import { confirmAsync } from '../../components/ActionSheet';
import { FormField } from '../../components/FormField';
import { AppText, Button, Card, LoadingState, MessageState, Notice, Screen, SectionTitle } from '../../components/ui';
import { spacing } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';
import type { RootScreenProps } from '../../navigation/types';
import { api } from '../../services/api/endpoints';
import { errorKey, formatDateTime, localized, useLocale } from '../../utils/localize';

const MAX_PROOF_BYTES = 5 * 1024 * 1024;

export function statusColor(status: DonationStatus, theme: ReturnType<typeof useTheme>) {
  return status === 'confirmed' ? theme.success : status === 'rejected' || status === 'cancelled' ? theme.danger : theme.warning;
}

interface PickedFile {
  uri: string;
  name: string;
  type: string;
  size?: number;
  webFile?: Blob;
}

function toFormData(file: PickedFile): FormData {
  const form = new FormData();
  if (Platform.OS === 'web' && file.webFile) form.append('file', file.webFile, file.name);
  // React Native's FormData accepts { uri, name, type } for local files.
  else form.append('file', { uri: file.uri, name: file.name, type: file.type } as unknown as Blob);
  return form;
}

export function DonationDetailScreen({ route }: RootScreenProps<'DonationDetail'>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const locale = useLocale();
  const queryClient = useQueryClient();
  const id = route.params.donationId;
  const donation = useQuery({ queryKey: ['donations', 'detail', id], queryFn: () => api.donation(id) });
  const [reference, setReference] = useState('');
  const [fileError, setFileError] = useState<string | null>(null);

  const onUpdated = (data: Awaited<ReturnType<typeof api.donation>>) => {
    queryClient.setQueryData(['donations', 'detail', id], data);
    void queryClient.invalidateQueries({ queryKey: ['donations', 'mine'] });
  };
  const submitReference = useMutation({ mutationFn: (ref: string) => api.submitReference(id, ref), onSuccess: onUpdated });
  const uploadProof = useMutation({ mutationFn: (file: PickedFile) => api.uploadProof(id, toFormData(file)), onSuccess: onUpdated });
  const cancel = useMutation({ mutationFn: () => api.cancelDonation(id), onSuccess: onUpdated });

  if (donation.isPending) return <LoadingState />;
  if (donation.isError) {
    return (
      <MessageState
        tone="error"
        title={t(errorKey(donation.error))}
        actionLabel={t('common.retry')}
        onAction={() => void donation.refetch()}
      />
    );
  }

  const d = donation.data;
  const open = !isFinalStatus(d.status);

  const send = (file: PickedFile) => {
    setFileError(null);
    if (file.size && file.size > MAX_PROOF_BYTES) return setFileError(t('errors.proof_too_large'));
    uploadProof.mutate(file);
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
    const asset = result.canceled ? null : result.assets[0];
    if (!asset) return;
    send({
      uri: asset.uri,
      name: asset.fileName ?? 'preuve.jpg',
      type: asset.mimeType ?? 'image/jpeg',
      size: asset.fileSize,
      webFile: asset.file,
    });
  };

  const pickPdf = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', copyToCacheDirectory: true });
    const asset = result.canceled ? null : result.assets[0];
    if (!asset) return;
    send({ uri: asset.uri, name: asset.name, type: asset.mimeType ?? 'application/pdf', size: asset.size, webFile: asset.file });
  };

  const askCancel = async () => {
    const ok = await confirmAsync({
      title: t('donations.cancelTitle'),
      message: t('donations.cancelMessage'),
      confirm: t('donations.cancelConfirm'),
      cancel: t('common.back'),
      destructive: true,
    });
    if (ok) cancel.mutate();
  };

  const busyError = submitReference.error ?? uploadProof.error ?? cancel.error;

  return (
    <Screen>
      <Card style={{ borderColor: statusColor(d.status, theme), borderWidth: 2 }}>
        <AppText variant="small">{t('donations.statusLabel')}</AppText>
        <AppText variant="title" style={{ color: statusColor(d.status, theme) }}>
          {t(`donations.status.${d.status}`)}
        </AppText>
        <AppText>{t(`donations.statusHelp.${d.status}`)}</AppText>
        {d.status === 'rejected' && d.rejectionReason ? (
          <AppText variant="muted">{t('donations.rejectionReason', { reason: d.rejectionReason })}</AppText>
        ) : null}
      </Card>

      <Card>
        <AppText variant="heading">{formatMRU(d.amount)}</AppText>
        <AppText>{localized(d.cause, 'title', locale)}</AppText>
        <AppText variant="muted">{t('donations.code', { code: d.code })}</AppText>
        <AppText variant="small">{t('donations.codeHint')}</AppText>
        <AppText variant="muted">
          {d.paymentMethod.name}
          {d.paymentMethod.phoneNumber ? ` · ${d.paymentMethod.phoneNumber}` : ''}
        </AppText>
        <AppText variant="small">{formatDateTime(d.createdAt, locale)}</AppText>
        {d.reference ? <AppText variant="small">{t('donations.referenceValue', { reference: d.reference })}</AppText> : null}
        {d.hasProof ? <AppText variant="small" style={{ color: theme.success }}>{t('donations.proofReceived')}</AppText> : null}
      </Card>

      {open ? (
        <>
          <SectionTitle>{t('donations.addProofTitle')}</SectionTitle>
          <AppText variant="small">{t('donations.addProofHint')}</AppText>
          <View style={{ gap: spacing.sm }}>
            <FormField
              label={t('donations.reference')}
              value={reference}
              onChangeText={setReference}
              autoCapitalize="characters"
              hint={t('donations.referenceHint')}
            />
            <Button
              title={t('donations.sendReference')}
              variant="secondary"
              disabled={reference.trim().length < 3}
              loading={submitReference.isPending}
              onPress={() => submitReference.mutate(reference.trim())}
            />
            <Button title={t('donations.attachImage')} variant="secondary" loading={uploadProof.isPending} onPress={() => void pickImage()} />
            <Button title={t('donations.attachPdf')} variant="secondary" loading={uploadProof.isPending} onPress={() => void pickPdf()} />
          </View>
          {fileError ? <Notice tone="warning">{fileError}</Notice> : null}
          {busyError ? <Notice tone="warning">{t(errorKey(busyError))}</Notice> : null}
          <Button title={t('donations.cancelDonation')} variant="danger" loading={cancel.isPending} onPress={() => void askCancel()} />
        </>
      ) : null}
    </Screen>
  );
}
