import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing } from '../../constants/theme';
import { LawhiText } from './Text';

/** Large editorial title used by the tab screens (they have no navigation header). */
export function ScreenHeader({
  overline,
  title,
  actions,
  children,
}: {
  overline?: string;
  title: string;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.wrap, { paddingTop: insets.top + spacing.md }]}>
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          {overline ? (
            <LawhiText variant="overline" tone="muted">
              {overline}
            </LawhiText>
          ) : null}
          <LawhiText variant="display" accessibilityRole="header">
            {title}
          </LawhiText>
        </View>
        {actions ? <View style={styles.actions}>{actions}</View> : null}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm, gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  actions: { flexDirection: 'row', marginBottom: -4 },
});
