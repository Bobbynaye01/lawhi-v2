import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { MIN_TOUCH, radius, spacing } from '../constants/theme';
import { useTheme } from '../hooks/useTheme';
import { AppText } from './ui';

export function FormField({
  label,
  error,
  hint,
  ...input
}: TextInputProps & { label: string; error?: string | null; hint?: string }) {
  const theme = useTheme();
  return (
    <View style={{ gap: spacing.xs }}>
      <AppText variant="muted" nativeID={`label-${label}`}>
        {label}
      </AppText>
      <TextInput
        {...input}
        accessibilityLabel={label}
        accessibilityLabelledBy={`label-${label}`}
        placeholderTextColor={theme.textMuted}
        style={[
          styles.input,
          {
            color: theme.text,
            backgroundColor: theme.surface,
            borderColor: error ? theme.danger : theme.border,
          },
          input.style,
        ]}
      />
      {error ? (
        <AppText variant="small" style={{ color: theme.danger }} accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : hint ? (
        <AppText variant="small">{hint}</AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    minHeight: MIN_TOUCH + 4,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    fontSize: 16,
  },
});
