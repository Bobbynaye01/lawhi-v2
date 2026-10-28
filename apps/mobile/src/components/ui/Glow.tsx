import { useId } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';

/** Soft warm light — the "lamp" of Lawhi. Purely decorative. */
export function Glow({
  width,
  height,
  color,
  opacity = 0.5,
  style,
}: {
  width: number;
  height: number;
  color: string;
  opacity?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const id = `glow${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <View
      style={[{ position: 'absolute', width, height, pointerEvents: 'none' }, style]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
    <Svg width={width} height={height}>
      <Defs>
        <RadialGradient id={id} cx="50%" cy="50%" rx="50%" ry="50%">
          <Stop offset="0" stopColor={color} stopOpacity={opacity} />
          <Stop offset="0.55" stopColor={color} stopOpacity={opacity * 0.35} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Ellipse cx={width / 2} cy={height / 2} rx={width / 2} ry={height / 2} fill={`url(#${id})`} />
    </Svg>
    </View>
  );
}
