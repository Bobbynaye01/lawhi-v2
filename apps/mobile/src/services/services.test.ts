import { ApiError, apiRequest } from './api/client';
import { verseAudioUrl } from './audio/recitationUrls';
import { contentRepository } from '../repositories/contentRepository';

jest.mock('./supabase', () => {
  const auth = {
    setSession: jest.fn().mockResolvedValue({ error: null }),
    exchangeCodeForSession: jest.fn().mockResolvedValue({ error: null }),
  };
  return { supabase: { auth }, accessToken: jest.fn().mockResolvedValue(null) };
});

// eslint-disable-next-line import/first
import { handleAuthLink } from './authLinks';
// eslint-disable-next-line import/first
import { supabase } from './supabase';

describe('verseAudioUrl', () => {
  it('builds the verified EveryAyah layout', () => {
    const alafasy = contentRepository.reciter('ar.alafasy')!;
    expect(verseAudioUrl(alafasy, { surah: 2, verse: 255 })).toBe(
      'https://everyayah.com/data/Alafasy_128kbps/002255.mp3',
    );
  });
});

describe('handleAuthLink', () => {
  it('opens a recovery session from the e-mail link fragment', async () => {
    const result = await handleAuthLink('lawhi://#access_token=a&refresh_token=r&type=recovery');
    expect(result).toBe('recovery');
    expect(supabase!.auth.setSession).toHaveBeenCalledWith({
      access_token: 'a',
      refresh_token: 'r',
    });
  });

  it('exchanges a PKCE code', async () => {
    expect(await handleAuthLink('lawhi://?code=xyz')).toBe('signed-in');
    expect(supabase!.auth.exchangeCodeForSession).toHaveBeenCalledWith('xyz');
  });

  it('ignores unrelated links and reports provider errors', async () => {
    expect(await handleAuthLink('lawhi://quran')).toBe('ignored');
    expect(await handleAuthLink('lawhi://#error=access_denied&error_description=expired')).toBe(
      'invalid',
    );
  });
});

describe('apiRequest without configuration', () => {
  it('fails with a translatable code instead of calling an unknown server', async () => {
    await expect(apiRequest('/settings')).rejects.toEqual(new ApiError(0, 'api_not_configured'));
  });
});
