import { useTranslation } from 'react-i18next';
import { Alert, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MIN_TOUCH, radius, spacing } from '../constants/theme';
import { useTheme } from '../hooks/useTheme';
import { Icon, LawhiText } from './ui';

export interface SheetAction {
  label: string;
  onPress: () => void;
  destructive?: boolean;
  /** Current choice in a picker: shown with a check mark. */
  selected?: boolean;
}

/** Cross-platform action sheet (Alert buttons are ignored by react-native-web). */
export function ActionSheet({
  visible,
  title,
  actions,
  onClose,
}: {
  visible: boolean;
  title: string;
  actions: SheetAction[];
  onClose: () => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel={t('common.close')}>
        <Pressable
          style={[styles.sheet, { backgroundColor: theme.surfaceElevated, paddingBottom: insets.bottom + spacing.md }]}
          onPress={() => undefined}
        >
          <View style={[styles.grabber, { backgroundColor: theme.border }]} />
          <LawhiText variant="title" accessibilityRole="header" style={{ marginBottom: spacing.sm }}>
            {title}
          </LawhiText>
          <ScrollView style={{ maxHeight: 420 }}>
            {actions.map((a) => (
              <Pressable
                key={a.label}
                accessibilityRole="button"
                accessibilityState={a.selected === undefined ? undefined : { selected: a.selected }}
                onPress={() => {
                  onClose();
                  a.onPress();
                }}
                style={({ pressed }) => [
                  styles.action,
                  { backgroundColor: pressed ? theme.surfaceSunken : 'transparent' },
                ]}
              >
                <LawhiText
                  variant={a.selected ? 'bodyStrong' : 'body'}
                  style={{ flex: 1, color: a.destructive ? theme.danger : theme.textPrimary }}
                >
                  {a.label}
                </LawhiText>
                {a.selected ? <Icon name="check" size={18} color={theme.primary} /> : null}
              </Pressable>
            ))}
          </ScrollView>
          <Pressable accessibilityRole="button" onPress={onClose} style={styles.action}>
            <LawhiText tone="secondary">{t('common.cancel')}</LawhiText>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/** Yes/no confirmation that also works on web. */
export function confirmAsync(options: {
  title: string;
  message: string;
  confirm: string;
  cancel: string;
  destructive?: boolean;
  /** Current choice in a picker: shown with a check mark. */
  selected?: boolean;
}) {
  if (Platform.OS === 'web') {
    return Promise.resolve(
      typeof window !== 'undefined' && window.confirm(`${options.title}\n\n${options.message}`),
    );
  }
  return new Promise<boolean>((resolve) => {
    Alert.alert(options.title, options.message, [
      { text: options.cancel, style: 'cancel', onPress: () => resolve(false) },
      {
        text: options.confirm,
        style: options.destructive ? 'destructive' : 'default',
        onPress: () => resolve(true),
      },
    ]);
  });
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(10,7,5,0.45)', justifyContent: 'flex-end' },
  grabber: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: spacing.sm },
  sheet: {
    padding: spacing.lg,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    gap: spacing.xs,
  },
  action: {
    minHeight: MIN_TOUCH + 4,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
  },
});
