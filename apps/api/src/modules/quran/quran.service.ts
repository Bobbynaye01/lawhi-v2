import { Injectable, NotFoundException } from '@nestjs/common';
import { normalizeArabicForSearch, type Riwaya } from '@lawhi/shared';
import { PrismaService } from '../../database/prisma.service';

const verseSelect = {
  surah: true,
  verse: true,
  text: true,
  page: true,
  juz: true,
  hizb: true,
  rub: true,
  sajda: true,
} as const;

export type DivisionKind = 'juz' | 'hizb' | 'rub' | 'page';

@Injectable()
export class QuranService {
  constructor(private readonly prisma: PrismaService) {}

  listSurahs() {
    return this.prisma.surah.findMany({ orderBy: { id: 'asc' } });
  }

  async getSurah(id: number, riwaya: Riwaya) {
    const surah = await this.prisma.surah.findUnique({ where: { id } });
    if (!surah) throw new NotFoundException({ error: 'surah_not_found' });
    const verses = await this.prisma.verse.findMany({
      where: { riwaya, surah: id },
      orderBy: { verse: 'asc' },
      select: verseSelect,
    });
    return { surah, riwaya, verses };
  }

  async getDivision(kind: DivisionKind, number: number, riwaya: Riwaya) {
    const verses = await this.prisma.verse.findMany({
      where: { riwaya, [kind]: number },
      orderBy: [{ surah: 'asc' }, { verse: 'asc' }],
      select: verseSelect,
    });
    if (verses.length === 0) throw new NotFoundException({ error: 'division_not_found' });
    return { kind, number, riwaya, verses };
  }

  async search(query: string, riwaya: Riwaya, limit: number) {
    const normalized = normalizeArabicForSearch(query);
    if (normalized.length < 2) return { query, riwaya, results: [] };
    const results = await this.prisma.verse.findMany({
      where: { riwaya, textSearch: { contains: normalized } },
      orderBy: [{ surah: 'asc' }, { verse: 'asc' }],
      take: limit,
      select: verseSelect,
    });
    return { query, riwaya, results };
  }

  listReciters(riwaya: Riwaya) {
    return this.prisma.reciter.findMany({
      where: { riwaya, enabled: true },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, nameAr: true, nameFr: true, nameEn: true, riwaya: true, provider: true, folder: true },
    });
  }
}
