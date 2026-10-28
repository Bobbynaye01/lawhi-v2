import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, {
  ClipPath,
  Defs,
  G,
  Image as SvgImage,
  LinearGradient,
  Mask,
  Path,
  Rect,
  Stop,
} from 'react-native-svg';
import { lightPalette, spacing } from '../../constants/theme';
import { LAWH_IMAGE } from '../ui/Arch';
import { ArabicText, LawhiText } from '../ui/Text';

/**
 * The reader's lawh is the very board of the intro photograph
 * (assets/intro/lawh.webp, 361 × 639 px), cut out along its real contour:
 * straight sides, an elliptical dome and softly rounded bottom corners.
 * Measured on the photo, in pixels.
 */
const PHOTO = { width: 361, height: 639 };
const BOARD = { x: 51, y: 29, width: 254, height: 576, dome: 155, corner: 18 };

/** Black ink, slightly warm, as it sits on the wood. */
export const LAWH_INK = '#1B1009';
export const LAWH_INK_FADED = 'rgba(27, 16, 9, 0.62)';
export const LAWH_SCRIM = lightPalette.scrim;

const KAPPA = 0.58; // the dome is a slightly squared ellipse

/** Board placement on screen: the photo is scaled uniformly, never stretched. */
export type LawhLayout = { x: number; y: number; width: number; height: number; dome: number; scale: number };

export function lawhLayout(stageWidth: number, top: number): LawhLayout {
  const width = Math.min(stageWidth - spacing.lg * 2, 560);
  const scale = width / BOARD.width;
  return {
    x: (stageWidth - width) / 2,
    y: top,
    width,
    height: BOARD.height * scale,
    dome: BOARD.dome * scale,
    scale,
  };
}

function boardPath({ x, y, width: w, height: h, dome, scale }: LawhLayout): string {
  const a = w / 2;
  const c = BOARD.corner * scale;
  return [
    `M${x} ${y + h - c}`,
    `V${y + dome}`,
    `C${x} ${y + dome * (1 - KAPPA)} ${x + a * (1 - KAPPA)} ${y} ${x + a} ${y}`,
    `C${x + a * (1 + KAPPA)} ${y} ${x + w} ${y + dome * (1 - KAPPA)} ${x + w} ${y + dome}`,
    `V${y + h - c}`,
    `Q${x + w} ${y + h} ${x + w - c} ${y + h}`,
    `H${x + c}`,
    `Q${x} ${y + h} ${x} ${y + h - c}`,
    'Z',
  ].join(' ');
}

/** The photograph, scaled so its board lands exactly on the layout. */
function Photo({ l, clipPath }: { l: LawhLayout; clipPath?: string }) {
  return (
    <SvgImage
      href={LAWH_IMAGE}
      x={l.x - BOARD.x * l.scale}
      y={l.y - BOARD.y * l.scale}
      width={PHOTO.width * l.scale}
      height={PHOTO.height * l.scale}
      preserveAspectRatio="none"
      clipPath={clipPath}
    />
  );
}

/** Wood cut from the photo, a light clay wash for the ink, lamp light from above. */
function Board({ l, id }: { l: LawhLayout; id: string }) {
  const d = boardPath(l);
  return (
    <G>
      <Defs>
        <ClipPath id={`${id}-clip`}>
          <Path d={d} />
        </ClipPath>
        <LinearGradient id={`${id}-wash`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FBF4E6" stopOpacity={0.7} />
          <Stop offset="0.4" stopColor="#FBF4E6" stopOpacity={0.64} />
          <Stop offset="1" stopColor="#FBF4E6" stopOpacity={0.6} />
        </LinearGradient>
        <LinearGradient id={`${id}-edges`} x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#140A04" stopOpacity={0.32} />
          <Stop offset="0.1" stopColor="#140A04" stopOpacity={0} />
          <Stop offset="0.9" stopColor="#140A04" stopOpacity={0} />
          <Stop offset="1" stopColor="#140A04" stopOpacity={0.32} />
        </LinearGradient>
      </Defs>
      <Photo l={l} clipPath={`url(#${id}-clip)`} />
      <Path d={d} fill={`url(#${id}-wash)`} />
      <Path d={d} fill={`url(#${id}-edges)`} />
    </G>
  );
}

/**
 * The scene behind the text: the same stone, straw and board as the intro,
 * the surroundings left in the lamp's shadow so the board carries the light.
 */
export function LawhStage({ width, height, layout }: { width: number; height: number; layout: LawhLayout }) {
  const d = boardPath(layout);
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="stage-shade" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={LAWH_SCRIM} stopOpacity={1} />
            <Stop offset="0.12" stopColor={LAWH_SCRIM} stopOpacity={0.6} />
            <Stop offset="0.7" stopColor={LAWH_SCRIM} stopOpacity={0.6} />
            <Stop offset="1" stopColor={LAWH_SCRIM} stopOpacity={0.85} />
          </LinearGradient>
        </Defs>
        <Rect width={width} height={height} fill={LAWH_SCRIM} />
        <Photo l={layout} />
        <Rect width={width} height={height} fill="url(#stage-shade)" />
        <Board l={layout} id="stage" />
        <Path d={d} fill="none" stroke="#120803" strokeOpacity={0.55} strokeWidth={1.2} />
      </Svg>
    </View>
  );
}

/**
 * Laid over the text: the identical wood, visible only above and below the
 * writing window, so verses rise out of the board and sink back into it.
 */
export function LawhVeil({
  width,
  height,
  layout,
  top,
  bottom,
  fadeTop = 28,
  fadeBottom = 40,
}: {
  width: number;
  height: number;
  layout: LawhLayout;
  top: number;
  bottom: number;
  fadeTop?: number;
  fadeBottom?: number;
}) {
  const at = (y: number) => Math.min(1, Math.max(0, y / height));
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="veil-fade" x1="0" y1="0" x2="0" y2={height} gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor="#fff" />
            <Stop offset={at(top)} stopColor="#fff" />
            <Stop offset={at(top + fadeTop)} stopColor="#000" />
            <Stop offset={at(bottom - fadeBottom)} stopColor="#000" />
            <Stop offset={at(bottom)} stopColor="#fff" />
            <Stop offset="1" stopColor="#fff" />
          </LinearGradient>
          <Mask id="veil-mask" x="0" y="0" width={width} height={height} maskUnits="userSpaceOnUse">
            <Rect width={width} height={height} fill="url(#veil-fade)" />
          </Mask>
        </Defs>
        <G mask="url(#veil-mask)">
          <Board l={layout} id="veil" />
        </G>
      </Svg>
    </View>
  );
}

/** Heading written in the dome: the surah being read, like the top of a lawh. */
export function LawhDomeTitle({
  layout,
  name,
  caption,
  previous,
  next,
}: {
  layout: LawhLayout;
  name: string;
  caption: string;
  /** Arrows on either side of the name; omitted at the first / last surah. */
  previous?: { label: string; onPress: () => void };
  next?: { label: string; onPress: () => void };
}) {
  const size = Math.min(30, layout.dome * 0.17);
  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        top: layout.y + layout.dome * 0.14,
        left: layout.x + layout.width * 0.15,
        width: layout.width * 0.7,
        alignItems: 'center',
      }}
    >
      <View style={styles.domeRow} pointerEvents="box-none">
        <DomeArrow side="left" target={previous} />
        <View style={{ flex: 1, minHeight: Math.round(size * 2.05), justifyContent: 'center' }} pointerEvents="none">
          <ArabicText quran size={size} numberOfLines={1} style={[styles.ink, { textAlign: 'center' }]}>
            {name}
          </ArabicText>
        </View>
        <DomeArrow side="right" target={next} />
      </View>
      <LawhiText variant="caption" numberOfLines={1} style={styles.domeCaption} pointerEvents="none">
        {caption}
      </LawhiText>
    </View>
  );
}

/** An ink ring on the wood with a drawn arrowhead; never mirrored, the lawh reads the same in every language. */
function DomeArrow({
  side,
  target,
}: {
  side: 'left' | 'right';
  target?: { label: string; onPress: () => void };
}) {
  if (!target) return <View style={styles.domeArrowSpace} />;
  const head = side === 'left' ? 'M14.5 7 L9 12 L14.5 17' : 'M9.5 7 L15 12 L9.5 17';
  return (
    <Pressable
      onPress={target.onPress}
      accessibilityRole="button"
      accessibilityLabel={target.label}
      hitSlop={8}
      style={({ pressed }) => [styles.domeArrow, pressed ? styles.domeArrowPressed : null]}
    >
      <Svg width={24} height={24} viewBox="0 0 24 24">
        <Path d={head} fill="none" stroke={LAWH_INK} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </Pressable>
  );
}

/** Opening of a surah inside the flow of writing: ink rule, name, basmala. */
export function LawhSurahOpening({
  nameAr,
  subtitle,
  basmala,
  basmalaSize,
}: {
  nameAr: string;
  subtitle: string;
  basmala: string | null;
  basmalaSize: number;
}) {
  return (
    <View style={styles.opening} accessibilityRole="header">
      <InkRule />
      <ArabicText quran size={28} style={[styles.ink, { textAlign: 'center' }]}>
        {`سورة ${nameAr}`}
      </ArabicText>
      <LawhiText variant="caption" style={styles.openingCaption}>
        {subtitle}
      </LawhiText>
      {basmala ? (
        <ArabicText quran size={basmalaSize} style={[styles.ink, { textAlign: 'center', marginTop: spacing.sm }]}>
          {basmala}
        </ArabicText>
      ) : null}
    </View>
  );
}

function InkRule() {
  return (
    <View style={styles.rule}>
      <View style={styles.ruleLine} />
      <View style={styles.ruleDot} />
      <View style={styles.ruleLine} />
    </View>
  );
}

/** Ink text helper for verses: black ink with a faint bleed into the grain. */
export function InkText({ size, children }: { size: number; children: ReactNode }) {
  return (
    <ArabicText quran size={size} style={styles.ink}>
      {children}
    </ArabicText>
  );
}

const styles = StyleSheet.create({
  ink: {
    color: LAWH_INK,
    textShadowColor: 'rgba(40, 20, 8, 0.35)',
    textShadowRadius: 1,
    textShadowOffset: { width: 0, height: 0 },
  },
  domeRow: { flexDirection: 'row', direction: 'ltr', alignItems: 'center', alignSelf: 'stretch', gap: spacing.xs },
  domeArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.2,
    borderColor: 'rgba(27, 16, 9, 0.4)',
    backgroundColor: 'rgba(255, 250, 240, 0.35)',
  },
  domeArrowSpace: { width: 36, height: 36 },
  domeArrowPressed: { backgroundColor: 'rgba(27, 16, 9, 0.12)' },
  domeCaption: { color: LAWH_INK_FADED, textAlign: 'center' },
  opening: { alignItems: 'center', gap: spacing.xxs, paddingTop: spacing.xl, paddingBottom: spacing.md },
  openingCaption: { color: LAWH_INK_FADED, textAlign: 'center' },
  rule: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm, opacity: 0.6 },
  ruleLine: { width: 56, height: 1.5, borderRadius: 1, backgroundColor: LAWH_INK },
  ruleDot: { width: 6, height: 6, transform: [{ rotate: '45deg' }], backgroundColor: LAWH_INK },
});
