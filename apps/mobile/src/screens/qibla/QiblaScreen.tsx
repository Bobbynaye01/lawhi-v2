import { Ionicons } from '@expo/vector-icons';
import { distanceToKaabaKm, isFacingQibla, qiblaBearing, qiblaRelativeAngle } from '@lawhi/shared';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { AppText, Button, Card, MessageState, Notice, Screen } from '../../components/ui';
import { spacing } from '../../constants/theme';
import { useHeading } from '../../hooks/useHeading';
import { useTheme } from '../../hooks/useTheme';
import type { TabScreenProps } from '../../navigation/types';
import { useLocationStore } from '../../stores/locationStore';

const DIAL = 260;

export function QiblaScreen({ navigation }: TabScreenProps<'Qibla'>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const place = useLocationStore((s) => s.place);
  const heading = useHeading();
  const wasFacing = useRef(false);

  const bearing = place ? qiblaBearing(place.latitude, place.longitude) : null;
  const facing = bearing !== null && heading.status === 'ok' && isFacingQibla(bearing, heading.heading);

  useEffect(() => {
    if (facing && !wasFacing.current) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    wasFacing.current = facing;
  }, [facing]);

  if (!place || bearing === null) {
    return (
      <Screen scroll={false}>
        <MessageState
          title={t('qibla.needLocationTitle')}
          message={t('qibla.needLocationMessage')}
          actionLabel={t('prayer.chooseLocation')}
          onAction={() => navigation.navigate('Prayer')}
        />
      </Screen>
    );
  }

  const roundedBearing = Math.round(bearing);
  // Shortest way to turn: clockwise up to 180°, otherwise counter-clockwise.
  const guidance = () => {
    if (heading.status !== 'ok') return '';
    if (facing) return t('qibla.facing');
    const rel = Math.round(qiblaRelativeAngle(bearing, heading.heading));
    return rel <= 180 ? t('qibla.turnRight', { degrees: rel }) : t('qibla.turnLeft', { degrees: 360 - rel });
  };
  const distance = Math.round(distanceToKaabaKm(place.latitude, place.longitude));

  return (
    <Screen edges={[]} contentStyle={{ alignItems: 'stretch' }}>
      <Card>
        <AppText variant="heading">{place.name}</AppText>
        <AppText>{t('qibla.bearing', { degrees: roundedBearing })}</AppText>
        <AppText variant="small">{t('qibla.distance', { km: distance })}</AppText>
      </Card>

      {heading.status === 'ok' ? (
        <>
          <View style={styles.dialWrap} accessible accessibilityLabel={guidance()}>
            {/* The dial turns with the phone so north stays north; the Kaaba marker sits at the Qibla bearing. */}
            <View
              style={[
                styles.dial,
                { borderColor: facing ? theme.success : theme.border, transform: [{ rotate: `${-heading.heading}deg` }] },
              ]}
            >
              <AppText style={[styles.north, { color: theme.danger }]}>N</AppText>
              <View style={[styles.qiblaArm, { transform: [{ rotate: `${bearing}deg` }] }]}>
                <Ionicons name="arrow-up" size={44} color={facing ? theme.success : theme.accent} />
              </View>
            </View>
            <View style={[styles.phoneMarker, { backgroundColor: theme.primary }]} />
          </View>
          <AppText variant="heading" style={{ textAlign: 'center', color: facing ? theme.success : theme.text }}>
            {guidance()}
          </AppText>
          {heading.accuracy < 2 ? <Notice tone="warning">{t('qibla.calibrate')}</Notice> : null}
          <AppText variant="small">{t('qibla.interference')}</AppText>
        </>
      ) : heading.status === 'starting' ? (
        <AppText style={{ textAlign: 'center' }}>{t('qibla.starting')}</AppText>
      ) : heading.status === 'denied' ? (
        <>
          <Notice tone="warning">{t('qibla.permissionDenied')}</Notice>
          <Button title={t('common.openSettings')} variant="secondary" onPress={() => void Linking.openSettings()} />
        </>
      ) : (
        <Notice tone="warning">{t('qibla.noSensor', { degrees: roundedBearing })}</Notice>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  dialWrap: { alignItems: 'center', justifyContent: 'center', marginVertical: spacing.xl },
  dial: {
    width: DIAL,
    height: DIAL,
    borderRadius: DIAL / 2,
    borderWidth: 4,
    alignItems: 'center',
  },
  north: { fontSize: 20, fontWeight: '700', marginTop: spacing.sm },
  qiblaArm: {
    position: 'absolute',
    width: DIAL,
    height: DIAL,
    alignItems: 'center',
    paddingTop: spacing.xl,
  },
  phoneMarker: { position: 'absolute', top: -14, width: 6, height: 28, borderRadius: 3 },
});
