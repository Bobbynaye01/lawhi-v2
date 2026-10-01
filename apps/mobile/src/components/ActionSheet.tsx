import { useTranslation } from 'react-i18next';
import { Alert, Modal, Platform, Pressable, ScrollView, StyleSheet } from 'react-native';
import { MIN_TOUCH, radius, spacing } from '../constants/theme';
import { useTheme } from '../hooks/useTheme';
import { AppText } from './ui';

export interface SheetAction {
  label: string;
  onPress: () => void;
  destructive?: boolean;
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
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel={t('common.close')}>
        <Pressable
          style={[styles.sheet, { backgroundColor: theme.surface }]}
          onPress={() => undefined}
        >
          <AppText
            variant="heading"
            accessibilityRole="header"
            style={{ marginBottom: spacing.sm }}
          >
            {title}
          </AppText>
          <ScrollView style={{ maxHeight: 420 }}>
            {actions.map((a) => (
              <Pressable
                key={a.label}
                accessibilityRole="button"
                onPress={() => {
                  onClose();
                  a.onPress();
                }}
                style={({ pressed }) => [
                  styles.action,
                  { backgroundColor: pressed ? theme.card : 'transparent' },
                ]}
              >
                <AppText style={{ color: a.destructive ? theme.danger : theme.text }}>
                  {a.label}
                </AppText>
              </Pressable>
            ))}
          </ScrollView>
          <Pressable accessibilityRole="button" onPress={onClose} style={styles.action}>
            <AppText variant="muted">{t('common.cancel')}</AppText>
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
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    padding: spacing.lg,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    gap: spacing.xs,
  },
  action: {
    minHeight: MIN_TOUCH + 4,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
  },
});
