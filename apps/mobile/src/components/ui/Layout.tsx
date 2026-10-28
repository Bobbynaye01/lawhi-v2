import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { MIN_TOUCH, radius, spacing } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';
import { Button } from './Buttons';
import { Icon, type IconName } from './Icon';
import { Tappable } from './Tappable';
import { LawhiText } from './Text';

 
const LOGO = require('../../../assets/branding/lawhi-mark.webp');
 
/** Official logo proportions (512 × 498). */
export const LOGO_RATIO = 512 / 498;

/** The official Lawhi logo, never redrawn or stretched. */
export function LogoMark({ size, style }: { size: number; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={style} accessibilityRole="image" accessibilityLabel="Lawhi — لوحي">
      <Image source={LOGO} style={{ width: size, height: size / LOGO_RATIO }} resizeMode="contain" />
    </View>
  );
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
        <ScrollView
          contentContainerStyle={[styles.content, contentStyle]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[{ flex: 1 }, contentStyle]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

/** Editorial section header: small overline + optional action link. */
export function SectionHeader({
  title,
  action,
  onAction,
  style,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.sectionHeader, style]}>
      <LawhiText variant="overline" tone="muted" accessibilityRole="header">
        {title}
      </LawhiText>
      {action && onAction ? (
        <Tappable onPress={onAction} accessibilityRole="button" style={{ minHeight: MIN_TOUCH, justifyContent: 'center' }}>
          <LawhiText variant="caption" tone="brand">
            {action}
          </LawhiText>
        </Tappable>
      ) : null}
    </View>
  );
}

/** Legacy section title used by settings-like screens. */
export function SectionTitle({ children }: { children: string }) {
  return <SectionHeader title={children} style={{ marginTop: spacing.lg }} />;
}

export function ListRow({
  title,
  subtitle,
  trailing,
  leading,
  icon,
  onPress,
  accessibilityLabel,
  chevron,
}: {
  title: string;
  subtitle?: string;
  trailing?: ReactNode;
  leading?: ReactNode;
  icon?: IconName;
  onPress?: () => void;
  accessibilityLabel?: string;
  chevron?: boolean;
}) {
  const theme = useTheme();
  const body = (
    <View style={[styles.row, { borderBottomColor: theme.divider }]}>
      {icon ? (
        <View style={[styles.rowIcon, { backgroundColor: theme.surfaceSunken }]}>
          <Icon name={icon} size={18} color={theme.textSecondary} />
        </View>
      ) : null}
      {leading}
      <View style={{ flex: 1, gap: 2 }}>
        <LawhiText variant="bodyStrong">{title}</LawhiText>
        {subtitle ? (
          <LawhiText variant="caption" tone="secondary" numberOfLines={2}>
            {subtitle}
          </LawhiText>
        ) : null}
      </View>
      {trailing}
      {chevron ?? Boolean(onPress) ? <Icon name="chevronForward" size={18} color={theme.muted} /> : null}
    </View>
  );
  if (!onPress) return body;
  return (
    <Tappable onPress={onPress} accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? title} pressedScale={0.99}>
      {body}
    </Tappable>
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
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={label}
      style={[styles.segmented, { backgroundColor: theme.surfaceSunken }]}
    >
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Tappable
            key={o.value}
            accessibilityRole="radio"
            accessibilityState={{ selected, disabled: o.disabled }}
            disabled={o.disabled}
            onPress={() => onChange(o.value)}
            pressedScale={0.97}
            style={[
              styles.segment,
              selected && { backgroundColor: theme.surfaceElevated, borderColor: theme.border, borderWidth: 1 },
              o.disabled && { opacity: 0.4 },
            ]}
          >
            <LawhiText variant={selected ? 'subtitle' : 'body'} tone={selected ? 'primary' : 'secondary'} style={{ fontSize: 14 }}>
              {o.label}
            </LawhiText>
          </Tappable>
        );
      })}
    </View>
  );
}

export function LoadingState({ label }: { label?: string }) {
  const theme = useTheme();
  const { t } = useTranslation();
  return (
    <View style={styles.centered} accessibilityLiveRegion="polite">
      <ActivityIndicator color={theme.accent} />
      <LawhiText variant="caption" tone="muted" style={{ marginTop: spacing.md }}>
        {label ?? t('common.loading')}
      </LawhiText>
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
  return (
    <View style={styles.centered} accessibilityLiveRegion="polite">
      <LawhiText variant="title" tone={tone === 'error' ? 'danger' : 'primary'} style={{ textAlign: 'center' }}>
        {title}
      </LawhiText>
      {message ? (
        <LawhiText variant="body" tone="secondary" style={{ textAlign: 'center', marginTop: spacing.sm, maxWidth: 340 }}>
          {message}
        </LawhiText>
      ) : null}
      {actionLabel && onAction ? (
        <Button title={actionLabel} onPress={onAction} variant="secondary" style={{ marginTop: spacing.xl }} />
      ) : null}
    </View>
  );
}

export function Notice({
  children,
  tone = 'info',
}: {
  children: string;
  tone?: 'info' | 'warning' | 'success';
}) {
  const theme = useTheme();
  const color = tone === 'warning' ? theme.warning : tone === 'success' ? theme.success : theme.secondary;
  return (
    <View accessibilityRole="alert" style={[styles.notice, { backgroundColor: theme.surfaceSunken }]}>
      <View style={[styles.noticeMark, { backgroundColor: color }]} />
      <LawhiText variant="caption" tone="secondary" style={{ flex: 1, fontSize: 14, lineHeight: 20 }}>
        {children}
      </LawhiText>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: spacing.xxxl, gap: spacing.md },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 28,
    marginTop: spacing.sm,
  },
  row: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowIcon: { width: 36, height: 36, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  segmented: { flexDirection: 'row', borderRadius: radius.pill, padding: 3, gap: 3 },
  segment: {
    flex: 1,
    minHeight: MIN_TOUCH - 4,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  notice: { flexDirection: 'row', gap: spacing.md, borderRadius: radius.md, padding: spacing.md, alignItems: 'flex-start' },
  noticeMark: { width: 3, alignSelf: 'stretch', borderRadius: 2 },
});
