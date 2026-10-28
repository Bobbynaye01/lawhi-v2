import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Circle, G, Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import { fonts, motion } from '../../constants/theme';
import { useReduceMotion } from '../../hooks/useReduceMotion';
import { useTheme } from '../../hooks/useTheme';
import { useIsArabicUi } from '../../hooks/useTypography';
import { archPath } from '../ui/Arch';
import { Glow } from '../ui/Glow';

/** A small rhombus centred on (x, y), as a path fragment. */
const diamond = (x: number, y: number, r: number) => `M${x} ${y - r}l${r} ${r} ${-r} ${r} ${-r} ${-r}z`;

/**
 * Compass dial that turns with the phone (north stays north) and carries the
 * Kaaba marker at the Qibla bearing, a prayer rug pointing to it. Rotation takes the shortest path and is
 * eased on the native driver so the needle never spins the long way round.
 */
export function QiblaCompass({
  size,
  heading,
  bearing,
  facing,
}: {
  size: number;
  heading: number;
  bearing: number;
  facing: boolean;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const reduceMotion = useReduceMotion();
  const arabic = useIsArabicUi();
  const [rotation] = useState(() => new Animated.Value(-heading));
  const last = useRef(-heading);
  const [glow] = useState(() => new Animated.Value(facing ? 1 : 0));

  useEffect(() => {
    const target = -heading;
    const delta = ((((target - last.current) % 360) + 540) % 360) - 180;
    last.current += delta;
    if (reduceMotion) rotation.setValue(last.current);
    else
      Animated.timing(rotation, {
        toValue: last.current,
        duration: 220,
        easing: Easing.out(Easing.quad),
        useNativeDriver: motion.native,
      }).start();
  }, [heading, reduceMotion, rotation]);

  useEffect(() => {
    Animated.timing(glow, { toValue: facing ? 1 : 0, duration: 420, useNativeDriver: motion.native }).start();
  }, [facing, glow]);

  const c = size / 2;
  const ring = c - 6;
  const ticks = Array.from({ length: 72 }, (_, i) => i * 5);
  const cardinals = [
    { a: 0, label: t('qibla.cardinals.n'), main: true },
    { a: 90, label: t('qibla.cardinals.e') },
    { a: 180, label: t('qibla.cardinals.s') },
    { a: 270, label: t('qibla.cardinals.w') },
  ];
  const polar = (angle: number, r: number) => {
    const rad = ((angle - 90) * Math.PI) / 180;
    return { x: c + r * Math.cos(rad), y: c + r * Math.sin(rad) };
  };
  const qiblaColor = facing ? theme.success : theme.accent;
  const marker = polar(bearing, ring - 38);
  const mw = 26;
  const mh = 30;
  // The rug runs from behind the pivot to just short of the Kaaba marker.
  const rugW = 72;
  const rugTop = c - (ring - 38 - mh / 2 - 6);
  const rugH = Math.max(c + 28 - rugTop, 24);
  const rugBottom = rugTop + rugH;
  const rugX = c - rugW / 2;
  const fringe = Array.from({ length: 10 }, (_, i) => rugX + 4 + (i * (rugW - 8)) / 9);
  const mihrabTop = rugTop + 11;
  const mihrabW = rugW - 22;
  const mihrabH = rugH * 0.5;
  const lampDrop = mihrabH * 0.3;
  const medallionY = rugBottom - 14;
  const rugBand = (() => {
    const inset = 5.5;
    const across = Math.max(2, Math.floor((rugW - 2 * inset) / 6));
    const along = Math.max(2, Math.floor((rugH - 2 * inset) / 6));
    let d = '';
    for (let i = 0; i <= across; i++) {
      const x = rugX + inset + (i * (rugW - 2 * inset)) / across;
      d += diamond(x, rugTop + inset, 1.3) + diamond(x, rugBottom - inset, 1.3);
    }
    for (let i = 1; i < along; i++) {
      const y = rugTop + inset + (i * (rugH - 2 * inset)) / along;
      d += diamond(rugX + inset, y, 1.3) + diamond(rugX + rugW - inset, y, 1.3);
    }
    return d + diamond(rugX + 12.5, rugTop + 12.5, 1.6) + diamond(rugX + rugW - 12.5, rugTop + 12.5, 1.6);
  })();

  return (
    <View style={{ width: size, height: size + 18, alignItems: 'center' }}>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: glow, alignItems: 'center', top: 18 }]} pointerEvents="none">
        <Glow width={size * 1.25} height={size * 1.25} color={theme.success} opacity={0.22} style={{ top: -size * 0.125, left: -size * 0.125 }} />
      </Animated.View>
      {/* Fixed index: where the top of the phone points. */}
      <Svg width={18} height={14} style={{ marginBottom: 4 }}>
        <Path d="M9 14 L1 0 H17 Z" fill={facing ? theme.success : theme.textPrimary} />
      </Svg>
      <Animated.View
        style={{
          width: size,
          height: size,
          transform: [
            { rotate: rotation.interpolate({ inputRange: [0, 360], outputRange: ['0deg', '360deg'], extrapolate: 'extend' }) },
          ],
        }}
      >
        <Svg width={size} height={size}>
          <Circle cx={c} cy={c} r={ring} fill={theme.surface} stroke={facing ? theme.success : theme.border} strokeWidth={1.5} />
          <Circle cx={c} cy={c} r={ring - 30} fill="none" stroke={theme.divider} strokeWidth={1} />
          {ticks.map((a) => {
            const major = a % 30 === 0;
            const p1 = polar(a, ring - 4);
            const p2 = polar(a, ring - (major ? 16 : 9));
            return (
              <Line
                key={a}
                x1={p1.x}
                y1={p1.y}
                x2={p2.x}
                y2={p2.y}
                stroke={major ? theme.textSecondary : theme.muted}
                strokeWidth={major ? 1.4 : 0.8}
                strokeLinecap="round"
              />
            );
          })}
          {cardinals.map(({ a, label, main }) => {
            const p = polar(a, ring - 30);
            return (
              <SvgText
                key={a}
                x={p.x}
                y={p.y + 5}
                fill={main ? theme.accent : theme.textSecondary}
                fontSize={main ? 15 : 13}
                fontFamily={arabic ? fonts.arabicSemiBold : fonts.semiBold}
                textAnchor="middle"
              >
                {label}
              </SvgText>
            );
          })}
          {/* Prayer rug from the centre toward the Kaaba, mihrab at the Kaaba end. */}
          <G transform={`rotate(${bearing} ${c} ${c})`}>
            <G stroke={qiblaColor} strokeWidth={1.2} strokeLinecap="round">
              {fringe.map((x) => (
                <G key={x}>
                  <Line x1={x} y1={rugTop} x2={x} y2={rugTop - 4} />
                  <Line x1={x} y1={rugBottom} x2={x} y2={rugBottom + 4} />
                </G>
              ))}
            </G>
            <Rect x={rugX} y={rugTop} width={rugW} height={rugH} rx={2} fill={qiblaColor} />
            <G fill="none" stroke={theme.surface}>
              <Rect x={rugX + 3} y={rugTop + 3} width={rugW - 6} height={rugH - 6} rx={1} strokeWidth={1} opacity={0.75} />
              <Rect x={rugX + 8} y={rugTop + 8} width={rugW - 16} height={rugH - 16} strokeWidth={0.8} opacity={0.6} />
            </G>
            {/* Band of small diamonds between the two borders, and the corner spandrels. */}
            <Path d={rugBand} fill={theme.surface} opacity={0.7} />
            {/* Mihrab, doubled, with its hanging lamp. */}
            <Path
              d={archPath(mihrabW, mihrabH)}
              transform={`translate(${rugX + 11} ${mihrabTop})`}
              fill="none"
              stroke={theme.surface}
              strokeWidth={1.3}
            />
            <Path
              d={archPath(mihrabW - 6, mihrabH - 3)}
              transform={`translate(${rugX + 14} ${mihrabTop + 3})`}
              fill="none"
              stroke={theme.surface}
              strokeWidth={0.8}
              opacity={0.55}
            />
            <Path d={`M${c} ${mihrabTop + 3}v${lampDrop}`} stroke={theme.surface} strokeWidth={0.8} opacity={0.8} />
            <Path
              d={`M${c} ${mihrabTop + 3 + lampDrop}c-2.2 0 -2.2 3.5 0 4.5c2.2 -1 2.2 -4.5 0 -4.5z`}
              fill={theme.surface}
              opacity={0.85}
            />
            {/* Medallion below the mihrab. */}
            <Path d={diamond(c, medallionY, 4.5)} fill="none" stroke={theme.surface} strokeWidth={1} />
            <Path
              d={diamond(c, medallionY, 2) + diamond(c - 8, medallionY, 1.2) + diamond(c + 8, medallionY, 1.2)}
              fill={theme.surface}
              opacity={0.85}
            />
            <Circle cx={c} cy={c} r={4} fill={qiblaColor} />
            <Circle cx={c} cy={c} r={9} fill="none" stroke={qiblaColor} strokeWidth={1} opacity={0.5} />
          </G>
          {/* Kaaba inside a small lawh arch, upright along its radius. */}
          <G transform={`rotate(${bearing} ${marker.x} ${marker.y}) translate(${marker.x - mw / 2} ${marker.y - mh / 2})`}>
            <Path d={archPath(mw, mh, 0.55)} fill={facing ? theme.success : theme.accent} />
            <Rect x={mw * 0.27} y={mh * 0.42} width={mw * 0.46} height={mh * 0.42} rx={1.5} fill={theme.scrim} />
            <Rect x={mw * 0.27} y={mh * 0.5} width={mw * 0.46} height={2} fill={theme.glow} />
          </G>
        </Svg>
      </Animated.View>
    </View>
  );
}
