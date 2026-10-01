import * as Location from 'expo-location';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

export type HeadingState =
  | { status: 'starting' }
  | { status: 'unsupported' }
  | { status: 'denied' }
  | { status: 'ok'; heading: number; /** 0 none … 3 high (expo-location scale) */ accuracy: number };

/** No reading after this delay means the device has no usable compass. */
const SENSOR_TIMEOUT_MS = 5000;

export function useHeading(): HeadingState {
  const [state, setState] = useState<HeadingState>(
    Platform.OS === 'web' ? { status: 'unsupported' } : { status: 'starting' },
  );

  useEffect(() => {
    if (Platform.OS === 'web') return;
    let subscription: Location.LocationSubscription | null = null;
    let received = false;
    let cancelled = false;

    const timeout = setTimeout(() => {
      if (!received && !cancelled) setState({ status: 'unsupported' });
    }, SENSOR_TIMEOUT_MS);

    void (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (cancelled) return;
      if (status !== 'granted') {
        setState({ status: 'denied' });
        return;
      }
      try {
        subscription = await Location.watchHeadingAsync(
          (h) => {
            // trueHeading is -1 when unavailable; fall back to magnetic north.
            const heading = h.trueHeading >= 0 ? h.trueHeading : h.magHeading;
            if (heading < 0 || Number.isNaN(heading)) return;
            received = true;
            setState({ status: 'ok', heading, accuracy: h.accuracy ?? 0 });
          },
          () => setState({ status: 'unsupported' }),
        );
        if (cancelled) subscription.remove();
      } catch {
        setState({ status: 'unsupported' });
      }
    })();

    return () => {
      cancelled = true;
      clearTimeout(timeout);
      subscription?.remove();
    };
  }, []);

  return state;
}
