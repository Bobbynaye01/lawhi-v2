import { formatMRU, type CauseStatus } from '@lawhi/shared';
import { useTranslation } from 'react-i18next';
import { Image, StyleSheet, View } from 'react-native';
import { radius, spacing } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';
import { mediaUrl, type Cause } from '../../services/api/endpoints';
import { localized, useLocale } from '../../utils/localize';
import { ProgressBar } from '../ui/Progress';
import { Surface } from '../ui/Surface';
import { LawhiText } from '../ui/Text';
import { formatNumericDate } from './BalanceCard';

/** Event dates are calendar days stored at midnight UTC: read them in UTC. */
function eventDay(iso: string): string {
  return formatNumericDate(iso.slice(0, 10) + 'T12:00:00');
}

export function StatusPill({ status }: { status: CauseStatus }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const colors: Record<CauseStatus, { bg: string; fg: string }> = {
    upcoming: { bg: theme.secondaryContainer, fg: theme.secondary },
    ongoing: { bg: theme.accentSoft, fg: theme.warning },
    completed: { bg: theme.primaryContainer, fg: theme.onPrimaryContainer },
  };
  return (
    <View style={[styles.pill, { backgroundColor: colors[status].bg }]}>
      <LawhiText variant="caption" style={{ color: colors[status].fg, fontSize: 12 }}>
        {t(`donations.causeStatus.${status}`)}
      </LawhiText>
    </View>
  );
}

export function CauseCard({ cause }: { cause: Cause }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const locale = useLocale();
  const progress = cause.goalAmount ? Math.min(1, cause.collectedAmount / cause.goalAmount) : null;

  return (
    <Surface variant={cause.featured ? 'elevated' : 'plain'} padded={false} style={styles.card}>
      {cause.imageUrl ? (
        <Image
          source={{ uri: mediaUrl(cause.imageUrl) }}
          style={[styles.image, { backgroundColor: theme.surfaceSunken }]}
          resizeMode="cover"
          accessibilityIgnoresInvertColors
        />
      ) : null}
      <View style={styles.body}>
        <View style={styles.meta}>
          <StatusPill status={cause.status} />
          {cause.eventDate ? (
            <LawhiText variant="caption" tone="muted">
              {eventDay(cause.eventDate)}
            </LawhiText>
          ) : null}
        </View>
        <LawhiText variant="title">{localized(cause, 'title', locale)}</LawhiText>
        <LawhiText tone="secondary">{localized(cause, 'description', locale)}</LawhiText>
        {progress !== null ? (
          <View style={{ gap: spacing.xs, marginTop: spacing.xs }}>
            <ProgressBar
              value={progress}
              color={theme.success}
              height={5}
              accessibilityLabel={`${Math.round(progress * 100)} %`}
            />
            <LawhiText variant="caption" tone="secondary">
              {t('donations.goalProgress', {
                collected: formatMRU(cause.collectedAmount),
                goal: formatMRU(cause.goalAmount!),
              })}
            </LawhiText>
          </View>
        ) : null}
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.xl, overflow: 'hidden' },
  image: { width: '100%', aspectRatio: 16 / 9 },
  body: { padding: spacing.lg, gap: spacing.sm },
  meta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  pill: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xxs + 1,
  },
});
