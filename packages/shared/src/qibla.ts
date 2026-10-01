/** Coordinates of the Kaaba (Masjid al-Haram, Makkah). */
export const KAABA = { latitude: 21.422487, longitude: 39.826206 } as const;

const toRad = (deg: number) => (deg * Math.PI) / 180;
const toDeg = (rad: number) => (rad * 180) / Math.PI;

export function normalizeDegrees(angle: number): number {
  return ((angle % 360) + 360) % 360;
}

/** Initial great-circle bearing from a point to the Kaaba, in degrees from true north. */
export function qiblaBearing(latitude: number, longitude: number): number {
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
    throw new RangeError('Invalid coordinates');
  }
  const phi1 = toRad(latitude);
  const phi2 = toRad(KAABA.latitude);
  const dLon = toRad(KAABA.longitude - longitude);
  const y = Math.sin(dLon) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLon);
  return normalizeDegrees(toDeg(Math.atan2(y, x)));
}

/** Great-circle distance to the Kaaba in kilometres. */
export function distanceToKaabaKm(latitude: number, longitude: number): number {
  const R = 6371;
  const dPhi = toRad(KAABA.latitude - latitude);
  const dLon = toRad(KAABA.longitude - longitude);
  const a =
    Math.sin(dPhi / 2) ** 2 +
    Math.cos(toRad(latitude)) * Math.cos(toRad(KAABA.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/**
 * Angle the Qibla arrow must be rotated by on screen, given the device heading
 * (degrees from true north). 0 means the phone already faces the Qibla.
 */
export function qiblaRelativeAngle(bearing: number, heading: number): number {
  return normalizeDegrees(bearing - heading);
}

/** True when the phone points within `tolerance` degrees of the Qibla. */
export function isFacingQibla(bearing: number, heading: number, tolerance = 5): boolean {
  const diff = qiblaRelativeAngle(bearing, heading);
  return diff <= tolerance || diff >= 360 - tolerance;
}
