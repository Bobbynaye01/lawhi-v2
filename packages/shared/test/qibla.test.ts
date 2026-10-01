import { describe, expect, it } from 'vitest';
import { distanceToKaabaKm, isFacingQibla, qiblaBearing, qiblaRelativeAngle } from '../src/qibla';

describe('qiblaBearing', () => {
  // Reference bearings published by qiblafinder tools (great-circle, true north).
  it.each([
    ['London', 51.5074, -0.1278, 118.99],
    ['New York', 40.7128, -74.006, 58.48],
    ['Jakarta', -6.2088, 106.8456, 295.15],
  ])('matches the reference bearing for %s', (_city, lat, lon, expected) => {
    expect(qiblaBearing(lat, lon)).toBeCloseTo(expected, 0);
  });

  it('points east-north-east from Nouakchott', () => {
    const bearing = qiblaBearing(18.0735, -15.9582);
    expect(bearing).toBeGreaterThan(60);
    expect(bearing).toBeLessThan(80);
  });

  it('rejects invalid coordinates', () => {
    expect(() => qiblaBearing(91, 0)).toThrow(RangeError);
  });
});

describe('distanceToKaabaKm', () => {
  it('is about 5 820 km from Nouakchott', () => {
    expect(distanceToKaabaKm(18.0735, -15.9582)).toBeGreaterThan(5790);
    expect(distanceToKaabaKm(18.0735, -15.9582)).toBeLessThan(5850);
  });
});

describe('relative angle', () => {
  it('wraps around north', () => {
    expect(qiblaRelativeAngle(10, 350)).toBe(20);
    expect(isFacingQibla(2, 358)).toBe(true);
    expect(isFacingQibla(90, 0)).toBe(false);
  });
});
