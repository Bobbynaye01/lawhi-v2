import { PRAYER_METHODS, type Locale } from '@lawhi/shared';
import Constants from 'expo-constants';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, StyleSheet, View } from 'react-native';
import { ActionSheet } from '../../components/ActionSheet';
import { TAB_BAR_SPACE } from '../../components/navigation/LawhiTabBar';
import { TextSizeSheet } from '../../components/quran/TextSizeSheet';
import {
  Button,
  LawhiText,
  ListRow,
  LogoMark,
  Screen,
  SectionTitle,
  Segmented,
  Surface,
} from '../../components/ui';
import { spacing } from '../../constants/theme';
import { changeLanguage } from '../../i18n';
import type { TabScreenProps } from '../../navigation/types';
import { contentRepository } from '../../repositories/contentRepository';
import { quranRepository } from '../../repositories/quranRepository';
import { cachedAudioSizeBytes, clearAudioCache } from '../../services/audio/audioCache';
import { useSettingsStore } from '../../stores/settingsStore';
import { localized, useLocale } from '../../utils/localize';

export function SettingsScreen({ navigation }: TabScreenProps<'Settings'>) {
  const { t } = useTranslation();
  const locale = useLocale();
  const s = useSettingsStore();
  const [picker, setPicker] = useState<'method' | 'reciter' | null>(null);
  const [sizing, setSizing] = useState(false);
  const [cacheBytes, setCacheBytes] = useState(() => cachedAudioSizeBytes());

  const reciters = contentRepository.reciters(s.riwaya);
  const reciterId = s.reciterByRiwaya[s.riwaya];
  const reciter = reciters.find((r) => r.id === reciterId);

  const setLanguage = (value: Locale) => {
    s.setLocale(value);
    void changeLanguage(value);
  };

  return (
    <Screen contentStyle={{ paddingBottom: TAB_BAR_SPACE }}>
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
      {Platform.OS !== 'web' ? (
        <LawhiText variant="caption" tone="muted">
          {t('settings.languageRestart')}
        </LawhiText>
      ) : null}

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
      <Surface padded={false} style={{ overflow: 'hidden' }}>
        <ListRow
          icon="volume"
          title={t('settings.reciter')}
          subtitle={
            reciter ? localized(reciter, 'name', locale) : t('quran.audio.noReciterForRiwaya')
          }
          onPress={reciters.length > 0 ? () => setPicker('reciter') : undefined}
        />
        <ListRow
          icon="textSize"
          title={t('settings.textSize')}
          subtitle={`${Math.round(s.quranFontScale * 100)} %`}
          onPress={() => setSizing(true)}
        />
      </Surface>
      <TextSizeSheet
        visible={sizing}
        onClose={() => setSizing(false)}
        preview={quranRepository.versesOfSurah(s.riwaya, 112)[0]?.text ?? ''}
      />

      <SectionTitle>{t('settings.prayer')}</SectionTitle>
      <Surface padded={false} style={{ overflow: 'hidden' }}>
        <ListRow
          icon="clock"
          title={t('settings.method')}
          subtitle={t(`prayer.methods.${s.prayerMethod}`)}
          onPress={() => setPicker('method')}
        />
      </Surface>
      <LawhiText variant="caption" tone="muted">
        {t('settings.methodDefaultNote')}
      </LawhiText>
      <LawhiText variant="caption" tone="secondary">
        {t('settings.asr')}
      </LawhiText>
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
      <Surface padded={false} style={{ overflow: 'hidden' }}>
        <ListRow
          icon="login"
          title={t('settings.account')}
          onPress={() => navigation.navigate('Account')}
        />
      </Surface>

      {Platform.OS !== 'web' ? (
        <>
          <SectionTitle>{t('settings.storage')}</SectionTitle>
          <LawhiText tone="secondary">
            {t('settings.audioCache', { mb: (cacheBytes / 1048576).toFixed(1) })}
          </LawhiText>
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
      <View style={styles.about}>
        <LogoMark size={56} />
        <LawhiText variant="bodyStrong" style={{ textAlign: 'center' }}>
          {t('settings.version', { version: Constants.expoConfig?.version ?? '' })}
        </LawhiText>
        <LawhiText variant="caption" tone="muted" style={{ textAlign: 'center' }}>
          {t('settings.sources')}
        </LawhiText>
      </View>

      <ActionSheet
        visible={picker === 'method'}
        title={t('settings.method')}
        actions={PRAYER_METHODS.map((m) => ({
          label: t(`prayer.methods.${m.id}`),
          selected: m.id === s.prayerMethod,
          onPress: () => s.setPrayerMethod(m.id),
        }))}
        onClose={() => setPicker(null)}
      />
      <ActionSheet
        visible={picker === 'reciter'}
        title={t('settings.reciter')}
        actions={reciters.map((r) => ({
          label: localized(r, 'name', locale),
          selected: r.id === reciterId,
          onPress: () => s.setReciter(s.riwaya, r.id),
        }))}
        onClose={() => setPicker(null)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  about: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.lg },
});
