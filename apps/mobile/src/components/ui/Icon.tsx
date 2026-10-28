import {
  ALargeSmall,
  ArrowUpRight,
  BellRing,
  Bookmark,
  BookOpen,
  BookOpenText,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Compass,
  Copy,
  Download,
  FileText,
  HandHeart,
  Heart,
  House,
  Image,
  Library,
  LogIn,
  MapPin,
  Minus,
  Moon,
  Navigation2,
  Nfc,
  Pause,
  Pencil,
  Play,
  Plus,
  RotateCcw,
  Search,
  Settings2,
  SkipBack,
  SkipForward,
  Sparkles,
  Square,
  Star,
  SunMedium,
  Trash2,
  Volume2,
  X,
  type LucideIcon,
  type LucideProps,
} from 'lucide-react-native';
import type { ComponentType } from 'react';
import { I18nManager } from 'react-native';
import Svg, { Circle, Ellipse, G, Path } from 'react-native-svg';
import { useTheme } from '../../hooks/useTheme';

/** The Kaaba in three-quarter view: kiswa band and raised door, on Lucide's 24-unit grid. */
function Kaaba({ size = 24, color = 'currentColor', strokeWidth = 2, style }: LucideProps) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
    >
      <Path d="M3 9.5 11 6l10 2.5v11L13 23 3 19.5z" />
      <Path d="M3 9.5 13 12l8-3.5M13 12v11" />
      <Path d="M3 12.5 13 15l8-3.5" />
      <Path d="M6.5 14.9v3.2l3 .75v-3.2" />
    </Svg>
  );
}

/** Two human hands joined in du'a, a misbaha hanging between them. Drawn on a 48-unit grid. */
const LEFT_HAND =
  'M24 46V34L23.6 21A2 2 0 0 0 19.6 20.8L19.8 27L19.6 14A2.1 2.1 0 0 0 15.4 13.8L15.6 26' +
  'L15.4 11.5A2.1 2.1 0 0 0 11.2 11.4L11.4 26L11 14A2.1 2.1 0 0 0 6.8 14L6.8 29.5' +
  'L4.4 26A2 2 0 0 0 1.2 28.4L5.6 35.5Q8 40.5 11.5 43V46';
const RIGHT_HAND =
  'M24 46V34L24.4 21A2 2 0 0 1 28.4 20.8L28.2 27L28.4 14A2.1 2.1 0 0 1 32.6 13.8L32.4 26' +
  'L32.6 11.5A2.1 2.1 0 0 1 36.8 11.4L36.6 26L37 14A2.1 2.1 0 0 1 41.2 14L41.2 29.5' +
  'L43.6 26A2 2 0 0 1 46.8 28.4L42.4 35.5Q40 40.5 36.5 43V46';

/** Misbaha beads: a loop open at the bottom, where the lead bead and tassel hang. */
const BEADS = Array.from({ length: 11 }, (_, i) => {
  const a = ((i < 6 ? i : i + 1) * Math.PI) / 6;
  return [24 + 2.6 * Math.sin(a), 22.5 - 5.2 * Math.cos(a)] as const;
});

function Dua({ size = 24, color = 'currentColor', strokeWidth = 2, style }: LucideProps) {
  // Twice Lucide's grid, so strokes are scaled to keep the family's weight.
  const stroke = Number(strokeWidth) * 1.6;
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      stroke={color}
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
    >
      <G transform="translate(2.4 2.2) scale(0.9)">
        <Path d={LEFT_HAND} transform="rotate(-10 24 46)" />
        <Path d={RIGHT_HAND} transform="rotate(10 24 46)" />
      </G>
      <G fill={color} stroke="none">
        {BEADS.map(([cx, cy], i) => (
          <Circle key={i} cx={cx} cy={cy} r={1.15} />
        ))}
        <Ellipse cx={24} cy={28.1} rx={1.25} ry={1.7} />
      </G>
      <Path d="M24 29.7v1.6M24 31.3l-1.3 2.4M24 31.3l1.3 2.4M24 31.3v2.6" strokeWidth={stroke * 0.7} />
    </Svg>
  );
}

/** The single icon family of Lawhi: Lucide, thin strokes. */
const ICONS = {
  arrowUpRight: ArrowUpRight,
  bell: BellRing,
  bookmark: Bookmark,
  book: BookOpen,
  bookText: BookOpenText,
  check: Check,
  chevronBack: ChevronLeft,
  chevronForward: ChevronRight,
  clock: Clock3,
  compass: Compass,
  copy: Copy,
  download: Download,
  file: FileText,
  donate: HandHeart,
  heart: Heart,
  home: House,
  image: Image,
  library: Library,
  login: LogIn,
  pin: MapPin,
  minus: Minus,
  moon: Moon,
  navigation: Navigation2,
  contactless: Nfc,
  edit: Pencil,
  pause: Pause,
  play: Play,
  plus: Plus,
  reset: RotateCcw,
  search: Search,
  settings: Settings2,
  previous: SkipBack,
  next: SkipForward,
  stop: Square,
  sparkles: Sparkles,
  adhkar: Dua,
  kaaba: Kaaba,
  star: Star,
  sun: SunMedium,
  trash: Trash2,
  volume: Volume2,
  close: X,
  textSize: ALargeSmall,
} satisfies Record<string, LucideIcon | ComponentType<LucideProps>>;

export type IconName = keyof typeof ICONS;

/** Icons whose meaning is directional and must mirror in right-to-left layouts. */
const DIRECTIONAL = new Set<IconName>(['chevronBack', 'chevronForward', 'arrowUpRight']);

export function Icon({
  name,
  size = 22,
  color,
  strokeWidth = 1.6,
  filled = false,
}: {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
  filled?: boolean;
}) {
  const theme = useTheme();
  const Component = ICONS[name];
  const tint = color ?? theme.textPrimary;
  return (
    <Component
      size={size}
      color={tint}
      strokeWidth={strokeWidth}
      fill={filled ? tint : 'none'}
      style={DIRECTIONAL.has(name) && I18nManager.isRTL ? { transform: [{ scaleX: -1 }] } : undefined}
    />
  );
}
