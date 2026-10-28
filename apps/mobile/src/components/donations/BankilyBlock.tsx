import * as Clipboard from 'expo-clipboard';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { fonts, radius, spacing } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';
import { Button } from '../ui/Buttons';
import { Surface } from '../ui/Surface';
import { LawhiText } from '../ui/Text';

/** "22334455" → "22 33 44 55", the way numbers are read aloud in Mauritania. */
export function formatPhone(phone: string): string {
  return phone.replace(/(\d{2})(?=\d)/g, '$1 ');
}

export function BankilyBlock({ phone }: { phone: string | null }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2500);
    return () => clearTimeout(timer);
  }, [copied]);

  return (
    <Surface variant="elevated" style={styles.block}>
      <LawhiText variant="subtitle">{t('donations.giveTitle')}</LawhiText>
      {phone ? (
        <>
          <LawhiText tone="secondary">{t('donations.giveViaBankily')}</LawhiText>
          <View style={[styles.numberRow, { backgroundColor: theme.surfaceSunken }]}>
            <LawhiText style={[styles.number, { color: theme.textPrimary }]} selectable>
              {formatPhone(phone)}
            </LawhiText>
            <Button
              title={t('donations.copy')}
              icon="copy"
              variant="secondary"
              accessibilityHint={t('donations.copyNumberA11y', { number: formatPhone(phone) })}
              onPress={async () => {
                await Clipboard.setStringAsync(phone);
                setCopied(true);
              }}
            />
          </View>
          <View accessibilityLiveRegion="polite" style={{ minHeight: 20 }}>
            {copied ? (
              <LawhiText variant="caption" style={{ color: theme.success }}>
                {t('donations.numberCopied')}
              </LawhiText>
            ) : null}
          </View>
        </>
      ) : (
        <LawhiText tone="secondary">{t('donations.noBankily')}</LawhiText>
      )}
    </Surface>
  );
}

const styles = StyleSheet.create({
  block: { borderRadius: radius.xl, padding: spacing.lg, gap: spacing.sm },
  numberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingStart: spacing.lg,
    paddingEnd: spacing.sm,
  },
  number: {
    flex: 1,
    fontFamily: fonts.displaySemiBold,
    fontSize: 24,
    letterSpacing: 1,
    fontVariant: ['tabular-nums'],
    writingDirection: 'ltr',
  },
});
