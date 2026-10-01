import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type PressableProps,
  type StyleProp,
  type TextProps,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { fonts, MIN_TOUCH, radius, spacing } from '../constants/theme';
import { useTheme } from '../hooks/useTheme';

type Variant = 'title' | 'heading' | 'body' | 'muted' | 'small' | 'arabic';

const sizes: Record<Variant, object> = {
  title: { fontSize: 24, fontWeight: '700' },
  heading: { fontSize: 18, fontWeight: '600' },
  body: { fontSize: 16 },
  muted: { fontSize: 15 },
  small: { fontSize: 13 },
  arabic: { fontSize: 22, fontFamily: fonts.arabic, lineHeight: 42, writingDirection: 'rtl', textAlign: 'right' },
};

export function AppText({ variant = 'body', style, ...props }: TextProps & { variant?: Variant }) {
  const theme = useTheme();
  const color = variant === 'muted' || variant === 'small' ? theme.textMuted : theme.text;
  return <Text {...props} style={[sizes[variant], { color, textAlign: 'auto' }, style]} />;
}

export function Screen({
  children,
  scroll = true,
  edges = ['bottom'],
  contentStyle,
}: {
  children: ReactNode;
  scroll?: boolean;
  edges?: Edge[];
  contentStyle?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  return (
    <SafeAreaView edges={edges} style={{ flex: 1, backgroundColor: theme.background }}>
      {scroll ? (
        <ScrollView contentContainerStyle={[styles.content, contentStyle]} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      ) : (
        <View style={[{ flex: 1 }, contentStyle]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const theme = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }, style]}>
      {children}
    </View>
  );
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  accessibilityHint,
  style,
}: {
  title: string;
  onPress: PressableProps['onPress'];
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  loading?: boolean;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const background =
    variant === 'primary' ? theme.primary : variant === 'danger' ? theme.danger : 'transparent';
  const color = variant === 'secondary' ? theme.primary : theme.onPrimary;
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      accessibilityHint={accessibilityHint}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: background, borderColor: theme.primary, opacity: inactive ? 0.5 : pressed ? 0.8 : 1 },
        variant === 'secondary' && { borderWidth: 1.5 },
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={color} /> : <Text style={[styles.buttonText, { color }]}>{title}</Text>}
    </Pressable>
  );
}

export function ListRow({
  title,
  subtitle,
  trailing,
  leading,
  onPress,
  accessibilityLabel,
}: {
  title: string;
  subtitle?: string;
  trailing?: ReactNode;
  leading?: ReactNode;
  onPress?: () => void;
  accessibilityLabel?: string;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        styles.row,
        { borderBottomColor: theme.border, backgroundColor: pressed ? theme.card : 'transparent' },
      ]}
    >
      {leading}
      <View style={{ flex: 1 }}>
        <AppText>{title}</AppText>
        {subtitle ? <AppText variant="small">{subtitle}</AppText> : null}
      </View>
      {trailing}
    </Pressable>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string; disabled?: boolean }[];
  value: T;
  onChange: (value: T) => void;
  label: string;
}) {
  const theme = useTheme();
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={[styles.segmented, { borderColor: theme.border }]}>
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="radio"
            accessibilityState={{ selected, disabled: o.disabled }}
            disabled={o.disabled}
            onPress={() => onChange(o.value)}
            style={[styles.segment, selected && { backgroundColor: theme.primary }, o.disabled && { opacity: 0.4 }]}
          >
            <Text style={{ color: selected ? theme.onPrimary : theme.text, fontWeight: selected ? '600' : '400' }}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function SectionTitle({ children }: { children: string }) {
  return (
    <AppText variant="heading" accessibilityRole="header" style={{ marginTop: spacing.lg, marginBottom: spacing.sm }}>
      {children}
    </AppText>
  );
}

export function LoadingState({ label }: { label?: string }) {
  const theme = useTheme();
  const { t } = useTranslation();
  return (
    <View style={styles.centered} accessibilityLiveRegion="polite">
      <ActivityIndicator color={theme.primary} size="large" />
      <AppText variant="muted" style={{ marginTop: spacing.md }}>
        {label ?? t('common.loading')}
      </AppText>
    </View>
  );
}

export function MessageState({
  title,
  message,
  actionLabel,
  onAction,
  tone = 'neutral',
}: {
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  tone?: 'neutral' | 'error';
}) {
  const theme = useTheme();
  return (
    <View style={styles.centered} accessibilityLiveRegion="polite">
      <AppText variant="heading" style={{ textAlign: 'center', color: tone === 'error' ? theme.danger : theme.text }}>
        {title}
      </AppText>
      {message ? (
        <AppText variant="muted" style={{ textAlign: 'center', marginTop: spacing.sm }}>
          {message}
        </AppText>
      ) : null}
      {actionLabel && onAction ? (
        <Button title={actionLabel} onPress={onAction} variant="secondary" style={{ marginTop: spacing.lg }} />
      ) : null}
    </View>
  );
}

export function Notice({ children, tone = 'info' }: { children: string; tone?: 'info' | 'warning' | 'success' }) {
  const theme = useTheme();
  const color = tone === 'warning' ? theme.warning : tone === 'success' ? theme.success : theme.primary;
  return (
    <View
      accessibilityRole="alert"
      style={[styles.notice, { borderColor: color, backgroundColor: theme.card }]}
    >
      <AppText variant="muted" style={{ color: theme.text }}>
        {children}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },
  card: { borderRadius: radius.lg, borderWidth: 1, padding: spacing.lg, gap: spacing.sm },
  button: {
    minHeight: MIN_TOUCH,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { fontSize: 16, fontWeight: '600' },
  row: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  segmented: { flexDirection: 'row', borderWidth: 1, borderRadius: radius.md, overflow: 'hidden' },
  segment: { flex: 1, minHeight: MIN_TOUCH, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.sm },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  notice: { borderStartWidth: 4, borderRadius: radius.sm, padding: spacing.md },
});
