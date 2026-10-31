import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import { LinearGradient } from 'expo-linear-gradient';
import { Btn, Field, PulseHeart, Txt } from '../components/ui';
import { useStore } from '../lib/store';
import { C } from '../lib/theme';
import type { TKey } from '../lib/i18n';

export function Welcome({ onSignIn, onSignUp, onGoogle }: { onSignIn: () => void; onSignUp: () => void; onGoogle: () => void }) {
  const { t, explore } = useStore();
  return (
    <LinearGradient colors={['#120A22', '#07060D', '#1A0E2E']} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 72, gap: 18, flexGrow: 1 }}>
        <View style={{ alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <PulseHeart size={42} />
          <Txt size={28} weight="800">
            {t('brand')}
          </Txt>
          <Txt size={14} color={C.violet}>
            {t('tagline')}
          </Txt>
        </View>
        <Txt size={26} weight="800" style={{ lineHeight: 32 }}>
          {t('welcome_title')}
        </Txt>
        <Txt color={C.muted} style={{ lineHeight: 22 }}>
          {t('welcome_sub')}
        </Txt>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          {[t('tab_vitals'), t('tab_coach'), t('tab_meds'), t('tab_visits'), t('sl_focus')].map((x) => (
            <View key={x} style={{ backgroundColor: C.card, borderRadius: 99, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: C.line }}>
              <Txt size={12} color={C.violet}>
                {x}
              </Txt>
            </View>
          ))}
        </View>
        <View style={{ flex: 1 }} />
        <Btn label={t('create_account')} onPress={onSignUp} icon="person-add-outline" />
        <Btn label={t('sign_in')} onPress={onSignIn} kind="soft" icon="log-in-outline" />
        <Btn label={t('continue_google')} onPress={onGoogle} kind="ghost" icon="logo-google" />
        <Pressable onPress={explore} style={{ padding: 12 }}>
          <Txt weight="700" style={{ textAlign: 'center' }}>
            {t('explore')}
          </Txt>
          <Txt size={12} color={C.muted} style={{ textAlign: 'center', marginTop: 4 }}>
            {t('explore_sub')}
          </Txt>
        </Pressable>
        <Txt size={11} color={C.faint} style={{ textAlign: 'center' }}>
          {t('legal')} · {t('android_first')}
        </Txt>
      </ScrollView>
    </LinearGradient>
  );
}

function AuthShell({
  title,
  sub,
  children,
  onBack,
}: {
  title: string;
  sub: string;
  children: React.ReactNode;
  onBack: () => void;
}) {
  const { t } = useStore();
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: 22, paddingTop: 56, gap: 14 }} keyboardShouldPersistTaps="handled">
        <Pressable onPress={onBack} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name="chevron-back" size={18} color={C.violet} />
          <Txt color={C.violet}>{t('back')}</Txt>
        </Pressable>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <PulseHeart size={20} />
          <Txt size={13} color={C.violet} weight="700">
            {t('brand')}
          </Txt>
        </View>
        <Txt size={28} weight="800">
          {title}
        </Txt>
        <Txt color={C.muted}>{sub}</Txt>
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export function SignIn({ onBack, onSignUp, onGoogle }: { onBack: () => void; onSignUp: () => void; onGoogle: () => void }) {
  const { t, signIn } = useStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [err, setErr] = useState<TKey | ''>('');
  return (
    <AuthShell title={t('welcome_back')} sub={t('auth_sub_in')} onBack={onBack}>
      <Field label={t('email')} value={email} onChangeText={setEmail} placeholder={t('email_ph')} keyboardType="email-address" />
      <Field
        label={t('password')}
        value={password}
        onChangeText={setPassword}
        placeholder={t('password_ph')}
        secure={!show}
        right={
          <Pressable onPress={() => setShow((s) => !s)}>
            <Txt size={12} color={C.violet}>
              {show ? t('hide_pw') : t('show_pw')}
            </Txt>
          </Pressable>
        }
      />
      {err ? <Txt color={C.bad}>{t(err)}</Txt> : null}
      <Txt size={12} color={C.faint}>
        {t('secure_note')}
      </Txt>
      <Btn
        label={t('sign_in')}
        icon="log-in-outline"
        onPress={() => {
          const r = signIn(email, password);
          setErr(r.ok ? '' : r.error || 'wrong_creds');
        }}
      />
      <Btn label={t('continue_google')} kind="ghost" icon="logo-google" onPress={onGoogle} />
      <Pressable onPress={onSignUp}>
        <Txt color={C.muted} style={{ textAlign: 'center' }}>
          {t('no_account')} <Txt color={C.violet}>{t('sign_up')}</Txt>
        </Txt>
      </Pressable>
    </AuthShell>
  );
}

export function SignUp({ onBack, onSignIn }: { onBack: () => void; onSignIn: () => void }) {
  const { t, signUp } = useStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [agree, setAgree] = useState(false);
  const [show, setShow] = useState(false);
  const [err, setErr] = useState<TKey | ''>('');
  return (
    <AuthShell title={t('create_account')} sub={t('auth_sub_up')} onBack={onBack}>
      <Field label={t('full_name')} value={name} onChangeText={setName} placeholder={t('name_ph')} autoCapitalize="words" />
      <Field label={t('email')} value={email} onChangeText={setEmail} placeholder={t('email_ph')} keyboardType="email-address" />
      <Field
        label={t('password')}
        value={password}
        onChangeText={setPassword}
        placeholder={t('password_ph')}
        secure={!show}
        right={
          <Pressable onPress={() => setShow((s) => !s)}>
            <Txt size={12} color={C.violet}>
              {show ? t('hide_pw') : t('show_pw')}
            </Txt>
          </Pressable>
        }
      />
      <Field label={t('confirm_password')} value={confirm} onChangeText={setConfirm} secure={!show} />
      <Pressable onPress={() => setAgree((a) => !a)} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
        <Ionicons name={agree ? 'checkbox' : 'square-outline'} size={20} color={agree ? C.mint : C.muted} />
        <Txt size={13} color={C.muted} style={{ flex: 1 }}>
          {t('agree')}
        </Txt>
      </Pressable>
      {err ? <Txt color={C.bad}>{t(err)}</Txt> : null}
      <Btn
        label={t('create_account')}
        icon="sparkles-outline"
        onPress={() => {
          if (!agree) return setErr('must_agree');
          if (password !== confirm) return setErr('mismatch');
          const r = signUp({ name, email, password });
          setErr(r.ok ? '' : r.error || 'invalid_email');
        }}
      />
      <Pressable onPress={onSignIn}>
        <Txt color={C.muted} style={{ textAlign: 'center' }}>
          {t('have_account')} <Txt color={C.violet}>{t('sign_in')}</Txt>
        </Txt>
      </Pressable>
    </AuthShell>
  );
}

export function GoogleLink({ onBack }: { onBack: () => void }) {
  const { t, googleLink } = useStore();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [err, setErr] = useState<TKey | ''>('');
  return (
    <AuthShell title={t('google_title')} sub={t('google_body')} onBack={onBack}>
      <View style={{ backgroundColor: '#1A1408', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#5C4A1E' }}>
        <Txt size={13} color={C.gold}>
          {t('google_note')}
        </Txt>
      </View>
      <Field label={t('email')} value={email} onChangeText={setEmail} placeholder={t('google_email_ph')} keyboardType="email-address" />
      <Field label={t('full_name')} value={name} onChangeText={setName} placeholder={t('name_ph')} autoCapitalize="words" />
      {err ? <Txt color={C.bad}>{t(err)}</Txt> : null}
      <Btn
        label={t('continue_google')}
        icon="logo-google"
        onPress={() => {
          const r = googleLink(email, name);
          setErr(r.ok ? '' : r.error || 'invalid_email');
        }}
      />
    </AuthShell>
  );
}

export function LockScreen() {
  const { t, checkPin, unlock, signOut, settings } = useStore();
  const [pin, setPin] = useState('');
  const [err, setErr] = useState('');
  const [note, setNote] = useState('');
  const tryBio = async () => {
    try {
      const has = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (!has || !enrolled) {
        setNote(t('web_no_bio'));
        return;
      }
      const r = await LocalAuthentication.authenticateAsync({ promptMessage: t('bio_reason'), cancelLabel: t('cancel') });
      if (r.success) unlock();
    } catch {
      setNote(t('web_no_bio'));
    }
  };
  return (
    <View style={{ flex: 1, backgroundColor: C.bg, padding: 28, justifyContent: 'center', gap: 16 }}>
      <View style={{ alignItems: 'center', gap: 8 }}>
        <PulseHeart size={40} />
        <Txt size={26} weight="800">
          {t('locked_title')}
        </Txt>
        <Txt color={C.muted} style={{ textAlign: 'center' }}>
          {t('locked_sub')}
        </Txt>
      </View>
      <Field label={t('pin_label')} value={pin} onChangeText={setPin} placeholder={t('pin_ph')} keyboardType="number-pad" secure />
      {err ? <Txt color={C.bad}>{err}</Txt> : null}
      {note ? <Txt color={C.gold}>{note}</Txt> : null}
      <Btn
        label={t('unlock')}
        onPress={async () => {
          if (await checkPin(pin)) unlock();
          else setErr(t('wrong_pin'));
        }}
      />
      {settings.biometric ? <Btn label={t('try_bio')} kind="soft" icon="finger-print" onPress={tryBio} /> : null}
      <Pressable onPress={signOut}>
        <Txt size={13} color={C.muted} style={{ textAlign: 'center' }}>
          {t('forgot_pin')} {t('reset_lock')}
        </Txt>
      </Pressable>
    </View>
  );
}
