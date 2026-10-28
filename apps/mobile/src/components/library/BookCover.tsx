import { StyleSheet, View } from 'react-native';
import { radius } from '../../constants/theme';
import { useIsDark, useTheme } from '../../hooks/useTheme';
import { ArabicText } from '../ui/Text';

/** A small cloth-bound cover: wood tone, thin gold frame, Arabic title. */
export function BookCover({ titleAr, width = 54 }: { titleAr: string; width?: number }) {
  const theme = useTheme();
  const dark = useIsDark();
  const height = width * 1.32;
  // Short title: drop the honorific article words so it fits the spine.
  const short = titleAr.split(/\s+/).slice(0, 2).join(' ');
  return (
    <View
      style={[styles.cover, { width, height, backgroundColor: dark ? '#3A2A1C' : theme.secondary }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <View style={[styles.frame, { borderColor: theme.glow }]}>
        <ArabicText
          size={width * 0.2}
          numberOfLines={2}
          style={{ color: '#F6E9D2', textAlign: 'center', lineHeight: width * 0.34 }}
        >
          {short}
        </ArabicText>
      </View>
      <View style={[styles.spine, { backgroundColor: 'rgba(0,0,0,0.18)' }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  cover: { borderRadius: radius.xs, padding: 5, overflow: 'hidden' },
  frame: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderRadius: 3,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
    opacity: 0.9,
  },
  spine: { position: 'absolute', top: 0, bottom: 0, right: 0, width: 4 },
});
