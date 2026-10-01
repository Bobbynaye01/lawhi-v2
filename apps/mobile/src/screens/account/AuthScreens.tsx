import * as Linking from 'expo-linking';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FormField } from '../../components/FormField';
import { AppText, Button, Notice, Screen } from '../../components/ui';
import type { RootScreenProps } from '../../navigation/types';
import { supabase } from '../../services/supabase';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 8;

/** Maps Supabase auth errors to our translation keys without exposing raw messages. */
function authErrorKey(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('invalid login')) return 'auth.errors.invalidCredentials';
  if (m.includes('already registered') || m.includes('already been registered'))
    return 'auth.errors.emailTaken';
  if (m.includes('email not confirmed')) return 'auth.errors.emailNotConfirmed';
  if (m.includes('rate limit') || m.includes('too many')) return 'auth.errors.rateLimited';
  if (m.includes('network') || m.includes('fetch')) return 'errors.network_error';
  return 'auth.errors.generic';
}

function NotConfigured() {
  const { t } = useTranslation();
  return (
    <Screen>
      <Notice tone="warning">{t('auth.notConfigured')}</Notice>
    </Screen>
  );
}

export function SignInScreen({ navigation, route }: RootScreenProps<'SignIn'>) {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  if (!supabase) return <NotConfigured />;
  const client = supabase;

  const submit = async () => {
    setError(null);
    if (!EMAIL.test(email.trim()) || password.length === 0) {
      setError(t('auth.errors.fillFields'));
      return;
    }
    setLoading(true);
    const { error: authError } = await client.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);
    if (authError) {
      setError(t(authErrorKey(authError.message)));
      return;
    }
    const redirect = route.params?.redirect;
    if (redirect) navigation.replace(redirect);
    else navigation.goBack();
  };

  return (
    <Screen>
      <AppText variant="muted">{t('auth.signInIntro')}</AppText>
      <FormField
        label={t('auth.email')}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
        textContentType="emailAddress"
      />
      <FormField
        label={t('auth.password')}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="password"
        textContentType="password"
      />
      {error ? <Notice tone="warning">{error}</Notice> : null}
      <Button title={t('auth.signIn')} loading={loading} onPress={() => void submit()} />
      <Button
        title={t('auth.forgotPassword')}
        variant="secondary"
        onPress={() => navigation.navigate('ForgotPassword')}
      />
      <Button
        title={t('auth.createAccount')}
        variant="secondary"
        onPress={() => navigation.navigate('SignUp')}
      />
    </Screen>
  );
}

export function SignUpScreen({ navigation }: RootScreenProps<'SignUp'>) {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  if (!supabase) return <NotConfigured />;
  const client = supabase;

  const submit = async () => {
    setError(null);
    if (!EMAIL.test(email.trim())) return setError(t('auth.errors.invalidEmail'));
    if (password.length < MIN_PASSWORD)
      return setError(t('auth.errors.passwordTooShort', { min: MIN_PASSWORD }));
    if (password !== confirm) return setError(t('auth.errors.passwordMismatch'));
    setLoading(true);
    const { data, error: authError } = await client.auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo: Linking.createURL('/') },
    });
    setLoading(false);
    if (authError) return setError(t(authErrorKey(authError.message)));
    // With email confirmation enabled, Supabase returns no session until the link is clicked.
    if (!data.session) setNeedsConfirmation(true);
    else navigation.popToTop();
  };

  if (needsConfirmation) {
    return (
      <Screen>
        <Notice tone="success">{t('auth.checkEmail', { email: email.trim() })}</Notice>
        <Button title={t('auth.signIn')} onPress={() => navigation.replace('SignIn')} />
      </Screen>
    );
  }

  return (
    <Screen>
      <FormField
        label={t('auth.email')}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
      />
      <FormField
        label={t('auth.password')}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="new-password"
        hint={t('auth.passwordHint', { min: MIN_PASSWORD })}
      />
      <FormField
        label={t('auth.confirmPassword')}
        value={confirm}
        onChangeText={setConfirm}
        secureTextEntry
        autoComplete="new-password"
      />
      {error ? <Notice tone="warning">{error}</Notice> : null}
      <Button title={t('auth.createAccount')} loading={loading} onPress={() => void submit()} />
    </Screen>
  );
}

export function ForgotPasswordScreen() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  if (!supabase) return <NotConfigured />;
  const client = supabase;

  const submit = async () => {
    setError(null);
    if (!EMAIL.test(email.trim())) return setError(t('auth.errors.invalidEmail'));
    setLoading(true);
    const { error: authError } = await client.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: Linking.createURL('/'),
    });
    setLoading(false);
    // Same message whether or not the account exists (no account enumeration).
    if (authError && authErrorKey(authError.message) === 'auth.errors.rateLimited') {
      return setError(t('auth.errors.rateLimited'));
    }
    setSent(true);
  };

  return (
    <Screen>
      {sent ? (
        <Notice tone="success">{t('auth.resetSent')}</Notice>
      ) : (
        <>
          <AppText variant="muted">{t('auth.resetIntro')}</AppText>
          <FormField
            label={t('auth.email')}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          {error ? <Notice tone="warning">{error}</Notice> : null}
          <Button title={t('auth.sendResetLink')} loading={loading} onPress={() => void submit()} />
        </>
      )}
    </Screen>
  );
}

/** Opened from the password-recovery e-mail link (the recovery session is already active). */
export function ResetPasswordScreen({ navigation }: RootScreenProps<'ResetPassword'>) {
  const { t } = useTranslation();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  if (!supabase) return <NotConfigured />;
  const client = supabase;

  const submit = async () => {
    setError(null);
    if (password.length < MIN_PASSWORD)
      return setError(t('auth.errors.passwordTooShort', { min: MIN_PASSWORD }));
    if (password !== confirm) return setError(t('auth.errors.passwordMismatch'));
    setLoading(true);
    const { error: authError } = await client.auth.updateUser({ password });
    setLoading(false);
    if (authError) return setError(t(authErrorKey(authError.message)));
    setDone(true);
  };

  if (done) {
    return (
      <Screen>
        <Notice tone="success">{t('auth.passwordUpdated')}</Notice>
        <Button title={t('common.close')} onPress={() => navigation.popToTop()} />
      </Screen>
    );
  }

  return (
    <Screen>
      <AppText variant="muted">{t('auth.newPasswordIntro')}</AppText>
      <FormField
        label={t('auth.newPassword')}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="new-password"
        hint={t('auth.passwordHint', { min: MIN_PASSWORD })}
      />
      <FormField
        label={t('auth.confirmPassword')}
        value={confirm}
        onChangeText={setConfirm}
        secureTextEntry
        autoComplete="new-password"
      />
      {error ? <Notice tone="warning">{error}</Notice> : null}
      <Button title={t('auth.savePassword')} loading={loading} onPress={() => void submit()} />
    </Screen>
  );
}
