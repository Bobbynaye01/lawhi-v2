import * as Location from 'expo-location';

export type LocationResult =
  | {
      status: 'ok';
      latitude: number;
      longitude: number;
      name: string | null;
      country: string | null;
    }
  | { status: 'denied' }
  | { status: 'unavailable' };

/** One-shot position for prayer times/Qibla. Low accuracy is enough and saves battery. */
export async function getCurrentPlace(): Promise<LocationResult> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') return { status: 'denied' };

  try {
    const position =
      (await Location.getLastKnownPositionAsync({
        maxAge: 10 * 60 * 1000,
        requiredAccuracy: 5000,
      })) ?? (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
    const { latitude, longitude } = position.coords;

    let name: string | null = null;
    let country: string | null = null;
    try {
      const [address] = await Location.reverseGeocodeAsync({ latitude, longitude });
      name = address?.city ?? address?.subregion ?? address?.region ?? null;
      country = address?.country ?? null;
    } catch {
      // Reverse geocoding needs network on some devices: coordinates are enough.
    }
    return { status: 'ok', latitude, longitude, name, country };
  } catch {
    return { status: 'unavailable' };
  }
}
