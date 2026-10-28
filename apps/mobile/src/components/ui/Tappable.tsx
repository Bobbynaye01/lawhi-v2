import * as Haptics from 'expo-haptics';
import { type ReactNode, useState } from 'react';
import {
  Animated,
  Platform,
  Pressable,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { motion } from '../../constants/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Base of every touchable surface: a soft press-in scale (native driver) and an
 * optional light haptic. Calm feedback, never bouncy.
 */
export function Tappable({
  children,
  style,
  pressedScale = 0.975,
  haptic = false,
  onPress,
  ...props
}: Omit<PressableProps, 'style' | 'children'> & {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  pressedScale?: number;
  haptic?: boolean;
}) {
  const [scale] = useState(() => new Animated.Value(1));
  const to = (value: number) =>
    Animated.timing(scale, {
      toValue: value,
      duration: motion.fast,
      easing: motion.standard,
      useNativeDriver: Platform.OS !== 'web',
    }).start();

  return (
    <AnimatedPressable
      {...props}
      style={[style, { transform: [{ scale }] }]}
      onPressIn={(e) => {
        to(pressedScale);
        props.onPressIn?.(e);
      }}
      onPressOut={(e) => {
        to(1);
        props.onPressOut?.(e);
      }}
      onPress={(e) => {
        if (haptic) void Haptics.selectionAsync().catch(() => undefined);
        onPress?.(e);
      }}
    >
      {children}
    </AnimatedPressable>
  );
}
