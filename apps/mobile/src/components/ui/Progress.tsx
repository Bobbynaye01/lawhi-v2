import { useEffect, useState } from 'react';
import { Animated, Platform, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { motion, radius } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/** Hairline progress bar; the fill eases to its new value. */
export function ProgressBar({
  value,
  color,
  track,
  height = 3,
  style,
  accessibilityLabel,
}: {
  value: number;
  color?: string;
  track?: string;
  height?: number;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  const theme = useTheme();
  const [width, setWidth] = useState(0);
  const [progress] = useState(() => new Animated.Value(0));
  const clamped = Math.max(0, Math.min(1, value));

  useEffect(() => {
    Animated.timing(progress, {
      toValue: clamped,
      duration: motion.slow,
      easing: motion.emphasized,
      useNativeDriver: false,
    }).start();
  }, [clamped, progress]);

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={[
        { height, borderRadius: radius.pill, overflow: 'hidden', backgroundColor: track ?? theme.divider },
        style,
      ]}
    >
      <Animated.View
        style={{
          height,
          borderRadius: radius.pill,
          backgroundColor: color ?? theme.primary,
          width: progress.interpolate({ inputRange: [0, 1], outputRange: [0, width] }),
        }}
      />
    </View>
  );
}

/** Thin circular progress, used by counters (adhkar) and the Quran card. */
export function ProgressRing({
  value,
  size = 56,
  stroke = 3,
  color,
  track,
  children,
}: {
  value: number;
  size?: number;
  stroke?: number;
  color?: string;
  track?: string;
  children?: React.ReactNode;
}) {
  const theme = useTheme();
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const [progress] = useState(() => new Animated.Value(0));
  const clamped = Math.max(0, Math.min(1, value));

  useEffect(() => {
    Animated.timing(progress, {
      toValue: clamped,
      duration: motion.base,
      easing: motion.emphasized,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [clamped, progress]);

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={track ?? theme.divider} strokeWidth={stroke} fill="none" />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color ?? theme.primary}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={progress.interpolate({ inputRange: [0, 1], outputRange: [circumference, 0] })}
        />
      </Svg>
      {children}
    </View>
  );
}
