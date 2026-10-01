import { Ionicons } from '@expo/vector-icons';
import { PRAYER_METHODS, type Locale } from '@lawhi/shared';
import Constants from 'expo-constants';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, StyleSheet, View } from 'react-native';
import { ActionSheet } from '../../components/ActionSheet';
import { AppText, Button, Card, ListRow, Screen, SectionTitle, Segmented } from '../../components/ui';
import { fonts, spacing } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';
import { changeLanguage } from '../../i18n';
import type { RootScreenProps } from '../../navigation/types';
import { contentRepository } from '../../repositories/contentRepository';
import { quranRepository } from '../../repositories/quranRepository';
import { cachedAudioSizeBytes, clearAudioCache } from '../../services/audio/audioCache';
import { FONT_SCALE, useSettingsStore } from '../../stores/settingsStore';
import { localized, useLocale } from '../../utils/localize';

export function SettingsScreen({ navigation }: RootScreenProps<'Settings'>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const locale = useLocale();
  const s = useSettingsStore();
  const [picker, setPicker] = useState<'method' | 'reciter' | null>(null);
  const [cacheBytes, setCacheBytes] = useState(() => cachedAudioSizeBytes());

  const reciters = contentRepository.reciters(s.riwaya);
  const reciterId = s.reciterByRiwaya[s.riwaya];
  const reciter = reciters.find((r) => r.id === reciterId);

  const setLanguage = (value: Locale) => {
    s.setLocale(value);
    void changeLanguage(value);
  };

  return (
    <Screen>
      <SectionTitle>{t('settings.language')}</SectionTitle>
      <Segmented
        label={t('settings.language')}
        value={locale}
        onChange={setLanguage}
        options={[
          { value: 'ar', label: 'العربية' },
          { value: 'fr', label: 'Français' },
          { value: 'en', label: 'English' },
        ]}
      />
      {Platform.OS !== 'web' ? <AppText variant="small">{t('settings.languageRestart')}</AppText> : null}

      <SectionTitle>{t('settings.appearance')}</SectionTitle>
      <Segmented
        label={t('settings.appearance')}
        value={s.theme}
        onChange={s.setTheme}
        options={[
          { value: 'system', label: t('settings.themes.system') },
          { value: 'light', label: t('settings.themes.light') },
          { value: 'dark', label: t('settings.themes.dark') },
        ]}
      />

      <SectionTitle>{t('settings.quran')}</SectionTitle>
      <Segmented
        label={t('quran.riwayaLabel')}
        value={s.riwaya}
        onChange={s.setRiwaya}
        options={[
          { value: 'hafs', label: t('quran.riwaya.hafs') },
          { value: 'warsh', label: t('quran.riwaya.warsh') },
        ]}
      />
      <Card style={{ padding: 0 }}>
        <ListRow
          title={t('settings.reciter')}
          subtitle={reciter ? localized(reciter, 'name', locale) : t('quran.audio.noReciterForRiwaya')}
          onPress={reciters.length > 0 ? () => setPicker('reciter') : undefined}
          trailing={reciters.length > 0 ? <Ionicons name="chevron-forward" size={18} color={theme.textMuted} /> : null}
        />
      </Card>
      <AppText variant="muted">{t('settings.textSize')}</AppText>
      <View style={styles.sizeRow}>
        <Button
          title="A−"
          variant="secondary"
          disabled={s.quranFontScale <= FONT_SCALE.min}
          onPress={() => s.setQuranFontScale(s.quranFontScale - FONT_SCALE.step)}
          accessibilityHint={t('quran.smallerText')}
        />
        <AppText style={{ flex: 1, textAlign: 'center' }}>{Math.round(s.quranFontScale * 100)}%</AppText>
        <Button
          title="A+"
          variant="secondary"
          disabled={s.quranFontScale >= FONT_SCALE.max}
          onPress={() => s.setQuranFontScale(s.quranFontScale + FONT_SCALE.step)}
          accessibilityHint={t('quran.largerText')}
        />
      </View>
      <AppText style={[styles.preview, { fontSize: 24 * s.quranFontScale, lineHeight: 44 * s.quranFontScale, color: theme.quranText }]}>
        {quranRepository.versesOfSurah(s.riwaya, 112)[0]?.text}
      </AppText>

      <SectionTitle>{t('settings.prayer')}</SectionTitle>
      <Card style={{ padding: 0 }}>
        <ListRow
          title={t('settings.method')}
          subtitle={t(`prayer.methods.${s.prayerMethod}`)}
          onPress={() => setPicker('method')}
          trailing={<Ionicons name="chevron-forward" size={18} color={theme.textMuted} />}
        />
      </Card>
      <AppText variant="small">{t('settings.methodDefaultNote')}</AppText>
      <AppText variant="muted">{t('settings.asr')}</AppText>
      <Segmented
        label={t('settings.asr')}
        value={s.madhab}
        onChange={s.setMadhab}
        options={[
          { value: 'shafi', label: t('settings.madhabs.shafi') },
          { value: 'hanafi', label: t('settings.madhabs.hanafi') },
        ]}
      />

      <SectionTitle>{t('settings.account')}</SectionTitle>
      <Card style={{ padding: 0 }}>
        <ListRow title={t('settings.account')} onPress={() => navigation.navigate('Account')} trailing={<Ionicons name="chevron-forward" size={18} color={theme.textMuted} />} />
        <ListRow title={t('donations.myDonations')} onPress={() => navigation.navigate('MyDonations')} trailing={<Ionicons name="chevron-forward" size={18} color={theme.textMuted} />} />
      </Card>

      {Platform.OS !== 'web' ? (
        <>
          <SectionTitle>{t('settings.storage')}</SectionTitle>
          <AppText variant="muted">{t('settings.audioCache', { mb: (cacheBytes / 1048576).toFixed(1) })}</AppText>
          <Button
            title={t('settings.clearAudioCache')}
            variant="secondary"
            disabled={cacheBytes === 0}
            onPress={() => {
              clearAudioCache();
              setCacheBytes(0);
            }}
          />
        </>
      ) : null}

      <SectionTitle>{t('settings.about')}</SectionTitle>
      <AppText variant="small">{t('settings.version', { version: Constants.expoConfig?.version ?? '' })}</AppText>
      <AppText variant="small">{t('settings.sources')}</AppText>

      <ActionSheet
        visible={picker === 'method'}
        title={t('settings.method')}
        actions={PRAYER_METHODS.map((m) => ({
          label: `${m.id === s.prayerMethod ? '✓ ' : ''}${t(`prayer.methods.${m.id}`)}`,
          onPress: () => s.setPrayerMethod(m.id),
        }))}
        onClose={() => setPicker(null)}
      />
      <ActionSheet
        visible={picker === 'reciter'}
        title={t('settings.reciter')}
        actions={reciters.map((r) => ({
          label: `${r.id === reciterId ? '✓ ' : ''}${localized(r, 'name', locale)}`,
          onPress: () => s.setReciter(s.riwaya, r.id),
        }))}
        onClose={() => setPicker(null)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  sizeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  preview: { fontFamily: fonts.arabic, textAlign: 'right', writingDirection: 'rtl' },
});
