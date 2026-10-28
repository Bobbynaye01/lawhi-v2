import type { Verse } from '@lawhi/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, IconButton, LawhiText, ProgressBar, Tappable } from '../../components/ui';
import { radius, spacing } from '../../constants/theme';
import { useIsDark, useTheme } from '../../hooks/useTheme';
import { contentRepository } from '../../repositories/contentRepository';
import { recitation, useRecitationStore } from '../../services/audio/recitationPlayer';
import { useSettingsStore } from '../../stores/settingsStore';
import { localized, useLocale } from '../../utils/localize';

/** Floating recitation capsule: present, but quiet. */
export function PlayerBar({ verses }: { verses: Verse[] }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const dark = useIsDark();
  const locale = useLocale();
  const insets = useSafeAreaInsets();
  const riwaya = useSettingsStore((s) => s.riwaya);
  const reciterId = useSettingsStore((s) => s.reciterByRiwaya[riwaya]);
  const setReciter = useSettingsStore((s) => s.setReciter);
  const { status, error, index, queue, position, duration } = useRecitationStore();
  const [picking, setPicking] = useState(false);

  const reciters = contentRepository.reciters(riwaya);
  const reciter = reciters.find((r) => r.id === reciterId) ?? reciters[0];
  const current = queue[index];
  const capsule = [
    styles.capsule,
    {
      backgroundColor: theme.surfaceElevated,
      borderColor: theme.border,
      marginBottom: Math.max(insets.bottom, spacing.md),
      shadowColor: theme.shadow,
      shadowOpacity: dark ? 0.5 : 0.14,
    },
  ];

  if (!reciter) {
    // Honest state: no verified Warsh recitation is available yet.
    return (
      <View style={[capsule, { paddingHorizontal: spacing.lg, minHeight: 56 }]}>
        <Icon name="volume" size={18} color={theme.muted} />
        <LawhiText variant="caption" tone="secondary" style={{ flex: 1 }}>
          {t('quran.audio.noReciterForRiwaya')}
        </LawhiText>
      </View>
    );
  }

  const caption =
    status === 'error'
      ? t(error === 'network' ? 'quran.audio.networkError' : 'quran.audio.playbackError')
      : current
        ? `${t('quran.verseNumber', { number: current.verse })}${status === 'loading' ? ` · ${t('common.loading')}` : ''}`
        : t('quran.audio.tapToListen');

  return (
    <View style={capsule}>
      <Tappable
        onPress={() => (status === 'idle' ? void recitation.start(reciter, verses, 0) : void recitation.toggle())}
        accessibilityRole="button"
        accessibilityLabel={t(
          status === 'playing' ? 'quran.audio.pause' : status === 'error' ? 'common.retry' : 'quran.audio.play',
        )}
        pressedScale={0.9}
        haptic
        style={[styles.play, { backgroundColor: theme.primary }]}
      >
        <Icon
          name={status === 'playing' ? 'pause' : status === 'error' ? 'reset' : 'play'}
          size={18}
          color={theme.onPrimary}
          filled={status !== 'error'}
        />
      </Tappable>
      <Pressable
        onPress={() => setPicking(true)}
        accessibilityRole="button"
        accessibilityLabel={t('quran.audio.chooseReciter')}
        style={styles.info}
      >
        <LawhiText variant="bodyStrong" numberOfLines={1} style={{ fontSize: 14 }}>
          {localized(reciter, 'name', locale)}
        </LawhiText>
        <LawhiText
          variant="caption"
          tone={status === 'error' ? 'danger' : 'muted'}
          numberOfLines={1}
          style={{ fontSize: 12 }}
        >
          {caption}
        </LawhiText>
        {status !== 'idle' ? (
          <ProgressBar
            value={duration > 0 ? position / duration : 0}
            height={2}
            color={theme.accent}
            style={{ marginTop: 4 }}
          />
        ) : null}
      </Pressable>
      {status !== 'idle' ? (
        <>
          <IconButton icon="previous" label={t('quran.audio.previous')} onPress={() => void recitation.previous()} size={19} />
          <IconButton icon="next" label={t('quran.audio.next')} onPress={() => void recitation.next()} size={19} />
          <IconButton icon="close" label={t('quran.audio.stop')} onPress={() => recitation.stop()} size={19} />
        </>
      ) : (
        <IconButton icon="chevronForward" label={t('quran.audio.chooseReciter')} onPress={() => setPicking(true)} size={18} />
      )}

      <Modal visible={picking} animationType="slide" onRequestClose={() => setPicking(false)}>
        <View style={{ flex: 1, backgroundColor: theme.background, paddingTop: insets.top + spacing.lg }}>
          <View style={styles.pickerHeader}>
            <LawhiText variant="heading" accessibilityRole="header" style={{ flex: 1 }}>
              {t('quran.audio.chooseReciter')}
            </LawhiText>
            <IconButton icon="close" label={t('common.close')} onPress={() => setPicking(false)} />
          </View>
          <FlatList
            data={reciters}
            keyExtractor={(r) => r.id}
            contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}
            renderItem={({ item }) => {
              const selected = item.id === reciter.id;
              return (
                <Tappable
                  onPress={() => {
                    setReciter(riwaya, item.id);
                    setPicking(false);
                    void recitation.changeReciter(item);
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  pressedScale={0.99}
                  style={[styles.reciterRow, { borderBottomColor: theme.divider }]}
                >
                  <View style={{ flex: 1, gap: 2 }}>
                    <LawhiText variant="subtitle">{localized(item, 'name', locale)}</LawhiText>
                    {locale === 'ar' ? null : (
                      <LawhiText variant="caption" tone="secondary">
                        {item.nameAr}
                      </LawhiText>
                    )}
                  </View>
                  {selected ? <Icon name="check" size={20} color={theme.primary} /> : null}
                </Tappable>
              );
            }}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  capsule: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    paddingStart: spacing.sm,
    paddingEnd: spacing.xs,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  play: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1, gap: 1, justifyContent: 'center', minHeight: 44 },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  reciterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    minHeight: 60,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
