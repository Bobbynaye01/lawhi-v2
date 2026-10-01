import { useColorScheme } from 'react-native';
import { darkPalette, lightPalette, type Palette } from '../constants/theme';
import { useSettingsStore } from '../stores/settingsStore';

export function useIsDark(): boolean {
  const preference = useSettingsStore((s) => s.theme);
  const system = useColorScheme();
  return preference === 'dark' || (preference === 'system' && system === 'dark');
}

export function useTheme(): Palette {
  return useIsDark() ? darkPalette : lightPalette;
}
