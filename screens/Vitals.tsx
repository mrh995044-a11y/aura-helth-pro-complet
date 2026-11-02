import React, { useEffect, useMemo, useState } from 'react';
import { Alert, AppState, FlatList, Pressable, ScrollView, View } from 'react-native';
import { Pedometer } from 'expo-sensors';
import * as ImagePicker from 'expo-image-picker';
import { runGemini } from '../lib/ai';
import { parseReportReading } from '../lib/reportScan';
import { enableBedtimeReminder, syncBedtimeReminder } from '../lib/reminders';
import { Ionicons } from '@expo/vector-icons';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { Bars, Btn, Card, Field, Pill, PulseHeart, Sheet, Txt } from '../components/ui';
import { useStore } from '../lib/store';
import { C, metricColor } from '../lib/theme';
import {
  bandColor,
  classify,
  formatValue,
  formatWhen,
  greetingKey,
  latestOf,
  metricUnit,
  todaySteps,
  todayWater,
  weekSeries,
} from '../lib/health';
import type { Metric } from '../lib/types';

const MANUAL: Metric[] = ['bp', 'hr', 'glucose', 'spo2', 'weight'];
const QUICK: Metric[] = ['bp', 'hr', 'glucose', 'sleep', 'steps', 'water', 'weight', 'spo2'];
// Broad input sanity limits, not clinical normal ranges.
const INPUTS: Record<Metric, { min: number; max: number; placeholder: string; whole?: boolean }> = {
  bp: { min: 20, max: 300, placeholder: '120', whole: true },
  hr: { min: 20, max: 250, placeholder: '72', whole: true },
  glucose: { min: 10, max: 1000, placeholder: '100' },
  sleep: { min: 0, max: 24, placeholder: '7.5' },
  steps: { min: 0, max: 200000, placeholder: '6500', whole: true },
  water: { min: 0, max: 20000, placeholder: '250' },
  weight: { min: 1, max: 500, placeholder: '70.5' },
  spo2: { min: 1, max: 100, placeholder: '98' },
};
const validNumber = (text: string) => /^(?:\d+(?:\.\d+)?|\.\d+)$/.test(text.trim());

export function VitalsScreen() {
  const { t, vault, session, settings, updateSettings, addVital, removeVital } = useStore();
  const nav = useNavigation<any>();
  const focused = useIsFocused();
  const [appActive, setAppActive] = useState(AppState.currentState === 'active');
  useEffect(() => {
    const sub = AppState.addEventListener('change', state => setAppActive(state === 'active'));
    return () => sub.remove();
  }, []);
  const [open, setOpen] = useState(false);
  const [metric, setMetric] = useState<Metric>('bp');
  const [value, setValue] = useState('');
  const [value2, setValue2] = useState('');
  const [context, setContext] = useState('');
  const [err, setErr] = useState('');
  const [bedtime, setBedtime] = useState(settings.bedtimeReminder || '22:00');
  const [scanning, setScanning] = useState(false);
  const [scanReview, setScanReview] = useState(false);
  const [liveSteps, setLiveSteps] = useState(0);
  const [stepError, setStepError] = useState('');
  useEffect(() => {
    if (!settings.stepTrackingEnabled || !focused || !appActive) return;
    let active = true;
    let subscription: { remove: () => void } | undefined;
    setLiveSteps(0);
    (async () => {
      try {
        if (!await Pedometer.isAvailableAsync()) throw new Error('This device does not have an available step sensor.');
        const permission = await Pedometer.getPermissionsAsync();
        if (!permission.granted) throw new Error('Activity permission is needed. Turn step tracking on again to allow it.');
        if (active) subscription = Pedometer.watchStepCount((result) => { if (active) setLiveSteps(result.steps); });
      } catch (error) { if (active) setStepError(error instanceof Error ? error.message : 'Step sensor unavailable.'); }
    })();
    return () => { active = false; subscription?.remove(); };
  }, [settings.stepTrackingEnabled, focused, appActive]);
  const [expanded, setExpanded] = useState<Metric | null>('bp');

  const name = vault.profile.name || session?.name || t('guest');
  const samples = vault.vitals.some((v) => v.sample);
  const latest = useMemo(() => QUICK.map((m) => ({ m, v: latestOf(vault.vitals, m) })), [vault.vitals]);
  const urgent = latest.some((x) => x.v && classify(x.v.metric, x.v.value, x.v.value2) === 'urgent');
  const watch = latest.some((x) => x.v && ['watch', 'high', 'low'].includes(classify(x.v.metric, x.v.value, x.v.value2)));
  const water = todayWater(vault.vitals);
  const steps = todaySteps(vault.vitals);
  const bpSeries = weekSeries(vault.vitals, 'bp').map((d) => d.value);

  const save = () => {
    const n = Number(value);
    const rule = INPUTS[metric];
    if (!validNumber(value) || !Number.isFinite(n) || n < rule.min || n > rule.max || (rule.whole && !Number.isInteger(n))) return setErr(t('reading_invalid_range'));
    let n2: number | undefined;
    if (metric === 'bp') {
      n2 = Number(value2);
      if (!validNumber(value2) || !Number.isInteger(n2) || n2 < 10 || n2 > 200 || n2 >= n) return setErr(t('reading_invalid_range'));
    }
    addVital({ metric, value: n, value2: n2, at: Date.now(), context: context.trim() || undefined, sample: false });
    setOpen(false);
    setValue('');
    setValue2('');
    setContext('');
    setErr('');
    setScanReview(false);
    if (classify(metric, n, n2) === 'urgent') Alert.alert('Reading needs attention', 'This value may need prompt medical advice. The app cannot detect a heart attack or diagnose a disease. If you have chest pain, trouble breathing, severe symptoms, or feel seriously unwell, seek emergency care or call 1990. Do not wait for an app alert.');
  };

  const pickReport = async (camera: boolean) => {
    try {
      const permission = camera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) { Alert.alert('Permission needed', camera ? 'Allow camera access to photograph a report.' : 'Allow photo access to choose a report.'); return; }
      const image = camera
        ? await ImagePicker.launchCameraAsync({ base64: true, quality: 0.4 })
        : await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.4, mediaTypes: ['images'] });
      if (image.canceled || !image.assets[0]?.base64) return;
      const asset = image.assets[0];
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(asset.mimeType || 'image/jpeg') || asset.base64!.length > 1800000) { Alert.alert('Cannot scan this image', 'Choose a JPEG, PNG or WebP image under the upload size limit.'); return; }
      setScanning(true); setErr(''); setScanReview(false);
      const res = await runGemini({ settings, imageBase64: asset.base64!, mimeType: asset.mimeType || 'image/jpeg', prompt: 'Read ONE clearly identified measurement from this report. Return only JSON with metric, value, value2 and unit. Allowed metric and exact unit pairs: bp/mmHg (systolic as value and diastolic as value2), hr/bpm, glucose/mg/dL, spo2/%, weight/kg. Values must be JSON numbers. If there is no clearly identifiable supported measurement in those exact units, return {}. Do not convert units, guess, diagnose or add prose.' });
      if (res.error) { setErr(res.error); return; }
      const parsed = parseReportReading(res.text);
      if (!parsed) { setErr('No supported reading was found. Enter it manually and verify the units.'); return; }
      setMetric(parsed.metric); setValue(parsed.value); setValue2(parsed.value2 || ''); setContext(''); setScanReview(true);
    } catch { setErr('Could not scan the report. Try again or enter the reading manually.'); } finally { setScanning(false); }
  };
  const scanReport = () => {
    Alert.alert('Scan a report with AI?', 'The selected report image will be sent through AuraHealth Pro to Gemini. AI can misread numbers, units and dates. Review the result carefully before saving; do not use it for emergency decisions.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Take photo', onPress: () => { void pickReport(true); } },
      { text: 'Choose photo', onPress: () => { void pickReport(false); } },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <FlatList
        data={vault.vitals}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 110, gap: 10 }}
        ListHeaderComponent={
          <View style={{ gap: 12, marginBottom: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <PulseHeart size={26} />
              <View style={{ flex: 1 }}>
                <Txt size={13} color={C.violet} weight="700">
                  {t(greetingKey())}
                </Txt>
                <Txt size={22} weight="800">
                  {name}
                </Txt>
              </View>
              <Pressable onPress={() => setOpen(true)} style={{ backgroundColor: C.violetDeep, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8 }}>
                <Txt size={13} weight="700">
                  {t('log_reading')}
                </Txt>
              </Pressable>
            </View>
            <Txt size={13} color={C.muted}>
              {t('vitals_sub')}
            </Txt>
            {samples ? (
              <View style={{ backgroundColor: '#2A2140', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: C.lineStrong }}>
                <Txt size={12} color={C.violet}>
                  {t('sample_banner')}
                </Txt>
              </View>
            ) : null}
            <Card style={{ borderColor: urgent ? C.urgent : C.line }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Txt weight="800">{!vault.vitals.length ? t('no_readings_yet') : urgent ? t('pulse_urgent') : watch ? t('pulse_watch') : t('pulse_ok')}</Txt>
                <Pill label={!vault.vitals.length ? t('band_none') : urgent ? t('band_urgent') : watch ? t('band_watch') : t('band_ok')} color={!vault.vitals.length ? C.muted : urgent ? C.urgent : watch ? C.gold : C.good} />
              </View>
              <Txt size={12} color={C.muted} style={{ marginTop: 6 }}>
                {t('range_note')} {t('not_diagnosis')}
              </Txt>
              {urgent ? (
                <Txt size={12} color={C.bad} style={{ marginTop: 6 }}>
                  {t('see_clinician')} {t('emergency_line')}
                </Txt>
              ) : null}
            </Card>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
              {latest.map(({ m, v }) => {
                const band = v ? classify(v.metric, v.value, v.value2) : 'none';
                return (
                  <Pressable key={m} onPress={() => setExpanded(m)} style={{ width: 148 }}>
                    <Card style={{ borderColor: expanded === m ? metricColor[m] : C.line, gap: 6 }}>
                      <Txt size={12} color={C.muted}>
                        {t(m)}
                      </Txt>
                      <Txt size={22} weight="800">
                        {v ? formatValue(v) : '—'}
                      </Txt>
                      <Txt size={11} color={C.faint}>
                        {metricUnit(m)}
                      </Txt>
                      <Pill label={t(`band_${band}` as any)} color={bandColor(band)} />
                    </Card>
                  </Pressable>
                );
              })}
            </ScrollView>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Card style={{ flex: 1, gap: 6 }}>
                <Txt size={12} color={C.muted}>
                  {t('today_water')}
                </Txt>
                <Txt size={20} weight="800">
                  {Math.round(water)} ml
                </Txt>
                <View style={{ height: 6, backgroundColor: C.card3, borderRadius: 6 }}>
                  <View style={{ width: `${Math.min(100, (water / 2000) * 100)}%`, height: 6, backgroundColor: C.mint, borderRadius: 6 }} />
                </View>
                <Txt size={11} color={C.faint}>
                  {t('goal')} {t('water_goal')}
                </Txt>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <Pressable onPress={() => addVital({ metric: 'water', value: 250, at: Date.now(), context: 'Quick add', sample: false })} style={chip}>
                    <Txt size={12}>{t('add_250')}</Txt>
                  </Pressable>
                  <Pressable onPress={() => addVital({ metric: 'water', value: 500, at: Date.now(), context: 'Quick add', sample: false })} style={chip}>
                    <Txt size={12}>{t('add_500')}</Txt>
                  </Pressable>
                </View>
              </Card>
              <Card style={{ flex: 1, gap: 6 }}>
                <Txt size={12} color={C.muted}>
                  {t('today_steps')}
                </Txt>
                <Txt size={20} weight="800">
                  {Math.round(steps).toLocaleString()}
                </Txt>
                <View style={{ height: 6, backgroundColor: C.card3, borderRadius: 6 }}>
                  <View style={{ width: `${Math.min(100, (steps / 7000) * 100)}%`, height: 6, backgroundColor: C.cyan, borderRadius: 6 }} />
                </View>
                <Txt size={11} color={C.faint}>
                  {t('goal')} {t('steps_goal')}
                </Txt>
              </Card>
            </View>
            <Card style={{ gap: 8 }}>
              <Txt weight="800">Live steps</Txt>
              <Txt size={22} weight="800">{settings.stepTrackingEnabled ? liveSteps.toLocaleString() : '—'}</Txt>
              <Txt size={12} color={C.muted}>Counts steps while this screen is active. The counter resets when you leave it; background and all-day tracking are not available yet.</Txt>
              {stepError ? <Txt size={12} color={C.gold}>{stepError}</Txt> : null}
              <Btn label={settings.stepTrackingEnabled ? 'Turn off live steps' : 'Enable live steps'} kind="soft" onPress={async () => {
                if (settings.stepTrackingEnabled) { updateSettings({ stepTrackingEnabled: false }); setStepError(''); return; }
                try {
                  if (!await Pedometer.isAvailableAsync()) throw new Error('This device does not have an available step sensor.');
                  const permission = await Pedometer.requestPermissionsAsync();
                  if (!permission.granted) throw new Error('Allow physical activity permission in your device settings.');
                  setStepError(''); updateSettings({ stepTrackingEnabled: true });
                } catch (error) { setStepError(error instanceof Error ? error.message : 'Could not start step tracking.'); }
              }} />
            </Card>
            <Card style={{ gap: 8 }}>
              <Txt weight="800">Bedtime reminder</Txt>
              <Txt size={12} color={C.muted}>Choose a daily bedtime in 24-hour time. Sound and vibration depend on device settings; keep a backup reminder.</Txt>
              <Field label="Bedtime (HH:MM)" value={bedtime} onChangeText={setBedtime} placeholder="22:00" />
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={{ flex: 1 }}><Btn label="Set bedtime" kind="soft" onPress={async () => {
                  try { await enableBedtimeReminder(bedtime); updateSettings({ bedtimeReminder: bedtime }); Alert.alert('Bedtime reminder', `Daily reminder set for ${bedtime}.`); }
                  catch (error) { Alert.alert('Bedtime reminder', error instanceof Error ? error.message : 'Could not schedule reminder.'); }
                }} /></View>
                <View style={{ flex: 1 }}><Btn label="Turn off" kind="ghost" onPress={async () => {
                  try { await syncBedtimeReminder(''); updateSettings({ bedtimeReminder: '' }); Alert.alert('Bedtime reminder', 'Reminder turned off.'); }
                  catch { Alert.alert('Bedtime reminder', 'Could not remove the reminder. Try again.'); }
                }} /></View>
              </View>
              {settings.bedtimeReminder ? <Txt size={12} color={C.mint}>Reminder set: {settings.bedtimeReminder}</Txt> : null}
            </Card>
            <Card style={{ gap: 8 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Txt weight="700">{t('bp')} · {t('last_7')}</Txt>
                <Txt size={12} color={C.muted}>{t('avg_7')}</Txt>
              </View>
              <Bars values={bpSeries} color={C.pink} />
              <Pressable onPress={() => nav.navigate('AuraCoach')} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                <Ionicons name="sparkles" size={16} color={C.violet} />
                <View style={{ flex: 1 }}>
                  <Txt weight="700">{t('coach_cta')}</Txt>
                  <Txt size={12} color={C.muted}>{t('coach_cta_sub')}</Txt>
                </View>
                <Ionicons name="chevron-forward" size={16} color={C.faint} />
              </Pressable>
            </Card>
            <Txt weight="800" size={16} style={{ marginTop: 4 }}>
              {t('recent')}
            </Txt>
          </View>
        }
        renderItem={({ item }) => {
          const band = classify(item.metric, item.value, item.value2);
          return (
            <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ width: 8, height: 36, borderRadius: 8, backgroundColor: metricColor[item.metric] }} />
              <View style={{ flex: 1 }}>
                <Txt weight="700">
                  {t(item.metric)} · {formatValue(item)} {metricUnit(item.metric)}
                </Txt>
                <Txt size={12} color={C.muted}>
                  {formatWhen(item.at)}
                  {item.context ? ` · ${item.context}` : ''}
                  {item.sample ? ` · ${t('sample')}` : ''}
                </Txt>
              </View>
              <Pill label={t(`band_${band}` as any)} color={bandColor(band)} />
              <Pressable accessibilityRole="button" accessibilityLabel={`${t('delete')} ${t(item.metric)}`} onPress={() => Alert.alert(t('delete'), t('delete_q'), [
                { text: t('cancel'), style: 'cancel' },
                { text: t('delete'), style: 'destructive', onPress: () => removeVital(item.id) },
              ])} hitSlop={10} style={{ padding: 8 }}>
                <Ionicons name="trash-outline" size={20} color={C.bad} />
              </Pressable>
            </Card>
          );
        }}
        ListEmptyComponent={<Txt color={C.muted}>{t('empty_vitals')}</Txt>}
      />
      <Sheet visible={open} onClose={() => setOpen(false)} title={t('log_reading')}>
        <ScrollView contentContainerStyle={{ gap: 12 }} keyboardShouldPersistTaps="handled">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {MANUAL.map((m) => (
              <Pressable key={m} onPress={() => { setMetric(m); setValue(''); setValue2(''); setErr(''); setScanReview(false); }} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 99, backgroundColor: metric === m ? C.violetDeep : C.card }}>
                <Txt size={13}>{t(m)}</Txt>
              </Pressable>
            ))}
          </ScrollView>
          <Btn label={scanning ? 'Scanning report…' : 'Scan report photo'} kind="soft" loading={scanning} disabled={scanning} onPress={scanReport} />
          {scanReview ? <Txt size={12} color={C.gold}>AI suggestion only: check the value and units against the report. Saving records the current time, not the report date.</Txt> : null}
          <Field label={`${metric === 'bp' ? t('systolic') : t('value')} (${metricUnit(metric)})`} value={value} onChangeText={setValue} keyboardType="decimal-pad" placeholder={INPUTS[metric].placeholder} />
          {metric === 'bp' ? <Field label={t('diastolic')} value={value2} onChangeText={setValue2} keyboardType="decimal-pad" placeholder="84" /> : null}
          <Field label={t('context')} value={context} onChangeText={setContext} placeholder={t('context_ph')} autoCapitalize="sentences" />
          {err ? <Txt color={C.bad}>{err}</Txt> : null}
          <Txt size={12} color={C.faint}>
            {t('reading_note')}
          </Txt>
          <Btn label={t('save_reading')} onPress={save} disabled={scanning} />
        </ScrollView>
      </Sheet>
    </View>
  );
}

const chip = { backgroundColor: C.card3, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 6 } as const;
