import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
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
  METRICS,
  metricUnit,
  todaySteps,
  todayWater,
  weekSeries,
} from '../lib/health';
import type { Metric } from '../lib/types';
import type { Metric as MetricT } from '../lib/types';

const QUICK: MetricT[] = ['bp', 'hr', 'glucose', 'sleep', 'steps', 'water', 'weight', 'spo2'];

export function VitalsScreen() {
  const { t, vault, session, addVital, removeVital } = useStore();
  const nav = useNavigation<any>();
  const [open, setOpen] = useState(false);
  const [metric, setMetric] = useState<Metric>('bp');
  const [value, setValue] = useState('');
  const [value2, setValue2] = useState('');
  const [context, setContext] = useState('');
  const [err, setErr] = useState('');
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
    if (!Number.isFinite(n) || n <= 0) return setErr(t('invalid_value'));
    let n2: number | undefined;
    if (metric === 'bp') {
      n2 = Number(value2);
      if (!Number.isFinite(n2) || n2 <= 0) return setErr(t('invalid_value'));
    }
    addVital({ metric, value: n, value2: n2, at: Date.now(), context: context.trim() || undefined, sample: false });
    setOpen(false);
    setValue('');
    setValue2('');
    setContext('');
    setErr('');
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <FlatList
        data={vault.vitals.slice(0, 12)}
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
                <Txt weight="800">{urgent ? t('pulse_urgent') : watch ? t('pulse_watch') : t('pulse_ok')}</Txt>
                <Pill label={urgent ? t('band_urgent') : watch ? t('band_watch') : t('band_ok')} color={urgent ? C.urgent : watch ? C.gold : C.good} />
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
              <Pressable onPress={() => removeVital(item.id)} hitSlop={8}>
                <Ionicons name="trash-outline" size={16} color={C.faint} />
              </Pressable>
            </Card>
          );
        }}
        ListEmptyComponent={<Txt color={C.muted}>{t('empty_vitals')}</Txt>}
      />
      <Sheet visible={open} onClose={() => setOpen(false)} title={t('log_reading')}>
        <ScrollView contentContainerStyle={{ gap: 12 }} keyboardShouldPersistTaps="handled">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {METRICS.map((m) => (
              <Pressable key={m} onPress={() => setMetric(m)} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 99, backgroundColor: metric === m ? C.violetDeep : C.card }}>
                <Txt size={13}>{t(m)}</Txt>
              </Pressable>
            ))}
          </ScrollView>
          <Field label={metric === 'bp' ? t('systolic') : t('value')} value={value} onChangeText={setValue} keyboardType="decimal-pad" placeholder={metric === 'bp' ? '128' : '0'} />
          {metric === 'bp' ? <Field label={t('diastolic')} value={value2} onChangeText={setValue2} keyboardType="decimal-pad" placeholder="84" /> : null}
          <Field label={t('context')} value={context} onChangeText={setContext} placeholder={t('context_ph')} autoCapitalize="sentences" />
          {err ? <Txt color={C.bad}>{err}</Txt> : null}
          <Txt size={12} color={C.faint}>
            {t('range_note')}
          </Txt>
          <Btn label={t('save_reading')} onPress={save} />
        </ScrollView>
      </Sheet>
    </View>
  );
}

const chip = { backgroundColor: C.card3, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 6 } as const;
