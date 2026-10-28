import { distanceToKaabaKm, isFacingQibla, qiblaBearing, qiblaRelativeAngle } from '@lawhi/shared';
import * as Haptics from 'expo-haptics';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TAB_BAR_SPACE } from '../../components/navigation/LawhiTabBar';
import { QiblaCompass } from '../../components/qibla/QiblaCompass';
import { Button, LawhiText, MessageState, Notice, Surface } from '../../components/ui';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { spacing } from '../../constants/theme';
import { useHeading } from '../../hooks/useHeading';
import { useTheme } from '../../hooks/useTheme';
import type { TabScreenProps } from '../../navigation/types';
import { useLocationStore } from '../../stores/locationStore';
import { useLocale } from '../../utils/localize';

export function QiblaScreen({ navigation }: TabScreenProps<'Qibla'>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const locale = useLocale();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const place = useLocationStore((s) => s.place);
  const heading = useHeading();
  const wasFacing = useRef(false);

  const bearing = place ? qiblaBearing(place.latitude, place.longitude) : null;
  const facing =
    bearing !== null && heading.status === 'ok' && isFacingQibla(bearing, heading.heading);

  useEffect(() => {
    if (facing && !wasFacing.current)
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
        () => undefined,
      );
    wasFacing.current = facing;
  }, [facing]);

  if (!place || bearing === null) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.background }}>
        <ScreenHeader title={t('tabs.qibla')} />
        <MessageState
          title={t('qibla.needLocationTitle')}
          message={t('qibla.needLocationMessage')}
          actionLabel={t('prayer.chooseLocation')}
          onAction={() => navigation.navigate('Prayer')}
        />
      </View>
    );
  }

  const roundedBearing = Math.round(bearing);
  const live = heading.status === 'ok';
  // Shortest way to turn: clockwise up to 180°, otherwise counter-clockwise.
  const guidance = (() => {
    if (!live) return '';
    if (facing) return t('qibla.facing');
    const rel = Math.round(qiblaRelativeAngle(bearing, heading.heading));
    return rel <= 180
      ? t('qibla.turnRight', { degrees: rel })
      : t('qibla.turnLeft', { degrees: 360 - rel });
  })();
  const distance = Math.round(distanceToKaabaKm(place.latitude, place.longitude));
  const dial = Math.min(width - spacing.xl * 2, height * 0.42, 340);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={{ paddingBottom: TAB_BAR_SPACE + insets.bottom + spacing.lg }}
      showsVerticalScrollIndicator={false}
    >
      <ScreenHeader overline={place.name} title={t('tabs.qibla')} />

      <View
        style={styles.stage}
        accessible
        accessibilityLabel={live ? guidance : t('qibla.bearing', { degrees: roundedBearing })}
      >
        <QiblaCompass size={dial} heading={live ? heading.heading : 0} bearing={bearing} facing={facing} />
        <LawhiText
          variant="title"
          tone={facing ? 'success' : 'primary'}
          style={{ textAlign: 'center', minHeight: 30 }}
          accessibilityLiveRegion="polite"
        >
          {live ? guidance : heading.status === 'starting' ? t('qibla.starting') : ''}
        </LawhiText>
      </View>

      <View style={styles.body}>
        <View style={styles.stats}>
          <Surface style={styles.stat}>
            <LawhiText variant="overline" tone="muted">
              {t('qibla.direction')}
            </LawhiText>
            <LawhiText variant="numeralLarge">{roundedBearing}°</LawhiText>
            <LawhiText variant="caption" tone="secondary">
              {t('qibla.fromNorth')}
            </LawhiText>
          </Surface>
          <Surface style={styles.stat}>
            <LawhiText variant="overline" tone="muted">
              {t('qibla.distanceShort')}
            </LawhiText>
            <LawhiText variant="numeralLarge" numberOfLines={1} adjustsFontSizeToFit>
              {new Intl.NumberFormat(locale === 'ar' ? 'ar-u-nu-latn' : locale).format(distance)}
            </LawhiText>
            <LawhiText variant="caption" tone="secondary">
              km
            </LawhiText>
          </Surface>
        </View>

        {live && heading.accuracy < 2 ? <Notice tone="warning">{t('qibla.calibrate')}</Notice> : null}
        {live ? (
          <LawhiText variant="caption" tone="muted" style={{ textAlign: 'center' }}>
            {t('qibla.interference')}
          </LawhiText>
        ) : null}
        {heading.status === 'denied' ? (
          <>
            <Notice tone="warning">{t('qibla.permissionDenied')}</Notice>
            <Button
              title={t('common.openSettings')}
              variant="secondary"
              onPress={() => void Linking.openSettings()}
            />
          </>
        ) : null}
        {heading.status === 'unsupported' ? (
          <>
            <Notice tone="warning">{t('qibla.noSensor', { degrees: roundedBearing })}</Notice>
            <LawhiText variant="caption" tone="muted" style={{ textAlign: 'center' }}>
              {t('qibla.staticHint')}
            </LawhiText>
          </>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  stage: { alignItems: 'center', gap: spacing.lg, paddingVertical: spacing.lg },
  body: { paddingHorizontal: spacing.lg, gap: spacing.md },
  stats: { flexDirection: 'row', gap: spacing.md },
  stat: { flex: 1, gap: 2 },
});
