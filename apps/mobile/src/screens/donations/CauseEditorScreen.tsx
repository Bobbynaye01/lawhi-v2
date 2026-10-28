import { CAUSE_STATUSES, slugify } from '@lawhi/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { useLayoutEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Image, Platform, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FormField } from '../../components/FormField';
import { Button, LawhiText, LoadingState, Segmented, Surface } from '../../components/ui';
import { radius, spacing } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';
import type { RootScreenProps } from '../../navigation/types';
import { api, mediaUrl, type Cause, type CauseInput } from '../../services/api/endpoints';
import { errorKey } from '../../utils/localize';
import { ADMIN_CAUSES_KEY } from './SadaqaAdminScreen';

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const TEXT_FIELDS = [
  'titleFr',
  'titleAr',
  'titleEn',
  'descriptionFr',
  'descriptionAr',
  'descriptionEn',
] as const;

const EMPTY: CauseInput = {
  titleFr: '',
  titleAr: '',
  titleEn: '',
  descriptionFr: '',
  descriptionAr: '',
  descriptionEn: '',
  status: 'ongoing',
  eventDate: null,
  goalAmount: null,
  collectedAmount: 0,
  featured: false,
  active: true,
  sortOrder: 0,
};

function toInput(cause: Cause): CauseInput {
  return {
    titleFr: cause.titleFr,
    titleAr: cause.titleAr,
    titleEn: cause.titleEn,
    descriptionFr: cause.descriptionFr,
    descriptionAr: cause.descriptionAr,
    descriptionEn: cause.descriptionEn,
    status: cause.status,
    eventDate: cause.eventDate ? cause.eventDate.slice(0, 10) : null,
    goalAmount: cause.goalAmount,
    collectedAmount: cause.collectedAmount,
    featured: cause.featured,
    active: cause.active,
    sortOrder: cause.sortOrder,
  };
}

function isValidDay(text: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return false;
  const date = new Date(`${text}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(text);
}

function digitsOrNull(text: string): number | null {
  const digits = text.replace(/\D/g, '');
  return digits ? Number(digits) : null;
}

/** A unique slug: the French title, plus a short suffix so two projects never collide. */
function newSlug(titleFr: string): string {
  const base = slugify(titleFr).slice(0, 52) || 'projet';
  return `${base}-${Date.now().toString(36).slice(-6)}`;
}

function ToggleRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  const theme = useTheme();
  return (
    <View style={styles.toggle}>
      <LawhiText variant="bodyStrong" style={{ flex: 1 }}>
        {label}
      </LawhiText>
      <Switch
        value={value}
        onValueChange={onChange}
        accessibilityLabel={label}
        trackColor={{ true: theme.primary, false: theme.border }}
        thumbColor={Platform.OS === 'android' ? theme.surfaceElevated : undefined}
      />
    </View>
  );
}

export function CauseEditorScreen({ navigation, route }: RootScreenProps<'CauseEditor'>) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const causeId = route.params.causeId;
  const causes = useQuery({ queryKey: ADMIN_CAUSES_KEY, queryFn: api.admin.causes });
  const cause = causeId ? causes.data?.find((c) => c.id === causeId) : undefined;

  useLayoutEffect(() => {
    navigation.setOptions({
      title: causeId ? t('donations.admin.editProject') : t('donations.admin.newProject'),
    });
  }, [navigation, causeId, t]);

  if (causeId && causes.isPending) return <LoadingState />;
  return (
    <CauseForm
      key={cause?.id ?? 'new'}
      cause={cause}
      onSaved={(saved, created) => {
        void queryClient.invalidateQueries({ queryKey: ADMIN_CAUSES_KEY });
        void queryClient.invalidateQueries({ queryKey: ['donations', 'causes'] });
        // A new project can receive its image right away.
        if (created) navigation.setParams({ causeId: saved.id });
      }}
      onDeleted={() => {
        void queryClient.invalidateQueries({ queryKey: ADMIN_CAUSES_KEY });
        void queryClient.invalidateQueries({ queryKey: ['donations', 'causes'] });
        navigation.goBack();
      }}
    />
  );
}

function CauseForm({
  cause,
  onSaved,
  onDeleted,
}: {
  cause: Cause | undefined;
  onSaved: (cause: Cause, created: boolean) => void;
  onDeleted: () => void;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<CauseInput>(cause ? toInput(cause) : EMPTY);
  const [dateText, setDateText] = useState(form.eventDate ?? '');
  const [imageError, setImageError] = useState<string | null>(null);
  const set = <K extends keyof CauseInput>(key: K, value: CauseInput[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const textsMissing = TEXT_FIELDS.some((k) => form[k].trim().length < 2);
  const dateInvalid = dateText !== '' && !isValidDay(dateText);

  const save = useMutation({
    mutationFn: async (input: CauseInput) =>
      cause
        ? { saved: await api.admin.updateCause(cause.id, input), created: false }
        : {
            saved: await api.admin.createCause({ ...input, slug: newSlug(input.titleFr) }),
            created: true,
          },
    onSuccess: ({ saved, created }) => onSaved(saved, created),
  });
  const image = useMutation({
    mutationFn: async (asset: ImagePicker.ImagePickerAsset | null) => {
      if (!cause) throw new Error('cause_not_found');
      if (!asset) return api.admin.removeCauseImage(cause.id);
      const data = new FormData();
      if (Platform.OS === 'web' && asset.file)
        data.append('file', asset.file, asset.fileName ?? 'image.jpg');
      // React Native's FormData accepts { uri, name, type } for local files.
      else
        data.append('file', {
          uri: asset.uri,
          name: asset.fileName ?? 'image.jpg',
          type: asset.mimeType ?? 'image/jpeg',
        } as unknown as Blob);
      return api.admin.uploadCauseImage(cause.id, data);
    },
    onSuccess: (saved) => {
      queryClient.setQueryData<Cause[]>(ADMIN_CAUSES_KEY, (list) =>
        list?.map((c) => (c.id === saved.id ? saved : c)),
      );
      void queryClient.invalidateQueries({ queryKey: ['donations', 'causes'] });
    },
  });
  const remove = useMutation({
    mutationFn: () => api.admin.deleteCause(cause!.id),
    onSuccess: (result) => {
      if (result.archived) Alert.alert(t('donations.admin.archived'));
      onDeleted();
    },
  });

  const pickImage = async () => {
    setImageError(null);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsEditing: true,
      aspect: [16, 9],
    });
    const asset = result.canceled ? null : result.assets[0];
    if (!asset) return;
    if (asset.fileSize && asset.fileSize > MAX_IMAGE_BYTES) {
      return setImageError(t('errors.image_too_large'));
    }
    image.mutate(asset);
  };

  const confirmDelete = () =>
    Alert.alert(t('donations.admin.deleteTitle'), t('donations.admin.deleteMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('donations.admin.delete'), style: 'destructive', onPress: () => remove.mutate() },
    ]);

  const mutationError = save.error ?? image.error ?? remove.error;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxl }]}
      keyboardShouldPersistTaps="handled"
    >
      <Surface style={styles.card}>
        <FormField
          label={t('donations.admin.titleFr')}
          value={form.titleFr}
          onChangeText={(v) => set('titleFr', v)}
        />
        <FormField
          label={t('donations.admin.titleAr')}
          value={form.titleAr}
          onChangeText={(v) => set('titleAr', v)}
          style={{ textAlign: 'right', writingDirection: 'rtl' }}
        />
        <FormField
          label={t('donations.admin.titleEn')}
          value={form.titleEn}
          onChangeText={(v) => set('titleEn', v)}
        />
        <FormField
          label={t('donations.admin.descriptionFr')}
          value={form.descriptionFr}
          onChangeText={(v) => set('descriptionFr', v)}
          multiline
          style={styles.multiline}
        />
        <FormField
          label={t('donations.admin.descriptionAr')}
          value={form.descriptionAr}
          onChangeText={(v) => set('descriptionAr', v)}
          multiline
          style={[styles.multiline, { textAlign: 'right', writingDirection: 'rtl' }]}
        />
        <FormField
          label={t('donations.admin.descriptionEn')}
          value={form.descriptionEn}
          onChangeText={(v) => set('descriptionEn', v)}
          multiline
          style={styles.multiline}
        />
      </Surface>

      <Surface style={styles.card}>
        <LawhiText variant="bodyStrong">{t('donations.admin.status')}</LawhiText>
        <Segmented
          label={t('donations.admin.status')}
          value={form.status}
          onChange={(status) => set('status', status)}
          options={CAUSE_STATUSES.map((s) => ({
            value: s,
            label: t(`donations.causeStatus.${s}`),
          }))}
        />
        <FormField
          label={t('donations.admin.eventDate')}
          value={dateText}
          onChangeText={(v) => {
            setDateText(v.trim());
            set('eventDate', isValidDay(v.trim()) ? v.trim() : null);
          }}
          placeholder="2026-12-20"
          keyboardType="numbers-and-punctuation"
          hint={t('donations.admin.eventDateHint')}
          error={dateInvalid ? t('donations.admin.invalidDate') : null}
        />
        <FormField
          label={t('donations.admin.goal')}
          value={form.goalAmount === null ? '' : String(form.goalAmount)}
          onChangeText={(v) => set('goalAmount', digitsOrNull(v))}
          keyboardType="number-pad"
        />
        <FormField
          label={t('donations.admin.collected')}
          value={String(form.collectedAmount)}
          onChangeText={(v) => set('collectedAmount', digitsOrNull(v) ?? 0)}
          keyboardType="number-pad"
        />
        <ToggleRow
          label={t('donations.admin.visible')}
          value={form.active}
          onChange={(v) => set('active', v)}
        />
        <ToggleRow
          label={t('donations.admin.featured')}
          value={form.featured}
          onChange={(v) => set('featured', v)}
        />
      </Surface>

      <Surface style={styles.card}>
        <LawhiText variant="bodyStrong">{t('donations.admin.image')}</LawhiText>
        {cause?.imageUrl ? (
          <Image
            source={{ uri: mediaUrl(cause.imageUrl) }}
            style={[styles.preview, { backgroundColor: theme.surfaceSunken }]}
            resizeMode="cover"
          />
        ) : null}
        <LawhiText variant="caption" tone="secondary">
          {t('donations.admin.imageHint')}
        </LawhiText>
        {cause ? (
          <View style={styles.actions}>
            <Button
              title={
                cause.imageUrl ? t('donations.admin.changeImage') : t('donations.admin.addImage')
              }
              icon="image"
              variant="secondary"
              loading={image.isPending}
              onPress={() => void pickImage()}
            />
            {cause.imageUrl ? (
              <Button
                title={t('donations.admin.removeImage')}
                variant="ghost"
                disabled={image.isPending}
                onPress={() => image.mutate(null)}
              />
            ) : null}
          </View>
        ) : null}
        {imageError ? (
          <LawhiText variant="caption" style={{ color: theme.danger }}>
            {imageError}
          </LawhiText>
        ) : null}
      </Surface>

      <View accessibilityLiveRegion="polite" style={{ gap: spacing.xs }}>
        {textsMissing ? (
          <LawhiText variant="caption" tone="secondary">
            {t('donations.admin.textsRequired')}
          </LawhiText>
        ) : null}
        {mutationError ? (
          <LawhiText variant="caption" style={{ color: theme.danger }}>
            {t(errorKey(mutationError))}
          </LawhiText>
        ) : save.isSuccess ? (
          <LawhiText variant="caption" style={{ color: theme.success }}>
            {t('donations.admin.saved')}
          </LawhiText>
        ) : null}
      </View>
      <Button
        title={cause ? t('donations.admin.save') : t('donations.admin.create')}
        disabled={textsMissing || dateInvalid}
        loading={save.isPending}
        onPress={() => save.mutate(form)}
      />
      {cause ? (
        <Button
          title={t('donations.admin.delete')}
          icon="trash"
          variant="danger"
          loading={remove.isPending}
          onPress={confirmDelete}
        />
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.md },
  card: { borderRadius: radius.xl, gap: spacing.md },
  multiline: { minHeight: 96, textAlignVertical: 'top', paddingTop: spacing.sm },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 44 },
  preview: { width: '100%', aspectRatio: 16 / 9, borderRadius: radius.md },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
