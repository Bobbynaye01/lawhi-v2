import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { I18nextProvider } from 'react-i18next';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { i18n, initI18n } from '../i18n';
import { api } from '../services/api/endpoints';
import { useLocationStore } from '../stores/locationStore';
import { useSettingsStore } from '../stores/settingsStore';
import { RootNavigator } from './RootNavigator';

jest.mock('react-native-pdf', () => 'Pdf');
jest.mock('../services/prayerNotifications', () => ({
  syncPrayerNotifications: jest.fn().mockResolvedValue('scheduled'),
  effectiveMode: (m: string) => m,
}));

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

async function renderApp() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return await render(
    <SafeAreaProvider initialMetrics={metrics}>
      <I18nextProvider i18n={i18n}>
        <QueryClientProvider client={client}>
          <RootNavigator />
        </QueryClientProvider>
      </I18nextProvider>
    </SafeAreaProvider>,
  );
}

beforeAll(() => {
  initI18n('fr');
});

beforeEach(async () => {
  await i18n.changeLanguage('fr');
  useLocationStore.setState({ place: null });
  useSettingsStore.setState({ riwaya: 'hafs' });
});

describe('navigation', () => {
  it('opens on Home with every shortcut', async () => {
    await renderApp();
    expect(await screen.findByText('Prochaine prière')).toBeTruthy();
    for (const label of ['Bibliothèque', 'Dons', 'Horaires']) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    }
  });

  it('shows prayer times once a place is known (computed offline)', async () => {
    useLocationStore.getState().setPlace({
      name: 'Nouakchott',
      country: 'Mauritanie',
      latitude: 18.0735,
      longitude: -15.9582,
      source: 'search',
    });
    await renderApp();
    fireEvent.press(screen.getAllByText('Prière')[0]!);
    expect(await screen.findByText('Fajr')).toBeTruthy();
    expect(screen.getByText('Maghrib')).toBeTruthy();
    expect(screen.getAllByText('Nouakchott').length).toBeGreaterThan(0);
  });

  it('lists surahs and opens the reader with the verified text', async () => {
    await renderApp();
    fireEvent.press(screen.getAllByText('Coran')[0]!);
    fireEvent.press(await screen.findByText(/Al-Fatihah/));
    expect(await screen.findByText(/الْحَمْدُ|ٱلْحَمْدُ/)).toBeTruthy();
  });

  it('switches the whole interface language', async () => {
    await renderApp();
    await screen.findByText('Prochaine prière');
    await i18n.changeLanguage('en');
    await waitFor(() => expect(screen.getByText('Next prayer')).toBeTruthy());
  });
});

describe('donations screen', () => {
  it('explains honestly when no payment method is configured', async () => {
    jest.spyOn(api, 'causes').mockResolvedValue([
      {
        id: 'c1',
        slug: 'mosque',
        titleAr: 'مشروع بناء المسجد',
        titleFr: 'Construction d’une mosquée',
        titleEn: 'Mosque construction',
        descriptionAr: '',
        descriptionFr: 'Nouakchott',
        descriptionEn: '',
        goalAmount: null,
        featured: true,
        confirmedAmount: 1500,
        confirmedCount: 2,
      },
    ]);
    await renderApp();
    fireEvent.press(await screen.findByText('Dons'));
    expect(await screen.findByText('Construction d’une mosquée')).toBeTruthy();
    expect(screen.getByText('Dons confirmés : 1 500 MRU')).toBeTruthy();
  });
});
