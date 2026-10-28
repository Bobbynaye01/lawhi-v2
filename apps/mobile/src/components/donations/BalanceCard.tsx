import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { fonts, lightPalette, radius, spacing } from '../../constants/theme';
import { Icon } from '../ui/Icon';
import { LogoMark } from '../ui/Layout';
import { LawhiText } from '../ui/Text';

/**
 * The card keeps the brand's deep green and lamp gold in both themes, like a
 * real bank card, so its contrast never depends on the colour scheme.
 */
const CARD = {
  from: '#2A6150',
  to: lightPalette.onPrimaryContainer,
  ink: lightPalette.onPrimary,
  gold: lightPalette.glow,
  goldDeep: lightPalette.accent,
};

/** "125000" → "125 000" (thin grouping, Latin digits in every language). */
export function groupDigits(amount: number): string {
  return Math.trunc(amount)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

/** DD/MM/YYYY, the format Mauritanian donors read on receipts. */
export function formatNumericDate(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

/** Gold contact chip, drawn like the EMV chip of a payment card. */
function Chip() {
  return (
    <Svg width={38} height={28} viewBox="0 0 38 28">
      <Defs>
        <LinearGradient id="chip" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={CARD.gold} />
          <Stop offset="1" stopColor={CARD.goldDeep} />
        </LinearGradient>
      </Defs>
      <Rect x={0.5} y={0.5} width={37} height={27} rx={5} fill="url(#chip)" />
      <Path
        d="M0.5 9.5h11M0.5 18.5h11M26.5 9.5h11M26.5 18.5h11M11.5 0.5v27M26.5 0.5v27M11.5 14h15"
        stroke={CARD.to}
        strokeOpacity={0.35}
        strokeWidth={1}
        fill="none"
      />
    </Svg>
  );
}

export function BalanceCard({ amount, updatedAt }: { amount: number; updatedAt: string | null }) {
  const { t } = useTranslation();
  const updated = updatedAt
    ? t('donations.updatedOn', { date: formatNumericDate(updatedAt) })
    : t('donations.notUpdatedYet');

  return (
    <View
      style={styles.card}
      accessible
      accessibilityRole="summary"
      accessibilityLabel={t('donations.balanceA11y', {
        amount: `${groupDigits(amount)} MRU`,
        updated,
      })}
    >
      {/* Gradient and large translucent circles for depth. */}
      <Svg
        style={StyleSheet.absoluteFill}
        viewBox="0 0 160 100"
        preserveAspectRatio="xMidYMid slice"
      >
        <Defs>
          <LinearGradient id="card" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={CARD.from} />
            <Stop offset="1" stopColor={CARD.to} />
          </LinearGradient>
        </Defs>
        <Rect width={160} height={100} fill="url(#card)" />
        <Circle cx={142} cy={6} r={52} fill={CARD.ink} fillOpacity={0.07} />
        <Circle cx={160} cy={58} r={34} fill={CARD.gold} fillOpacity={0.1} />
        <Circle cx={14} cy={104} r={46} fill={CARD.ink} fillOpacity={0.05} />
      </Svg>

      <View style={styles.row}>
        <View style={styles.brand}>
          <Chip />
          <LawhiText style={styles.wordmark}>LAWHI</LawhiText>
        </View>
        <Icon name="contactless" size={26} color={CARD.ink} strokeWidth={1.8} />
      </View>

      <View style={{ gap: spacing.xxs }}>
        <LawhiText variant="caption" style={[styles.ink, { opacity: 0.75 }]}>
          {t('donations.balanceLabel')}
        </LawhiText>
        <LawhiText style={styles.amount} numberOfLines={1} adjustsFontSizeToFit>
          {groupDigits(amount)}
        </LawhiText>
        <LawhiText variant="caption" style={[styles.ink, { opacity: 0.6, fontSize: 12 }]}>
          {updated}
        </LawhiText>
      </View>

      <View style={[styles.row, { alignItems: 'flex-end' }]}>
        <LawhiText style={styles.currency}>MRU</LawhiText>
        <LogoMark size={34} style={styles.logo} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    aspectRatio: 1.6,
    borderRadius: radius.xl,
    overflow: 'hidden',
    padding: spacing.lg + 2,
    justifyContent: 'space-between',
    backgroundColor: CARD.to,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  ink: { color: CARD.ink },
  wordmark: {
    color: CARD.ink,
    fontFamily: fonts.semiBold,
    fontSize: 14,
    letterSpacing: 5,
    writingDirection: 'ltr',
  },
  amount: {
    color: CARD.ink,
    fontFamily: fonts.displaySemiBold,
    fontSize: 40,
    lineHeight: 46,
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'],
    writingDirection: 'ltr',
    textAlign: 'left',
  },
  currency: {
    color: CARD.gold,
    fontFamily: fonts.bold,
    fontSize: 15,
    letterSpacing: 3,
    writingDirection: 'ltr',
  },
  logo: { borderRadius: radius.xs, overflow: 'hidden' },
});
