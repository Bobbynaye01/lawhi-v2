import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { I18nextProvider } from 'react-i18next';
import * as Clipboard from 'expo-clipboard';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { i18n, initI18n } from '../i18n';
import { api } from '../services/api/endpoints';
import { useLocationStore } from '../stores/locationStore';
import { useSettingsStore } from '../stores/settingsStore';
import { RootNavigator } from './RootNavigator';

jest.mock('react-native-pdf', () => 'Pdf');
jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn().mockResolvedValue(true) }));
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
    for (const label of ['Bibliothèque', 'Sadgue (Dons)', 'Qibla', 'Adhkar']) {
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
    expect((await screen.findAllByText('Fajr')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Maghrib').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Nouakchott').length).toBeGreaterThan(0);
  });

  it('lists surahs and opens the reader with the verified text', async () => {
    await renderApp();
    fireEvent.press(screen.getAllByText('Coran')[0]!);
    // The Home card also names Al-Fatihah: press the surah row of the Quran list.
    fireEvent.press(await screen.findByLabelText("1. L'ouverture"));
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
  const cause = {
    id: 'c1',
    slug: 'mosque',
    titleAr: 'مشروع بناء المسجد',
    titleFr: 'Construction d’une mosquée',
    titleEn: 'Mosque construction',
    descriptionAr: '',
    descriptionFr: 'Nouakchott',
    descriptionEn: '',
    goalAmount: 50000,
    collectedAmount: 12000,
    status: 'ongoing' as const,
    eventDate: null,
    imageUrl: null,
    featured: true,
    active: true,
    sortOrder: 0,
  };

  it('shows the shared balance, the Bankily number to copy, and the projects', async () => {
    jest.spyOn(api, 'donationSummary').mockResolvedValue({
      totalAmount: 125000,
      currency: 'MRU',
      updatedAt: '2026-10-02T10:00:00.000Z',
      bankilyPhone: '22334455',
    });
    jest.spyOn(api, 'causes').mockResolvedValue([cause]);
    await renderApp();
    fireEvent.press(await screen.findByText('Sadgue (Dons)'));

    expect(await screen.findByText('125 000')).toBeTruthy();
    expect(screen.getByText('Mis à jour le 02/10/2026')).toBeTruthy();
    expect(screen.getByText('22 33 44 55')).toBeTruthy();
    fireEvent.press(screen.getByText('Copier'));
    expect(await screen.findByText('Numéro copié ✓')).toBeTruthy();
    expect(Clipboard.setStringAsync).toHaveBeenCalledWith('22334455');

    expect(screen.getByText('Construction d’une mosquée')).toBeTruthy();
    expect(screen.getByText('En cours')).toBeTruthy();
    expect(screen.getByText('12 000 MRU collectés sur 50 000 MRU')).toBeTruthy();
    // Bankily only: the block title is the sole "Faire un don" — no per-project form button.
    expect(screen.getAllByText('Faire un don')).toHaveLength(1);
    expect(screen.queryByText('Mes dons')).toBeNull();
  });

  it('says so until an admin has set the Bankily number', async () => {
    jest.spyOn(api, 'donationSummary').mockResolvedValue({
      totalAmount: 0,
      currency: 'MRU',
      updatedAt: null,
      bankilyPhone: null,
    });
    jest.spyOn(api, 'causes').mockResolvedValue([]);
    await renderApp();
    fireEvent.press(await screen.findByText('Sadgue (Dons)'));
    expect(
      await screen.findByText('Le numéro Bankily s’affichera ici dès qu’il aura été configuré.'),
    ).toBeTruthy();
    expect(screen.getByText('Pas encore mis à jour')).toBeTruthy();
    expect(screen.queryByText('Copier')).toBeNull();
  });
});
