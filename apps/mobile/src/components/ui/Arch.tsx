import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, {
  ClipPath,
  Defs,
  Image as SvgImage,
  LinearGradient,
  Path,
  Rect,
  Stop,
} from 'react-native-svg';

 
export const LAWH_IMAGE = require('../../../assets/intro/lawh.webp');
 

/**
 * Silhouette of the lawh — Lawhi's signature shape: straight sides and a soft
 * dome. `dome` is the height of the rounded top relative to the width.
 */
export function archPath(width: number, height: number, dome = 0.62): string {
  const r = Math.min(height, width * dome);
  const w = width;
  return [
    `M0 ${height}`,
    `V${r}`,
    `C0 ${r * 0.38} ${w * 0.2} 0 ${w / 2} 0`,
    `C${w * 0.8} 0 ${w} ${r * 0.38} ${w} ${r}`,
    `V${height}`,
    'Z',
  ].join(' ');
}

/** Outline or filled arch, used as a frame or indicator. */
export function ArchShape({
  width,
  height,
  fill = 'none',
  stroke,
  strokeWidth = 1,
  dome,
  style,
}: {
  width: number;
  height: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  dome?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const inset = stroke ? strokeWidth / 2 : 0;
  return (
    <Svg width={width} height={height} style={style}>
      <Path
        d={archPath(width - inset * 2, height - inset * 2, dome)}
        transform={`translate(${inset} ${inset})`}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
      />
    </Svg>
  );
}

/**
 * A miniature lawh carved from the real photograph: the wood is clipped to the
 * arch, lit from the top, and children are laid over it like ink on wood.
 */
export function MiniLawh({
  width,
  height,
  children,
  style,
  id = 'lawh',
}: {
  width: number;
  height: number;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  id?: string;
}) {
  const d = archPath(width, height, 0.7);
  return (
    <View style={[{ width, height }, style]}>
      <Svg width={width} height={height} style={{ position: 'absolute' }}>
        <Defs>
          <ClipPath id={`${id}-clip`}>
            <Path d={d} />
          </ClipPath>
          <LinearGradient id={`${id}-light`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#FFE7B8" stopOpacity={0.28} />
            <Stop offset="0.45" stopColor="#FFE7B8" stopOpacity={0} />
            <Stop offset="1" stopColor="#1A0F07" stopOpacity={0.32} />
          </LinearGradient>
        </Defs>
        <SvgImage
          href={LAWH_IMAGE}
          x={-width * 0.18}
          y={-height * 0.06}
          width={width * 1.36}
          height={height * 1.12}
          preserveAspectRatio="xMidYMid slice"
          clipPath={`url(#${id}-clip)`}
        />
        <Rect width={width} height={height} fill={`url(#${id}-light)`} clipPath={`url(#${id}-clip)`} />
        <Path d={d} fill="none" stroke="#2A170B" strokeOpacity={0.35} strokeWidth={1} />
      </Svg>
      {children}
    </View>
  );
}
