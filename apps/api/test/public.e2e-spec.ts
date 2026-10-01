import request from 'supertest';
import { createTestApp, type TestContext } from './helpers';

describe('Public API', () => {
  let ctx: TestContext;
  const api = () => request(ctx.app.getHttpServer());

  beforeAll(async () => {
    ctx = await createTestApp();
  });
  afterAll(async () => {
    await ctx.app.close();
  });

  describe('quran', () => {
    it('lists the 114 surahs with Hafs and Warsh verse counts', async () => {
      const res = await api().get('/api/quran/surahs').expect(200);
      expect(res.body).toHaveLength(114);
      expect(res.body[1]).toMatchObject({ id: 2, nameAr: 'البقرة', versesHafs: 286, versesWarsh: 285 });
    });

    it('serves real Warsh text, distinct from Hafs', async () => {
      const hafs = await api().get('/api/quran/surahs/2?riwaya=hafs').expect(200);
      const warsh = await api().get('/api/quran/surahs/2?riwaya=warsh').expect(200);
      expect(hafs.body.verses).toHaveLength(286);
      expect(warsh.body.verses).toHaveLength(285);
      expect(warsh.body.verses[0].text).not.toEqual(hafs.body.verses[0].text);
    });

    it('uses the correct hizb and rub boundaries (regressions found in the Flutter app)', async () => {
      const hizb60 = await api().get('/api/quran/hizb/60').expect(200);
      expect(hizb60.body.verses[0]).toMatchObject({ surah: 87, verse: 1 });
      const rub106 = await api().get('/api/quran/rub/106').expect(200);
      expect(rub106.body.verses[0]).toMatchObject({ surah: 15, verse: 49 });
      const juz30 = await api().get('/api/quran/juz/30').expect(200);
      expect(juz30.body.verses[0]).toMatchObject({ surah: 78, verse: 1 });
    });

    it('finds verses from an unvocalized query', async () => {
      const res = await api()
        .get('/api/quran/search')
        .query({ q: 'الله لا إله إلا هو الحي القيوم' })
        .expect(200);
      const keys = res.body.results.map((v: { surah: number; verse: number }) => `${v.surah}:${v.verse}`);
      expect(keys).toContain('2:255');
    });

    it('lists only verified reciters, and none for Warsh yet', async () => {
      const hafs = await api().get('/api/quran/reciters?riwaya=hafs').expect(200);
      expect(hafs.body).toHaveLength(20);
      const warsh = await api().get('/api/quran/reciters?riwaya=warsh').expect(200);
      expect(warsh.body).toEqual([]);
    });

    it('validates parameters', async () => {
      await api().get('/api/quran/surahs/115').expect(400);
      await api().get('/api/quran/juz/0').expect(400);
      await api().get('/api/quran/surahs/1?riwaya=qalun').expect(400);
      await api().get('/api/quran/search?q=a').expect(400);
    });
  });

  describe('prayer & qibla', () => {
    it('computes several days with Muslim World League by default', async () => {
      const res = await api()
        .get('/api/prayer/times')
        .query({ lat: 18.0735, lon: -15.9582, date: '2026-10-01', days: 3 })
        .expect(200);
      expect(res.body.method).toBe('MuslimWorldLeague');
      expect(res.body.days).toHaveLength(3);
      const { fajr, dhuhr, asr, maghrib, isha } = res.body.days[0].times;
      expect(new Date(fajr) < new Date(dhuhr)).toBe(true);
      expect(new Date(dhuhr) < new Date(asr)).toBe(true);
      expect(new Date(asr) < new Date(maghrib)).toBe(true);
      expect(new Date(maghrib) < new Date(isha)).toBe(true);
      // Nouakchott, 1 Oct 2026 (UTC+0): within 2 minutes of api.aladhan.com method 3.
      expect(fajr).toBe('2026-10-01T05:42:00.000Z');
      expect(maghrib).toBe('2026-10-01T18:52:00.000Z');
    });

    it('supports other methods and rejects unknown ones', async () => {
      const res = await api()
        .get('/api/prayer/times')
        .query({ lat: 18.0735, lon: -15.9582, date: '2026-10-01', method: 'UmmAlQura' })
        .expect(200);
      expect(res.body.method).toBe('UmmAlQura');
      await api()
        .get('/api/prayer/times')
        .query({ lat: 18, lon: -15, date: '2026-10-01', method: 'Invented' })
        .expect(400);
      await api().get('/api/prayer/times').query({ lat: 99, lon: 0, date: '2026-10-01' }).expect(400);
    });

    it('returns the Qibla bearing', async () => {
      const res = await api().get('/api/qibla').query({ lat: 18.0735, lon: -15.9582 }).expect(200);
      expect(res.body.bearing).toBeCloseTo(76.5, 0);
      expect(res.body.distanceKm).toBe(5820);
    });
  });

  describe('content', () => {
    it('serves the migrated adhkar and ad’iya', async () => {
      const adhkar = await api().get('/api/adhkar/categories?kind=adhkar').expect(200);
      const dua = await api().get('/api/adhkar/categories?kind=dua').expect(200);
      const count = (cats: { _count: { items: number } }[]) => cats.reduce((n, c) => n + c._count.items, 0);
      expect(count(adhkar.body)).toBe(67);
      expect(count(dua.body)).toBe(18);
      const morning = await api().get('/api/adhkar/categories/morning').expect(200);
      expect(morning.body.items[0].source).toBe('صحيح مسلم');
      expect(morning.body.items[0].translationFr).toBeNull();
    });

    it('serves the library and hides broken PDF links', async () => {
      const res = await api().get('/api/library/books').expect(200);
      expect(res.body).toHaveLength(7);
      const byId = Object.fromEntries(res.body.map((b: { id: string }) => [b.id, b]));
      expect(byId.bukhari.pdfUrl).toMatch(/^https:\/\/archive\.org\//);
      expect(byId.nawawi40.pdfUrl).toBeNull();
      expect(byId.adhkar_nawawi.pdfUrl).toBeNull();
      const book = await api().get('/api/library/books/nawawi40').expect(200);
      const chapter = await api()
        .get(`/api/library/books/nawawi40/chapters/${book.body.chapters[0].id}`)
        .expect(200);
      expect(chapter.body.entries.length).toBeGreaterThan(0);
      await api().get('/api/library/books/hisn/chapters/nawawi_unknown').expect(404);
    });

    it('exposes server-controlled donation config in MRU', async () => {
      const res = await api().get('/api/settings').expect(200);
      expect(res.body.currency).toBe('MRU');
      expect(res.body.donations.presets).toEqual([100, 200, 500, 1000, 5000]);
    });
  });

  describe('security', () => {
    it('never leaks internals on errors', async () => {
      const res = await api().get('/api/nope').expect(404);
      expect(JSON.stringify(res.body)).not.toMatch(/stack|at .*\.ts|prisma/i);
    });

    it('sets security headers and restricts CORS', async () => {
      const res = await api().get('/api/health').set('Origin', 'https://evil.example').expect(200);
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['access-control-allow-origin']).toBeUndefined();
      const allowed = await api().get('/api/health').set('Origin', 'http://localhost:5173');
      expect(allowed.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    });
  });
});
