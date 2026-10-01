import { useAdhkarStore } from './adhkarStore';
import { useQuranStore } from './quranStore';
import { FONT_SCALE, useSettingsStore } from './settingsStore';

describe('settingsStore', () => {
  it('defaults to Muslim World League, Hafs and system theme', () => {
    const s = useSettingsStore.getState();
    expect(s.prayerMethod).toBe('MuslimWorldLeague');
    expect(s.riwaya).toBe('hafs');
    expect(s.theme).toBe('system');
    expect(s.reciterByRiwaya.warsh).toBeNull();
  });

  it('clamps the Quran text size', () => {
    useSettingsStore.getState().setQuranFontScale(10);
    expect(useSettingsStore.getState().quranFontScale).toBe(FONT_SCALE.max);
    useSettingsStore.getState().setQuranFontScale(0.1);
    expect(useSettingsStore.getState().quranFontScale).toBe(FONT_SCALE.min);
  });

  it('remembers a reciter per riwaya', () => {
    useSettingsStore.getState().setReciter('hafs', 'ar.husary');
    expect(useSettingsStore.getState().reciterByRiwaya).toEqual({ hafs: 'ar.husary', warsh: null });
  });
});

describe('quranStore', () => {
  it('toggles bookmarks per riwaya', () => {
    const { toggleBookmark } = useQuranStore.getState();
    toggleBookmark('hafs', { surah: 2, verse: 255 });
    expect(useQuranStore.getState().isBookmarked('hafs', { surah: 2, verse: 255 })).toBe(true);
    expect(useQuranStore.getState().isBookmarked('warsh', { surah: 2, verse: 255 })).toBe(false);
    toggleBookmark('hafs', { surah: 2, verse: 255 });
    expect(useQuranStore.getState().bookmarks).toHaveLength(0);
  });

  it('keeps the last read verse per riwaya', () => {
    useQuranStore.getState().saveLastRead('warsh', { surah: 18, verse: 10 });
    expect(useQuranStore.getState().lastRead.warsh).toMatchObject({ surah: 18, verse: 10 });
  });
});

describe('adhkarStore', () => {
  it('counts up to the required repetitions only', () => {
    const { increment, countFor } = useAdhkarStore.getState();
    expect(increment('morning-4', 4)).toBe(1);
    increment('morning-4', 4);
    increment('morning-4', 4);
    increment('morning-4', 4);
    expect(increment('morning-4', 4)).toBe(4);
    expect(countFor('morning-4')).toBe(4);
    useAdhkarStore.getState().resetCategory(['morning-4']);
    expect(useAdhkarStore.getState().countFor('morning-4')).toBe(0);
  });

  it('resets counters on a new day', () => {
    useAdhkarStore.setState({ day: '2000-01-01', counts: { 'evening-1': 1 } });
    expect(useAdhkarStore.getState().countFor('evening-1')).toBe(0);
  });
});
