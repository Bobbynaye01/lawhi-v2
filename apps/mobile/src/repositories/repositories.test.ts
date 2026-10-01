import { contentRepository } from './contentRepository';
import { quranRepository } from './quranRepository';

describe('quranRepository (bundled, offline)', () => {
  it('has 114 surahs and the full Hafs and Warsh texts', () => {
    expect(quranRepository.surahs()).toHaveLength(114);
    expect(quranRepository.allVerses('hafs')).toHaveLength(6236);
    expect(quranRepository.allVerses('warsh')).toHaveLength(6213);
    expect(quranRepository.versesOfSurah('hafs', 2)).toHaveLength(286);
    expect(quranRepository.versesOfSurah('warsh', 2)).toHaveLength(285);
  });

  it('serves distinct Warsh text', () => {
    expect(quranRepository.versesOfSurah('warsh', 2)[0]!.text).not.toEqual(
      quranRepository.versesOfSurah('hafs', 2)[0]!.text,
    );
  });

  it('uses correct divisions', () => {
    expect(quranRepository.division('hafs', 'juz', 30)[0]).toMatchObject({ surah: 78, verse: 1 });
    expect(quranRepository.division('hafs', 'hizb', 60)[0]).toMatchObject({ surah: 87, verse: 1 });
    expect(quranRepository.divisionStarts('hafs', 'juz')).toHaveLength(30);
    expect(quranRepository.divisionStarts('hafs', 'hizb')).toHaveLength(60);
  });

  it('shows a basmala header except for At-Tawba and Hafs Al-Fatiha', () => {
    expect(quranRepository.basmalaFor('hafs', 9)).toBeNull();
    expect(quranRepository.basmalaFor('hafs', 1)).toBeNull();
    expect(quranRepository.basmalaFor('hafs', 2)).toBe(
      quranRepository.versesOfSurah('hafs', 1)[0]!.text,
    );
    expect(quranRepository.basmalaFor('warsh', 1)).toBeTruthy();
    expect(quranRepository.basmalaFor('warsh', 2)).not.toBe(quranRepository.basmalaFor('hafs', 2));
  });

  it('finds Ayat al-Kursi from an unvocalized query', () => {
    const results = quranRepository.search('hafs', 'الله لا إله إلا هو الحي القيوم');
    expect(results.map((v) => `${v.surah}:${v.verse}`)).toContain('2:255');
    expect(quranRepository.search('hafs', 'ا')).toEqual([]);
  });
});

describe('contentRepository', () => {
  it('bundles the 67 adhkar and 18 ad’iya with their sources', () => {
    const count = (kind: 'adhkar' | 'dua') =>
      contentRepository.categories(kind).reduce((n, c) => n + c.items.length, 0);
    expect(count('adhkar')).toBe(67);
    expect(count('dua')).toBe(18);
    expect(
      contentRepository.categories().every((c) => c.items.every((i) => i.source.length > 0)),
    ).toBe(true);
  });

  it('never ships invented translations', () => {
    const items = contentRepository.categories().flatMap((c) => c.items);
    expect(items.every((i) => !i.translationFr && !i.translationEn)).toBe(true);
  });

  it('only exposes verified reciters — none for Warsh', () => {
    expect(contentRepository.reciters('hafs')).toHaveLength(20);
    expect(contentRepository.reciters('warsh')).toHaveLength(0);
  });

  it('lists 7 books, with no link for the two broken PDFs', () => {
    const books = contentRepository.books();
    expect(books).toHaveLength(7);
    expect(
      books
        .filter((b) => b.pdfUrl === null)
        .map((b) => b.id)
        .sort(),
    ).toEqual(['adhkar_nawawi', 'nawawi40']);
    expect(books.every((b) => b.chapters.length > 0)).toBe(true);
  });
});
