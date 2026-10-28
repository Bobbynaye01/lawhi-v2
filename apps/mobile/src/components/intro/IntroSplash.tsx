import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { fonts, lightPalette } from '../../constants/theme';
import { Glow } from '../ui/Glow';
import { LAWH_IMAGE } from '../ui/Arch';
import { LogoMark } from '../ui/Layout';

const native = Platform.OS !== 'web';
const SCRIM = lightPalette.scrim;
const LAMP = '#F3B866';

/**
 * Opening sequence — "the lawh becomes Lawhi".
 *  1. darkness; warm light slowly reveals stone, straw and wood
 *  2. the camera drifts toward the lawh, light glides across the grain
 *  3. the official logo settles onto the lawh, then the wordmark
 *  4. the light blooms into the interface underneath
 * Native-driver opacity/transform only; tap to skip; reduced motion → fade.
 */
export function IntroSplash({ onDone, background }: { onDone: () => void; background: string }) {
  const { width, height } = useWindowDimensions();
  const { t } = useTranslation();
  const [reduceMotion, setReduceMotion] = useState<boolean | null>(null);
  const finished = useRef(false);

  const [reveal] = useState(() => new Animated.Value(0)); // 0 dark → 1 lit
  const [camera] = useState(() => new Animated.Value(0)); // 0 far → 1 close
  const [sweep] = useState(() => new Animated.Value(0)); // light position
  const [logo] = useState(() => new Animated.Value(0));
  const [word] = useState(() => new Animated.Value(0));
  const [exit] = useState(() => new Animated.Value(0)); // 0 intro → 1 interface

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then(setReduceMotion)
      .catch(() => setReduceMotion(false));
  }, []);

  const finish = () => {
    if (finished.current) return;
    finished.current = true;
    onDone();
  };

  const skip = () => {
    Animated.timing(exit, { toValue: 1, duration: 280, easing: Easing.out(Easing.quad), useNativeDriver: native }).start(finish);
  };

  useEffect(() => {
    if (reduceMotion === null) return;
    const tween = (v: Animated.Value, toValue: number, duration: number, easing = Easing.bezier(0.25, 0.1, 0.25, 1)) =>
      Animated.timing(v, { toValue, duration, easing, useNativeDriver: native });

    if (reduceMotion) {
      reveal.setValue(1);
      camera.setValue(1);
      logo.setValue(1);
      word.setValue(1);
      Animated.sequence([Animated.delay(500), tween(exit, 1, 300)]).start(finish);
      return;
    }

    const sequence = Animated.parallel([
      // Scene 1–2: light rises, camera drifts in, light glides across
      tween(reveal, 1, 2200, Easing.bezier(0.45, 0, 0.2, 1)),
      tween(camera, 1, 3600, Easing.bezier(0.2, 0, 0, 1)),
      tween(sweep, 1, 3800, Easing.inOut(Easing.sin)),
      // Scene 3: the mark settles onto the lawh, then the name
      Animated.sequence([Animated.delay(1900), tween(logo, 1, 1100, Easing.bezier(0.05, 0.7, 0.1, 1))]),
      Animated.sequence([Animated.delay(2600), tween(word, 1, 800)]),
      // Scene 4: bloom into the interface
      Animated.sequence([Animated.delay(3700), tween(exit, 1, 650, Easing.bezier(0.4, 0, 0.2, 1))]),
    ]);
    sequence.start(({ finished: done }) => done && finish());
    return () => sequence.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduceMotion]);

  // Portrait framing of the photograph (361 × 639), covering the screen.
  const imageRatio = 361 / 639;
  // Wide enough to keep stone and straw around the board; edges fall into shadow.
  const imgH = Math.min(height * 0.86, (width * 1.08) / imageRatio);
  const imgW = imgH * imageRatio;
  const logoSize = Math.min(150, width * 0.36);

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, { opacity: exit.interpolate({ inputRange: [0, 0.75, 1], outputRange: [1, 1, 0] }) }]}
      pointerEvents="box-none"
    >
      <Pressable
        style={[StyleSheet.absoluteFill, { backgroundColor: SCRIM }]}
        onPress={skip}
        accessibilityRole="button"
        accessibilityLabel="Lawhi — لوحي"
        accessibilityHint={t('intro.skip')}
      >
        {/* The photograph, with the camera move */}
        <Animated.View
          style={[
            styles.center,
            {
              opacity: reveal,
              transform: [
                { scale: camera.interpolate({ inputRange: [0, 1], outputRange: [1, 1.09] }) },
                { translateY: camera.interpolate({ inputRange: [0, 1], outputRange: [0, -10] }) },
              ],
            },
          ]}
        >
          <Image source={LAWH_IMAGE} style={{ width: imgW, height: imgH }} resizeMode="cover" blurRadius={0} />
        </Animated.View>

        {/* Light gliding across the wood */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.center,
            {
              opacity: reveal.interpolate({ inputRange: [0, 1], outputRange: [0, 0.85] }),
              transform: [
                { translateX: sweep.interpolate({ inputRange: [0, 1], outputRange: [-width * 0.28, width * 0.18] }) },
                { translateY: sweep.interpolate({ inputRange: [0, 1], outputRange: [-height * 0.12, -height * 0.04] }) },
              ],
            },
          ]}
        >
          <Glow width={width * 1.3} height={width * 1.3} color={LAMP} opacity={0.42} />
        </Animated.View>

        {/* Vignette — keeps the edges in shadow, like a single lamp */}
        <Svg width={width} height={height} style={StyleSheet.absoluteFill} pointerEvents="none">
          <Defs>
            <LinearGradient id="introTop" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={SCRIM} stopOpacity={0.9} />
              <Stop offset="0.28" stopColor={SCRIM} stopOpacity={0.25} />
              <Stop offset="0.62" stopColor={SCRIM} stopOpacity={0.15} />
              <Stop offset="1" stopColor={SCRIM} stopOpacity={0.92} />
            </LinearGradient>
          </Defs>
          <Rect width={width} height={height} fill="url(#introTop)" />
        </Svg>

        {/* Darkness lifting */}
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: SCRIM, opacity: reveal.interpolate({ inputRange: [0, 1], outputRange: [1, 0.18] }) },
          ]}
        />

        {/* The official logo settles onto the lawh */}
        <View style={styles.center} pointerEvents="none">
          <Animated.View
            style={{
              alignItems: 'center',
              opacity: logo,
              transform: [{ translateY: logo.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
            }}
          >
            <View style={styles.logoShadow}>
              <LogoMark size={logoSize} />
            </View>
            <Animated.Text
              style={[
                styles.wordmark,
                {
                  opacity: word,
                  transform: [{ translateY: word.interpolate({ inputRange: [0, 1], outputRange: [6, 0] }) }],
                },
              ]}
            >
              LAWHI
            </Animated.Text>
          </Animated.View>
        </View>

        {/* Scene 4: the lamp light blooms into the interface colour */}
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: background, opacity: exit.interpolate({ inputRange: [0, 0.55, 1], outputRange: [0, 0.9, 1] }) },
          ]}
        />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  center: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center' },
  logoShadow: {
    shadowColor: '#000',
    shadowOpacity: 0.45,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
    borderRadius: 26,
  },
  wordmark: {
    marginTop: 22,
    color: '#F3E7D2',
    fontFamily: fonts.displayMedium,
    fontSize: 15,
    letterSpacing: 7,
  },
});
