import React, { useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Btn, Card, Field, Pill, Sheet, Txt } from '../components/ui';
import { useStore } from '../lib/store';
import { C, medColors } from '../lib/theme';
import { sameDay, startOfDay, uid } from '../lib/health';
import type { Med } from '../lib/types';
import { enableMedicationReminders } from '../lib/reminders';

const FORMS = ['Tablet', 'Capsule', 'Liquid', 'Injection', 'Other'];

function blank(): Med {
  return {
    id: uid(),
    name: '',
    strength: '',
    form: 'Tablet',
    times: ['08:00'],
    withFood: false,
    stock: 30,
    perDose: 1,
    notes: '',
    colorIdx: 0,
    startedAt: Date.now(),
    sample: false,
  };
}

export function MedsScreen() {
  const { t, vault, saveMed, removeMed, markDose, undoDose } = useStore();
  const [editing, setEditing] = useState<Med | null>(null);
  const [timeDraft, setTimeDraft] = useState('20:00');
  const [reminderBusy, setReminderBusy] = useState(false);
  const confirmDelete = (med: Med, closeEditor = false) => Alert.alert(t('delete'), t('delete_med_q'), [
    { text: t('cancel'), style: 'cancel' },
    { text: t('delete'), style: 'destructive', onPress: () => { removeMed(med.id); if (closeEditor) setEditing(null); } },
  ]);
  const today = startOfDay();
  const weekAgo = today - 6 * 86400000;

  const markedWeek = vault.doses.filter((d) => d.loggedAt >= weekAgo);
  const takenWeek = markedWeek.filter((d) => d.status === 'taken').length;
  const adherence = markedWeek.length ? Math.round((takenWeek / markedWeek.length) * 100) : 0;
  const low = vault.meds.filter((m) => m.stock <= Math.max(5, m.perDose * 5));

  const rows = useMemo(() => {
    return vault.meds.flatMap((m) =>
      m.times.map((slot) => {
        const log = vault.doses.find((d) => d.medId === m.id && d.slot === slot && sameDay(d.loggedAt, Date.now()));
        return { med: m, slot, log };
      }),
    );
  }, [vault.meds, vault.doses]);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <FlatList
        data={vault.meds}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 110, gap: 10 }}
        ListHeaderComponent={
          <View style={{ gap: 12, marginBottom: 4 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <Txt size={22} weight="800">{t('meds_title')}</Txt>
                <Txt size={13} color={C.muted}>{t('meds_sub')}</Txt>
              </View>
              <Pressable onPress={() => { setEditing(blank()); setTimeDraft('20:00'); }} style={{ backgroundColor: C.violetDeep, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8 }}>
                <Txt size={13} weight="700">{t('add_med')}</Txt>
              </Pressable>
            </View>
            {vault.meds.some((m) => m.sample) ? (
              <Card style={{ backgroundColor: '#2A2140' }}>
                <Txt size={12} color={C.violet}>{t('replace_rx')}</Txt>
              </Card>
            ) : null}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Card style={{ flex: 1 }}>
                <Txt size={12} color={C.muted}>{t('adherence')}</Txt>
                <Txt size={28} weight="800">{adherence}%</Txt>
                <Txt size={11} color={C.faint}>{t('adherence_sub')}</Txt>
              </Card>
              <Card style={{ flex: 1 }}>
                <Txt size={12} color={C.muted}>{t('low_stock')}</Txt>
                <Txt size={28} weight="800">{low.length}</Txt>
                <Txt size={11} color={C.faint}>{low.map((m) => m.name).join(', ') || t('none')}</Txt>
              </Card>
            </View>
            <Btn label={t('enable_med_reminders')} icon="notifications-outline" kind="soft" loading={reminderBusy} onPress={async () => {
              setReminderBusy(true);
              try {
                await enableMedicationReminders(vault.meds);
                Alert.alert(t('reminders_title'), t('reminders_enabled'));
              } catch (error) {
                Alert.alert(t('reminders_title'), error instanceof Error ? error.message : t('reminders_error'));
              } finally { setReminderBusy(false); }
            }} />
            <Txt size={12} color={C.faint}>{t('reminders_note')}</Txt>
            <Txt weight="800">{t('today_schedule')}</Txt>
            {rows.length === 0 ? <Txt color={C.muted}>{t('nothing_due')}</Txt> : null}
            {rows.map(({ med, slot, log }) => (
              <Card key={`${med.id}-${slot}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ width: 10, height: 36, borderRadius: 8, backgroundColor: medColors[med.colorIdx % medColors.length] }} />
                <View style={{ flex: 1 }}>
                  <Txt weight="700">{med.name} · {slot}</Txt>
                  <Txt size={12} color={C.muted}>{med.strength} · {med.withFood ? t('food_yes') : t('food_no')}{med.sample ? ` · ${t('sample')}` : ''}</Txt>
                </View>
                {log ? (
                  <Pressable onPress={() => undoDose(med.id, slot)}>
                    <Pill label={log.status === 'taken' ? t('taken') : t('skipped')} color={log.status === 'taken' ? C.good : C.gold} />
                  </Pressable>
                ) : (
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    <Pressable onPress={() => markDose(med.id, slot, 'taken')} style={mini}><Txt size={12}>{t('take')}</Txt></Pressable>
                    <Pressable onPress={() => markDose(med.id, slot, 'skipped')} style={mini}><Txt size={12}>{t('skip')}</Txt></Pressable>
                  </View>
                )}
              </Card>
            ))}
            <Txt weight="800" style={{ marginTop: 6 }}>{t('medicine')}</Txt>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable onPress={() => setEditing(item)}>
            <Card style={{ gap: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: medColors[item.colorIdx % medColors.length] }} />
                <Txt weight="800" style={{ flex: 1 }}>{item.name}</Txt>
                {item.sample ? <Pill label={t('sample')} color={C.violet} /> : null}
                {item.stock <= item.perDose * 5 ? <Pill label={t('low_stock')} color={C.gold} /> : null}
                <Pressable accessibilityRole="button" accessibilityLabel={`${t('delete')} ${item.name}`} hitSlop={10} onPress={(event) => { event.stopPropagation(); confirmDelete(item); }} style={{ padding: 6 }}>
                  <Ionicons name="trash-outline" size={20} color={C.bad} />
                </Pressable>
              </View>
              <Txt size={13} color={C.muted}>{item.strength} · {item.form} · {item.times.join(', ')}</Txt>
              <Txt size={12} color={C.faint}>{item.stock} {t('pills_left')} · {item.notes}</Txt>
            </Card>
          </Pressable>
        )}
        ListEmptyComponent={<Txt color={C.muted}>{t('empty_meds')}</Txt>}
      />
      <Sheet visible={!!editing} onClose={() => setEditing(null)} title={editing && vault.meds.some((m) => m.id === editing.id) ? t('edit_med') : t('add_med')}>
        {editing ? (
          <ScrollView contentContainerStyle={{ gap: 10 }} keyboardShouldPersistTaps="handled">
            <Field label={t('med_name')} value={editing.name} onChangeText={(name) => setEditing({ ...editing, name })} placeholder={t('med_name_ph')} autoCapitalize="words" />
            <Field label={t('strength')} value={editing.strength} onChangeText={(strength) => setEditing({ ...editing, strength })} placeholder={t('strength_ph')} />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {FORMS.map((f) => (
                <Pressable key={f} onPress={() => setEditing({ ...editing, form: f })}>
                  <Pill label={f} color={editing.form === f ? C.white : C.muted} bg={editing.form === f ? C.violetDeep : C.card} />
                </Pressable>
              ))}
            </View>
            <Txt size={12} color={C.muted}>{t('times')}</Txt>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {editing.times.map((tm) => (
                <Pressable key={tm} onPress={() => setEditing({ ...editing, times: editing.times.filter((x) => x !== tm) })}>
                  <Pill label={`${tm} ×`} color={C.violet} />
                </Pressable>
              ))}
            </View>
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end' }}>
              <View style={{ flex: 1 }}>
                <Field label={t('add_time')} value={timeDraft} onChangeText={setTimeDraft} placeholder="20:00" />
              </View>
              <Btn
                label={t('add')}
                kind="soft"
                onPress={() => {
                  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(timeDraft)) { Alert.alert(t('invalid_time')); return; }
                  if (!editing.times.includes(timeDraft)) setEditing({ ...editing, times: [...editing.times, timeDraft].sort() });
                }}
              />
            </View>
            <Field label={t('stock')} value={String(editing.stock)} onChangeText={(v) => setEditing({ ...editing, stock: Number(v) || 0 })} keyboardType="number-pad" />
            <Field label={t('per_dose')} value={String(editing.perDose)} onChangeText={(v) => setEditing({ ...editing, perDose: Math.max(1, Number(v) || 1) })} keyboardType="number-pad" />
            <Pressable onPress={() => setEditing({ ...editing, withFood: !editing.withFood })} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name={editing.withFood ? 'checkbox' : 'square-outline'} size={20} color={C.mint} />
              <Txt>{t('with_food')}</Txt>
            </Pressable>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {medColors.map((c, i) => (
                <Pressable key={c} onPress={() => setEditing({ ...editing, colorIdx: i })} style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: c, borderWidth: editing.colorIdx === i ? 2 : 0, borderColor: C.white }} />
              ))}
            </View>
            <Field label={t('notes')} value={editing.notes} onChangeText={(notes) => setEditing({ ...editing, notes })} autoCapitalize="sentences" />
            <Btn
              label={t('save_med')}
              onPress={() => {
                if (editing.name.trim().length < 2) return;
                saveMed({ ...editing, name: editing.name.trim(), sample: false });
                setEditing(null);
              }}
            />
            {vault.meds.some((m) => m.id === editing.id) ? (
              <Btn
                label={t('delete')}
                kind="danger"
                onPress={() => {
                  confirmDelete(editing, true);
                }}
              />
            ) : null}
          </ScrollView>
        ) : null}
      </Sheet>
    </View>
  );
}

const mini = { backgroundColor: C.card3, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 6 };
