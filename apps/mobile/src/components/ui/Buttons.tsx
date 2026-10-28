import { ActivityIndicator, View, type StyleProp, type ViewStyle } from 'react-native';
import { MIN_TOUCH, radius, spacing } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';
import { Icon, type IconName } from './Icon';
import { Tappable } from './Tappable';
import { LawhiText } from './Text';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export function Button({
  title,
  onPress,
  variant = 'primary',
  icon,
  disabled,
  loading,
  accessibilityHint,
  style,
}: {
  title: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  icon?: IconName;
  disabled?: boolean;
  loading?: boolean;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const t = useTheme();
  const palette: Record<ButtonVariant, { bg: string; fg: string; border: string }> = {
    primary: { bg: t.primary, fg: t.onPrimary, border: t.primary },
    secondary: { bg: 'transparent', fg: t.textPrimary, border: t.border },
    ghost: { bg: 'transparent', fg: t.primary, border: 'transparent' },
    danger: { bg: 'transparent', fg: t.danger, border: t.danger },
  };
  const { bg, fg, border } = palette[variant];
  const inactive = disabled || loading;
  return (
    <Tappable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      accessibilityHint={accessibilityHint}
      accessibilityLabel={title}
      disabled={inactive}
      onPress={onPress}
      haptic={variant === 'primary'}
      style={[
        {
          minHeight: MIN_TOUCH + 6,
          borderRadius: radius.pill,
          paddingHorizontal: spacing.xl,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: spacing.sm,
          backgroundColor: bg,
          borderWidth: 1,
          borderColor: border,
          opacity: inactive && !loading ? 0.45 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon ? <Icon name={icon} size={18} color={fg} /> : null}
          <LawhiText variant="subtitle" style={{ color: fg }}>
            {title}
          </LawhiText>
        </>
      )}
    </Tappable>
  );
}

export function IconButton({
  icon,
  label,
  onPress,
  tone = 'default',
  size = 22,
  disabled,
  filled,
}: {
  icon: IconName;
  label: string;
  onPress?: () => void;
  tone?: 'default' | 'brand' | 'accent' | 'onBrand' | 'danger';
  size?: number;
  disabled?: boolean;
  filled?: boolean;
}) {
  const t = useTheme();
  const color = {
    default: t.textPrimary,
    brand: t.primary,
    accent: t.accent,
    onBrand: t.onPrimary,
    danger: t.danger,
  }[tone];
  return (
    <Tappable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      pressedScale={0.9}
      style={{
        minWidth: MIN_TOUCH,
        minHeight: MIN_TOUCH,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: disabled ? 0.35 : 1,
      }}
    >
      <View>
        <Icon name={icon} size={size} color={color} filled={filled} />
      </View>
    </Tappable>
  );
}
