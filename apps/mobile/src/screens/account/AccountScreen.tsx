import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { confirmAsync } from '../../components/ActionSheet';
import { AppText, Button, Card, LoadingState, Notice, Screen, SectionTitle } from '../../components/ui';
import { useAuth } from '../../hooks/useAuth';
import type { RootScreenProps } from '../../navigation/types';
import { api } from '../../services/api/endpoints';
import { supabase } from '../../services/supabase';
import { errorKey } from '../../utils/localize';

export function AccountScreen({ navigation }: RootScreenProps<'Account'>) {
  const { t } = useTranslation();
  const auth = useAuth();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  if (auth.loading) return <LoadingState />;
  if (!auth.configured) {
    return (
      <Screen>
        <Notice tone="warning">{t('auth.notConfigured')}</Notice>
      </Screen>
    );
  }

  if (!auth.session) {
    return (
      <Screen>
        <AppText>{t('account.signedOutIntro')}</AppText>
        <Button title={t('auth.signIn')} onPress={() => navigation.navigate('SignIn')} />
        <Button title={t('auth.createAccount')} variant="secondary" onPress={() => navigation.navigate('SignUp')} />
      </Screen>
    );
  }

  const signOut = async () => {
    await supabase?.auth.signOut();
    queryClient.removeQueries({ queryKey: ['me'] });
    queryClient.removeQueries({ queryKey: ['donations'] });
  };

  const deleteAccount = async () => {
    const ok = await confirmAsync({
      title: t('account.deleteTitle'),
      message: t('account.deleteMessage'),
      confirm: t('account.deleteConfirm'),
      cancel: t('common.cancel'),
      destructive: true,
    });
    if (!ok) return;
    setDeleting(true);
    setError(null);
    try {
      await api.deleteAccount();
      await signOut();
      navigation.popToTop();
    } catch (e) {
      setError(t(errorKey(e)));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Screen>
      <Card>
        <AppText variant="small">{t('auth.email')}</AppText>
        <AppText variant="heading">{auth.session.user.email}</AppText>
      </Card>
      <Button title={t('donations.myDonations')} variant="secondary" onPress={() => navigation.navigate('MyDonations')} />
      <Button title={t('auth.signOut')} variant="secondary" onPress={() => void signOut()} />

      <SectionTitle>{t('account.dangerZone')}</SectionTitle>
      <AppText variant="small">{t('account.deleteExplanation')}</AppText>
      {error ? <Notice tone="warning">{error}</Notice> : null}
      <Button title={t('account.deleteAccount')} variant="danger" loading={deleting} onPress={() => void deleteAccount()} />
    </Screen>
  );
}
