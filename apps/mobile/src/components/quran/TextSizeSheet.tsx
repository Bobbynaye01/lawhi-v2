import { useTranslation } from 'react-i18next';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { radius, spacing } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';
import { FONT_SCALE, useSettingsStore } from '../../stores/settingsStore';
import { IconButton } from '../ui/Buttons';
import { ProgressBar } from '../ui/Progress';
import { ArabicText, LawhiText } from '../ui/Text';

/** Reading comfort: Arabic text size with a live preview. */
export function TextSizeSheet({
  visible,
  onClose,
  preview,
}: {
  visible: boolean;
  onClose: () => void;
  preview: string;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const scale = useSettingsStore((s) => s.quranFontScale);
  const setScale = useSettingsStore((s) => s.setQuranFontScale);
  const ratio = (scale - FONT_SCALE.min) / (FONT_SCALE.max - FONT_SCALE.min);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel={t('common.close')}>
        <Pressable
          onPress={() => undefined}
          style={[styles.sheet, { backgroundColor: theme.surfaceElevated, paddingBottom: insets.bottom + spacing.xl }]}
        >
          <View style={[styles.grabber, { backgroundColor: theme.border }]} />
          <LawhiText variant="title">{t('settings.textSize')}</LawhiText>
          <ArabicText quran size={24 * scale} numberOfLines={3} style={{ textAlign: 'center' }}>
            {preview}
          </ArabicText>
          <View style={styles.controls}>
            <IconButton
              icon="minus"
              label={t('quran.smallerText')}
              disabled={scale <= FONT_SCALE.min}
              onPress={() => setScale(scale - FONT_SCALE.step)}
            />
            <View style={{ flex: 1, gap: spacing.xs }}>
              <ProgressBar value={ratio} color={theme.accent} height={4} />
              <LawhiText variant="caption" tone="muted" style={{ textAlign: 'center' }}>
                {Math.round(scale * 100)} %
              </LawhiText>
            </View>
            <IconButton
              icon="plus"
              label={t('quran.largerText')}
              disabled={scale >= FONT_SCALE.max}
              onPress={() => setScale(scale + FONT_SCALE.step)}
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(10,7,5,0.45)', justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.xl,
    gap: spacing.lg,
  },
  grabber: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: -spacing.sm },
  controls: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
});
