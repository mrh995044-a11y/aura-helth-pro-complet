import React, { useState } from 'react';
import { Linking, Pressable, ScrollView, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as LocalAuthentication from 'expo-local-authentication';
import { Ionicons } from '@expo/vector-icons';
import { Btn, Card, Field, Pill, PulseHeart, Sheet, Txt } from '../components/ui';
import { useStore } from '../lib/store';
import { C } from '../lib/theme';
import { isPro, luhn, PLANS, uid } from '../lib/health';
import type { Lang } from '../lib/types';

export function ProfileScreen() {
  const store = useStore();
  const { t, session, vault, settings, updateSettings, setLang, updateProfile, signOut, setPin, clearPin, activatePlan, cancelPlan, exportJson } = store;
  const [sheet, setSheet] = useState<null | 'health' | 'lock' | 'plan' | 'privacy' | 'setup' | 'export' | 'pay'>(null);
  const [planPick, setPlanPick] = useState<'monthly' | 'yearly'>('yearly');
  const [toast, setToast] = useState('');
  const pro = isPro(settings);

  const ping = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 1800);
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120, gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <PulseHeart size={28} />
          <View style={{ flex: 1 }}>
            <Txt size={22} weight="800">{vault.profile.name || session?.name}</Txt>
            <Txt size={13} color={C.muted}>{session?.email}</Txt>
          </View>
          <Pill label={pro ? t('pro') : t('free')} color={pro ? C.gold : C.violet} />
        </View>
        <Txt size={12} color={C.faint}>{t('not_verified_prod')}</Txt>
        <Card style={{ gap: 4 }}>
          <Txt size={12} color={C.muted}>{t('plan_line')}</Txt>
          <Txt weight="800">{pro ? (settings.plan === 'yearly' ? t('pro_yearly') : t('pro_monthly')) : t('free_plan')}</Txt>
          {settings.planUntil ? <Txt size={12} color={C.faint}>{t('until')} {new Date(settings.planUntil).toLocaleDateString()}</Txt> : null}
          <Btn label={pro ? t('manage') : t('upgrade_pro')} kind="soft" onPress={() => setSheet('plan')} />
        </Card>
        <Row icon="language" label={t('language')} sub={settings.lang === 'si' ? 'සිංහල' : settings.lang === 'ta' ? 'தமிழ்' : 'English'} onPress={() => setSheet('health') } extra={
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {(['en', 'si', 'ta'] as Lang[]).map((l) => (
              <Pressable key={l} onPress={() => setLang(l)}>
                <Pill label={l.toUpperCase()} color={settings.lang === l ? C.white : C.muted} bg={settings.lang === l ? C.violetDeep : C.card3} />
              </Pressable>
            ))}
          </View>
        } />
        <Row icon="person-outline" label={t('health_profile')} sub={vault.profile.bloodGroup || t('add_health')} onPress={() => setSheet('health')} />
        <Row icon="lock-closed-outline" label={t('security')} sub={settings.lockEnabled ? t('on') : t('off')} onPress={() => setSheet('lock')} />
        <Row icon="shield-checkmark-outline" label={t('privacy')} sub={t('data_local')} onPress={() => setSheet('privacy')} />
        <Row icon="document-text-outline" label={t('setup')} sub={t('guide_p')} onPress={() => setSheet('setup')} />
        <Row icon="download-outline" label={t('export_data')} sub={t('json_ready')} onPress={() => setSheet('export')} />
        <Card style={{ gap: 8, borderColor: '#5C2030' }}>
          <Txt weight="800">{t('emergency_h')}</Txt>
          <Txt size={13} color={C.muted}>{t('emergency_line')}</Txt>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1 }}><Btn label={t('call_1990')} kind="danger" onPress={() => Linking.openURL('tel:1990')} /></View>
            <View style={{ flex: 1 }}><Btn label={t('call_119')} kind="ghost" onPress={() => Linking.openURL('tel:119')} /></View>
          </View>
        </Card>
        <Btn label={t('sign_out')} kind="ghost" onPress={signOut} />
        <Txt size={11} color={C.faint} style={{ textAlign: 'center' }}>{t('version_p')} · {t('lookww')}</Txt>
      </ScrollView>
      {toast ? <View style={{ position: 'absolute', bottom: 24, alignSelf: 'center', backgroundColor: C.card3, borderRadius: 99, paddingHorizontal: 14, paddingVertical: 8 }}><Txt size={12}>{toast}</Txt></View> : null}

      <HealthSheet open={sheet === 'health'} onClose={() => setSheet(null)} />
      <LockSheet open={sheet === 'lock'} onClose={() => setSheet(null)} onSaved={(m) => ping(m)} />
      <PlanSheet
        open={sheet === 'plan'}
        onClose={() => setSheet(null)}
        pick={planPick}
        setPick={setPlanPick}
        onCheckout={() => setSheet('pay')}
      />
      <PaySheet open={sheet === 'pay'} plan={planPick} onClose={() => setSheet('plan')} onDone={(m) => { setSheet(null); ping(m); }} />
      <InfoSheet open={sheet === 'privacy'} onClose={() => setSheet(null)} title={t('privacy')}>
        <Txt size={13} color={C.muted} style={{ lineHeight: 20 }}>{t('privacy_body')}</Txt>
        <Txt size={13}>{t('privacy_1')}</Txt>
        <Txt size={13}>{t('privacy_2')}</Txt>
        <Txt size={13}>{t('privacy_3')}</Txt>
        <Txt size={13}>{t('privacy_4')}</Txt>
        <Btn label={settings.aiConsent ? t('revoke') : t('allow')} kind="soft" onPress={() => updateSettings({ aiConsent: !settings.aiConsent })} />
      </InfoSheet>
      <InfoSheet open={sheet === 'setup'} onClose={() => setSheet(null)} title={t('setup')}>
        <Txt weight="700">{t('how_db')}</Txt>
        <Txt size={13} color={C.muted}>{t('steps_db')}</Txt>
        <Txt weight="700">{t('how_android')}</Txt>
        <Txt size={13} color={C.muted}>{t('steps_android')}</Txt>
      </InfoSheet>
      <InfoSheet open={sheet === 'export'} onClose={() => setSheet(null)} title={t('export_data')}>
        <Txt size={13} color={C.muted}>{t('exported_body')}</Txt>
        <Btn label={t('copy')} onPress={async () => { await Clipboard.setStringAsync(exportJson()); ping(t('copied')); }} />
      </InfoSheet>
    </View>
  );
}

function Row({ icon, label, sub, onPress, extra }: { icon: keyof typeof Ionicons.glyphMap; label: string; sub: string; onPress: () => void; extra?: React.ReactNode }) {
  return (
    <Pressable onPress={onPress}>
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Ionicons name={icon} size={18} color={C.violet} />
        <View style={{ flex: 1 }}>
          <Txt weight="700">{label}</Txt>
          <Txt size={12} color={C.muted}>{sub}</Txt>
        </View>
        {extra || <Ionicons name="chevron-forward" size={16} color={C.faint} />}
      </Card>
    </Pressable>
  );
}

function InfoSheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  return (
    <Sheet visible={open} onClose={onClose} title={title}>
      <ScrollView contentContainerStyle={{ gap: 10 }} style={{ maxHeight: 480 }}>{children}</ScrollView>
    </Sheet>
  );
}

function HealthSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, vault, updateProfile } = useStore();
  const [p, setP] = useState(vault.profile);
  React.useEffect(() => { if (open) setP(vault.profile); }, [open, vault.profile]);
  const set = (k: keyof typeof p, v: string) => setP({ ...p, [k]: v });
  return (
    <Sheet visible={open} onClose={onClose} title={t('health_profile')}>
      <ScrollView contentContainerStyle={{ gap: 8 }} keyboardShouldPersistTaps="handled" style={{ maxHeight: 500 }}>
        <Txt size={12} color={C.faint}>{t('profile_sub')}</Txt>
        <Field label={t('name_label')} value={p.name} onChangeText={(v) => set('name', v)} autoCapitalize="words" />
        <Field label={t('dob_label')} value={p.dob} onChangeText={(v) => set('dob', v)} placeholder={t('dob_ph')} />
        <Field label={t('sex_label')} value={p.sex} onChangeText={(v) => set('sex', v)} autoCapitalize="words" />
        <Field label={t('blood')} value={p.bloodGroup} onChangeText={(v) => set('bloodGroup', v)} />
        <Field label={t('height')} value={p.heightCm} onChangeText={(v) => set('heightCm', v)} keyboardType="decimal-pad" />
        <Field label={t('weight')} value={p.weightKg} onChangeText={(v) => set('weightKg', v)} keyboardType="decimal-pad" />
        <Field label={t('conditions')} value={p.conditions} onChangeText={(v) => set('conditions', v)} autoCapitalize="sentences" />
        <Field label={t('allergies')} value={p.allergies} onChangeText={(v) => set('allergies', v)} autoCapitalize="sentences" />
        <Field label={t('emergency_name')} value={p.emergencyName} onChangeText={(v) => set('emergencyName', v)} autoCapitalize="words" />
        <Field label={t('emergency_phone')} value={p.emergencyPhone} onChangeText={(v) => set('emergencyPhone', v)} keyboardType="phone-pad" />
        <Field label={t('home_district')} value={p.homeDistrict} onChangeText={(v) => set('homeDistrict', v)} autoCapitalize="words" />
        <Btn label={t('save_health')} onPress={() => { updateProfile(p); onClose(); }} />
      </ScrollView>
    </Sheet>
  );
}

function LockSheet({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: (m: string) => void }) {
  const { t, settings, updateSettings, setPin, clearPin, hasPin } = useStore();
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const [err, setErr] = useState('');
  const bio = async () => {
    try {
      const has = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (!has || !enrolled) {
        setErr(t('bio_unavailable'));
        return;
      }
      const r = await LocalAuthentication.authenticateAsync({ promptMessage: t('bio_reason') });
      if (r.success) {
        updateSettings({ biometric: true, lockEnabled: true });
        onSaved(t('bio_on'));
      }
    } catch {
      setErr(t('web_no_bio'));
    }
  };
  return (
    <Sheet visible={open} onClose={onClose} title={t('security')}>
      <View style={{ gap: 10 }}>
        <Txt size={12} color={C.muted}>{t('security_sub')}</Txt>
        <Field label={t('new_pin')} value={a} onChangeText={setA} keyboardType="number-pad" secure placeholder={t('pin_ph')} />
        <Field label={t('confirm_pin')} value={b} onChangeText={setB} keyboardType="number-pad" secure />
        {err ? <Txt color={C.bad}>{err}</Txt> : null}
        <Btn
          label={t('set_pin')}
          onPress={async () => {
            if (!/^\d{4}$/.test(a)) return setErr(t('pin_4'));
            if (a !== b) return setErr(t('pin_mismatch'));
            await setPin(a);
            setA('');
            setB('');
            onSaved(t('pin_saved'));
            onClose();
          }}
        />
        <Btn label={t('enable_bio')} kind="soft" icon="finger-print" onPress={bio} />
        <Pressable onPress={() => updateSettings({ biometric: !settings.biometric })}>
          <Txt size={13} color={C.muted}>{t('biometric')}: {settings.biometric ? t('on') : t('off')}</Txt>
        </Pressable>
        {hasPin ? <Btn label={t('disable')} kind="danger" onPress={async () => { await clearPin(); onSaved(t('off')); onClose(); }} /> : null}
      </View>
    </Sheet>
  );
}

function PlanSheet({
  open,
  onClose,
  pick,
  setPick,
  onCheckout,
}: {
  open: boolean;
  onClose: () => void;
  pick: 'monthly' | 'yearly';
  setPick: (p: 'monthly' | 'yearly') => void;
  onCheckout: () => void;
}) {
  const { t, settings, cancelPlan } = useStore();
  const pro = isPro(settings);
  return (
    <Sheet visible={open} onClose={onClose} title={t('subscription')}>
      <ScrollView contentContainerStyle={{ gap: 10 }} style={{ maxHeight: 520 }}>
        <Txt size={12} color={C.gold}>{t('billed_note')} {t('no_real_charge')}</Txt>
        {(['monthly', 'yearly'] as const).map((id) => (
          <Pressable key={id} onPress={() => setPick(id)} style={{ padding: 14, borderRadius: 16, borderWidth: 1, borderColor: pick === id ? C.violet : C.line, backgroundColor: C.card, gap: 4 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Txt weight="800">{id === 'monthly' ? t('plan_monthly') : t('plan_yearly')}</Txt>
              {id === 'yearly' ? <Pill label={t('recommended')} color={C.gold} /> : null}
            </View>
            <Txt size={22} weight="800">LKR {PLANS[id].lkr.toLocaleString()}</Txt>
            <Txt size={12} color={C.muted}>{id === 'monthly' ? t('per_month') : `${t('per_year')} · ${t('eq_monthly')}`}</Txt>
          </Pressable>
        ))}
        <Txt size={13}>{t('features_pro')}</Txt>
        <Txt size={12} color={C.faint}>{t('features_free')}</Txt>
        <Btn label={t('checkout')} onPress={onCheckout} />
        {pro ? <Btn label={t('cancel_plan')} kind="danger" onPress={() => { cancelPlan(); onClose(); }} /> : null}
        <Txt weight="700">{t('receipt_list')}</Txt>
        {settings.receipts.length === 0 ? <Txt size={12} color={C.muted}>{t('no_receipts')}</Txt> : null}
        {settings.receipts.map((r) => (
          <Txt key={r.id} size={12} color={C.muted}>{new Date(r.at).toLocaleDateString()} · LKR {r.amountLkr} · {r.reference} · {t('demo')}</Txt>
        ))}
      </ScrollView>
    </Sheet>
  );
}

function PaySheet({ open, plan, onClose, onDone }: { open: boolean; plan: 'monthly' | 'yearly'; onClose: () => void; onDone: (m: string) => void }) {
  const { t, activatePlan } = useStore();
  const [method, setMethod] = useState<'card' | 'bank'>('card');
  const [name, setName] = useState('');
  const [number, setNumber] = useState('');
  const [exp, setExp] = useState('');
  const [cvv, setCvv] = useState('');
  const [err, setErr] = useState('');
  const [ref, setRef] = useState('');
  const amount = PLANS[plan].lkr;

  const payCard = () => {
    if (name.trim().length < 2) return setErr(t('name_needed'));
    if (!luhn(number)) return setErr(t('invalid_card'));
    if (!/^\d{2}\/\d{2}$/.test(exp)) return setErr(t('invalid_exp'));
    const [mm, yy] = exp.split('/').map(Number);
    const now = new Date();
    const expDate = new Date(2000 + yy, mm - 1, 1);
    if (mm < 1 || mm > 12 || expDate < new Date(now.getFullYear(), now.getMonth(), 1)) return setErr(t('invalid_exp'));
    if (!/^\d{3,4}$/.test(cvv)) return setErr(t('invalid_cvv'));
    const reference = `DEMO-${uid().slice(-6).toUpperCase()}`;
    setNumber('');
    setCvv('');
    activatePlan(plan, 'card-demo', reference);
    onDone(`${t('pay_success')} ${reference}. ${t('card_discarded')}`);
  };

  return (
    <Sheet visible={open} onClose={onClose} title={t('checkout')}>
      <ScrollView contentContainerStyle={{ gap: 10 }} keyboardShouldPersistTaps="handled" style={{ maxHeight: 520 }}>
        <Card>
          <Txt size={12} color={C.muted}>{t('order_summary')}</Txt>
          <Txt weight="800">{plan === 'monthly' ? t('plan_monthly') : t('plan_yearly')}</Txt>
          <Txt size={20} weight="800">LKR {amount.toLocaleString()}</Txt>
          <Txt size={12} color={C.gold}>{t('no_charge')}</Txt>
        </Card>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable onPress={() => setMethod('card')}><Pill label={t('card_demo')} color={method === 'card' ? C.white : C.muted} bg={method === 'card' ? C.violetDeep : C.card} /></Pressable>
          <Pressable onPress={() => setMethod('bank')}><Pill label={t('bank_ref')} color={method === 'bank' ? C.white : C.muted} bg={method === 'bank' ? C.violetDeep : C.card} /></Pressable>
        </View>
        {method === 'card' ? (
          <>
            <Field label={t('card_name')} value={name} onChangeText={setName} placeholder={t('card_name_ph')} autoCapitalize="words" />
            <Field label={t('card_number')} value={number} onChangeText={setNumber} placeholder={t('card_no_ph')} keyboardType="number-pad" />
            <Field label={t('expiry')} value={exp} onChangeText={setExp} placeholder={t('exp_ph')} />
            <Field label={t('cvv')} value={cvv} onChangeText={setCvv} placeholder={t('cvv_ph')} keyboardType="number-pad" secure />
            <Txt size={11} color={C.faint}>{t('never_leaves')}</Txt>
            {err ? <Txt color={C.bad}>{err}</Txt> : null}
            <Btn label={t('pay_lkr')} onPress={payCard} />
          </>
        ) : (
          <>
            <Txt size={13} color={C.muted}>{t('bank_note')}</Txt>
            <Txt>{t('bank_name')}: {t('commercial')}</Txt>
            <Txt>{t('branch')}: {t('colombo')}</Txt>
            <Txt>{t('account_name')}: {t('demo_account')}</Txt>
            <Txt>{t('amount')}: LKR {amount.toLocaleString()}</Txt>
            <Txt weight="700">{t('reference')}: {ref || '—'}</Txt>
            <Txt size={12} color={C.gold}>{t('do_not_pay')}</Txt>
            <Btn label={t('generate_ref')} kind="soft" onPress={() => setRef(`AHP-${Date.now().toString().slice(-8)}`)} />
            <Btn
              label={t('i_transferred')}
              disabled={!ref}
              onPress={() => {
                activatePlan(plan, 'bank-ref', ref);
                onDone(t('marked'));
              }}
            />
          </>
        )}
      </ScrollView>
    </Sheet>
  );
}

