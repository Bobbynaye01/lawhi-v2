import { Ionicons } from '@expo/vector-icons';
import type { Verse } from '@lawhi/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Modal, Pressable, StyleSheet, View } from 'react-native';
import { AppText, Button, ListRow } from '../../components/ui';
import { MIN_TOUCH, spacing } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';
import { contentRepository } from '../../repositories/contentRepository';
import { recitation, useRecitationStore } from '../../services/audio/recitationPlayer';
import { useSettingsStore } from '../../stores/settingsStore';
import { localized, useLocale } from '../../utils/localize';

export function PlayerBar({ verses }: { verses: Verse[] }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const locale = useLocale();
  const riwaya = useSettingsStore((s) => s.riwaya);
  const reciterId = useSettingsStore((s) => s.reciterByRiwaya[riwaya]);
  const setReciter = useSettingsStore((s) => s.setReciter);
  const { status, error, index, queue, position, duration } = useRecitationStore();
  const [picking, setPicking] = useState(false);

  const reciters = contentRepository.reciters(riwaya);
  const reciter = reciters.find((r) => r.id === reciterId) ?? reciters[0];
  const current = queue[index];

  if (!reciter) {
    // Honest state: no verified Warsh recitation is available yet.
    return (
      <View style={[styles.bar, { borderTopColor: theme.border, backgroundColor: theme.surface }]}>
        <AppText variant="small">{t('quran.audio.noReciterForRiwaya')}</AppText>
      </View>
    );
  }

  const start = () => void recitation.start(reciter, verses, 0);
  const progress = duration > 0 ? position / duration : 0;
  const busy = status === 'loading';

  return (
    <View style={[styles.bar, { borderTopColor: theme.border, backgroundColor: theme.surface }]}>
      {status !== 'idle' ? (
        <View style={[styles.progressTrack, { backgroundColor: theme.border }]}>
          <View style={[styles.progressFill, { backgroundColor: theme.primary, width: `${progress * 100}%` }]} />
        </View>
      ) : null}
      <View style={styles.row}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('quran.audio.chooseReciter')}
          onPress={() => setPicking(true)}
          style={{ flex: 1, minHeight: MIN_TOUCH, justifyContent: 'center' }}
        >
          <AppText numberOfLines={1}>{localized(reciter, 'name', locale)}</AppText>
          <AppText variant="small" numberOfLines={1}>
            {status === 'error'
              ? t(error === 'network' ? 'quran.audio.networkError' : 'quran.audio.playbackError')
              : current
                ? `${current.surah}:${current.verse}${busy ? ` · ${t('common.loading')}` : ''}`
                : t('quran.audio.tapToListen')}
          </AppText>
        </Pressable>
        {status === 'idle' ? (
          <IconButton icon="play" label={t('quran.audio.play')} onPress={start} />
        ) : (
          <>
            <IconButton icon="play-skip-back" label={t('quran.audio.previous')} onPress={() => void recitation.previous()} />
            <IconButton
              icon={status === 'playing' ? 'pause' : status === 'error' ? 'refresh' : 'play'}
              label={t(status === 'playing' ? 'quran.audio.pause' : status === 'error' ? 'common.retry' : 'quran.audio.play')}
              onPress={() => void recitation.toggle()}
            />
            <IconButton icon="play-skip-forward" label={t('quran.audio.next')} onPress={() => void recitation.next()} />
            <IconButton icon="stop" label={t('quran.audio.stop')} onPress={() => recitation.stop()} />
          </>
        )}
      </View>

      <Modal visible={picking} animationType="slide" onRequestClose={() => setPicking(false)}>
        <View style={{ flex: 1, backgroundColor: theme.background, paddingTop: spacing.xl }}>
          <AppText variant="heading" style={{ padding: spacing.lg }} accessibilityRole="header">
            {t('quran.audio.chooseReciter')}
          </AppText>
          <FlatList
            data={reciters}
            keyExtractor={(r) => r.id}
            renderItem={({ item }) => (
              <ListRow
                title={localized(item, 'name', locale)}
                subtitle={locale === 'ar' ? undefined : item.nameAr}
                trailing={item.id === reciter.id ? <Ionicons name="checkmark" size={22} color={theme.primary} /> : null}
                onPress={() => {
                  setReciter(riwaya, item.id);
                  setPicking(false);
                  void recitation.changeReciter(item);
                }}
              />
            )}
          />
          <Button title={t('common.close')} variant="secondary" onPress={() => setPicking(false)} style={{ margin: spacing.lg }} />
        </View>
      </Modal>
    </View>
  );
}

function IconButton({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={styles.iconButton}>
      <Ionicons name={icon} size={24} color={theme.primary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: { borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  progressTrack: { height: 3, borderRadius: 2, overflow: 'hidden', marginBottom: spacing.xs },
  progressFill: { height: 3 },
  iconButton: { minWidth: MIN_TOUCH, minHeight: MIN_TOUCH, alignItems: 'center', justifyContent: 'center' },
});
