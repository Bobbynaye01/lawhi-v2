import { useEffect, type ReactNode, useState } from 'react';
import { Animated, Platform, type StyleProp, type ViewStyle } from 'react-native';
import { motion } from '../../constants/theme';

/**
 * Staggered entrance: content rises 14 px while fading in. `active` lets a
 * screen wait (e.g. for the intro) before revealing itself.
 */
export function Reveal({
  children,
  delay = 0,
  active = true,
  style,
}: {
  children: ReactNode;
  delay?: number;
  active?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const [value] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (!active) return;
    const anim = Animated.timing(value, {
      toValue: 1,
      duration: motion.slow + 120,
      delay,
      easing: motion.emphasized,
      useNativeDriver: Platform.OS !== 'web',
    });
    anim.start();
    return () => anim.stop();
  }, [active, delay, value]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: value,
          transform: [{ translateY: value.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}
