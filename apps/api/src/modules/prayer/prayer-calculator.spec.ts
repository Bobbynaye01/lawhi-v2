import { computePrayerDays } from './prayer-calculator';

const NOUAKCHOTT = { latitude: 18.0735, longitude: -15.9582 };

describe('computePrayerDays', () => {
  it('returns consecutive calendar days, crossing month ends', () => {
    const days = computePrayerDays({ ...NOUAKCHOTT, date: '2026-10-30', days: 4 });
    expect(days.map((d) => d.date)).toEqual(['2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02']);
  });

  it('keeps every prayer on its own calendar day in Nouakchott (UTC+0)', () => {
    const [day] = computePrayerDays({ ...NOUAKCHOTT, date: '2026-10-01', days: 1 });
    for (const time of Object.values(day!.times)) {
      expect(time.startsWith('2026-10-01')).toBe(true);
    }
  });

  it('gives a later Asr with the Hanafi madhab', () => {
    const [shafi] = computePrayerDays({ ...NOUAKCHOTT, date: '2026-10-01', days: 1, madhab: 'shafi' });
    const [hanafi] = computePrayerDays({ ...NOUAKCHOTT, date: '2026-10-01', days: 1, madhab: 'hanafi' });
    expect(new Date(hanafi!.times.asr) > new Date(shafi!.times.asr)).toBe(true);
  });

  it('changes Fajr/Isha with the calculation method', () => {
    const [mwl] = computePrayerDays({ ...NOUAKCHOTT, date: '2026-10-01', days: 1, method: 'MuslimWorldLeague' });
    const [egypt] = computePrayerDays({ ...NOUAKCHOTT, date: '2026-10-01', days: 1, method: 'Egyptian' });
    // Egyptian uses a deeper Fajr angle (19.5° vs 18°): Fajr comes earlier.
    expect(new Date(egypt!.times.fajr) < new Date(mwl!.times.fajr)).toBe(true);
  });
});
