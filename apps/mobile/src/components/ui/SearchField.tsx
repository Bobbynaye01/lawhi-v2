import { useTranslation } from 'react-i18next';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { fonts, MIN_TOUCH, radius, spacing } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';
import { useIsArabicUi } from '../../hooks/useTypography';
import { IconButton } from './Buttons';
import { Icon } from './Icon';

/** Pill search field with a leading glass and a clear button. */
export function SearchField({
  value,
  onChangeText,
  arabicInput = false,
  ...props
}: Omit<TextInputProps, 'style'> & {
  value: string;
  onChangeText: (text: string) => void;
  /** The query itself is Arabic (Quran, adhkar): right-to-left, Arabic font. */
  arabicInput?: boolean;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const arabicUi = useIsArabicUi();
  return (
    <View style={[styles.box, { backgroundColor: theme.surfaceSunken }]}>
      <Icon name="search" size={18} color={theme.muted} />
      <TextInput
        {...props}
        value={value}
        onChangeText={onChangeText}
        placeholderTextColor={theme.muted}
        style={[
          styles.input,
          {
            color: theme.textPrimary,
            fontFamily: (arabicInput && value) || arabicUi ? fonts.arabicRegular : fonts.regular,
            writingDirection: arabicInput && value ? 'rtl' : undefined,
            textAlign: arabicInput && value ? 'right' : undefined,
          },
        ]}
      />
      {value ? (
        <IconButton icon="close" size={16} label={t('adhkar.clearSearch')} onPress={() => onChangeText('')} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.pill,
    paddingStart: spacing.lg,
    paddingEnd: spacing.xs,
    minHeight: MIN_TOUCH + 4,
  },
  input: { flex: 1, fontSize: 16, minHeight: MIN_TOUCH, paddingVertical: 0 },
});
