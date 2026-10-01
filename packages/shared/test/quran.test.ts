import { describe, expect, it } from 'vitest';
import { normalizeArabicForSearch, parseVerseKey } from '../src/quran';

describe('parseVerseKey', () => {
  it('parses valid keys and rejects others', () => {
    expect(parseVerseKey('2:255')).toEqual({ surah: 2, verse: 255 });
    expect(parseVerseKey('115:1')).toBeNull();
    expect(parseVerseKey('abc')).toBeNull();
  });
});

describe('normalizeArabicForSearch', () => {
  it('matches a vocalized Uthmani word with its plain spelling', () => {
    expect(normalizeArabicForSearch('ٱلرَّحْمَـٰنِ')).toBe(normalizeArabicForSearch('الرحمن'));
  });
});
