import React, { useMemo, useState } from 'react';
import { FlatList, Linking, Pressable, ScrollView, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { Btn, Card, Field, Pill, Sheet, Txt } from '../components/ui';
import { CENTERS, DIRECTORY_AS_OF } from '../lib/centers';
import { useStore } from '../lib/store';
import { C } from '../lib/theme';
import { formatWhen, parseDateTime, toDateInput, toTimeInput, uid } from '../lib/health';
import type { Appointment, Center, VisitStatus, VisitType } from '../lib/types';

const KINDS = ['Any', ...Array.from(new Set(CENTERS.map((c) => c.kind)))];
const PROVINCES = ['Any', ...Array.from(new Set(CENTERS.map((c) => c.province)))];

export function VisitsScreen() {
  const { t, vault, saveAppointment, removeAppointment } = useStore();
  const [tab, setTab] = useState<'dir' | 'mine'>('dir');
  const [q, setQ] = useState('');
  const [kind, setKind] = useState('Any');
  const [province, setProvince] = useState('Any');
  const [district, setDistrict] = useState('Any');
  const [city, setCity] = useState('Any');
  const [specialty, setSpecialty] = useState('Any');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [svc, setSvc] = useState<'any' | 'physical' | 'tele' | 'lab'>('any');
  const [filters, setFilters] = useState(false);
  const [picked, setPicked] = useState<Center | null>(null);
  const [editing, setEditing] = useState<Appointment | null>(null);
  const [toast, setToast] = useState('');

  const districts = useMemo(() => {
    const base = CENTERS.filter((c) => province === 'Any' || c.province === province);
    return ['Any', ...Array.from(new Set(base.map((c) => c.district)))];
  }, [province]);
  const cities = useMemo(() => {
    const base = CENTERS.filter((c) => (province === 'Any' || c.province === province) && (district === 'Any' || c.district === district));
    return ['Any', ...Array.from(new Set(base.map((c) => c.city)))];
  }, [province, district]);
  const specialties = useMemo(() => ['Any', ...Array.from(new Set(CENTERS.flatMap((c) => c.specialties))).sort()], []);

  const results = useMemo(() => {
    const query = q.trim().toLowerCase();
    return CENTERS.filter((c) => {
      if (kind !== 'Any' && c.kind !== kind) return false;
      if (province !== 'Any' && c.province !== province) return false;
      if (district !== 'Any' && c.district !== district) return false;
      if (city !== 'Any' && c.city !== city) return false;
      if (specialty !== 'Any' && !c.specialties.includes(specialty)) return false;
      if (verifiedOnly && c.verification !== 'verified') return false;
      if (svc !== 'any' && !c.services.includes(svc)) return false;
      if (!query) return true;
      const blob = `${c.name} ${c.city} ${c.district} ${c.address} ${c.specialties.join(' ')}`.toLowerCase();
      return blob.includes(query);
    });
  }, [q, kind, province, district, city, specialty, verifiedOnly, svc]);

  const upcoming = vault.appointments.filter((a) => a.status === 'upcoming').sort((a, b) => a.at - b.at);
  const past = vault.appointments.filter((a) => a.status !== 'upcoming').sort((a, b) => b.at - a.at);

  const copy = async (n: string) => {
    await Clipboard.setStringAsync(n);
    setToast(t('copied_number'));
    setTimeout(() => setToast(''), 1600);
  };

  const startRecord = (center?: Center, type: VisitType = 'physical') => {
    const at = Date.now() + 86400000;
    setEditing({
      id: uid(),
      type: center?.services.includes(type) ? type : center?.services[0] || type,
      centerId: center?.id,
      centerName: center?.name || '',
      specialty: center?.specialties[0],
      at,
      status: 'upcoming',
      reminder: true,
      fee: undefined,
      notes: '',
      sample: false,
    });
    setPicked(null);
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 16, gap: 10 }}>
        <Txt size={22} weight="800">{t('visits_title')}</Txt>
        <Txt size={13} color={C.muted}>{t('visits_intro')}</Txt>
        <View style={{ flexDirection: 'row', backgroundColor: C.card, borderRadius: 14, padding: 4 }}>
          {(['dir', 'mine'] as const).map((id) => (
            <Pressable key={id} onPress={() => setTab(id)} style={{ flex: 1, padding: 10, borderRadius: 12, backgroundColor: tab === id ? C.violetDeep : 'transparent', alignItems: 'center' }}>
              <Txt size={13} weight="700">{id === 'dir' ? t('directory') : t('my_visits')}</Txt>
            </Pressable>
          ))}
        </View>
      </View>
      {tab === 'dir' ? (
        <FlatList
          data={results}
          keyExtractor={(c) => c.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 110, gap: 10 }}
          ListHeaderComponent={
            <View style={{ gap: 10, marginBottom: 4 }}>
              <Field label={t('search')} value={q} onChangeText={setQ} placeholder={t('search_ph')} autoCapitalize="words" />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Txt size={13} color={C.muted}>{results.length} {t('n_centers')} · {t('as_of')} {DIRECTORY_AS_OF}</Txt>
                <Pressable onPress={() => setFilters(true)}><Txt color={C.violet} weight="700">{t('filters')}</Txt></Pressable>
              </View>
              <Txt size={12} color={C.gold}>{t('not_live')}</Txt>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable onPress={() => setPicked(item)}>
              <Card style={{ gap: 6 }}>
                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                  <Txt weight="800" style={{ flex: 1 }}>{item.name}</Txt>
                  <Pill
                    label={item.verification === 'verified' ? t('verified') : item.verification === 'listing' ? t('listing') : t('unverified')}
                    color={item.verification === 'verified' ? C.good : item.verification === 'listing' ? C.gold : C.muted}
                  />
                </View>
                <Txt size={12} color={C.muted}>{item.kind} · {item.city}, {item.district}</Txt>
                <Txt size={12} color={C.faint} numberOfLines={1}>{item.specialties.slice(0, 3).join(' · ')}</Txt>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {item.services.map((s) => <Pill key={s} label={s === 'physical' ? t('physical') : s === 'tele' ? t('tele') : t('lab')} color={C.violet} />)}
                  {item.emergency24 ? <Pill label={t('open_24')} color={C.rose} /> : null}
                </View>
              </Card>
            </Pressable>
          )}
          ListEmptyComponent={<Txt color={C.muted}>{t('empty_dir')}</Txt>}
        />
      ) : (
        <FlatList
          data={[...upcoming, ...past]}
          keyExtractor={(a) => a.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 110, gap: 10 }}
          ListHeaderComponent={
            <View style={{ gap: 8, marginBottom: 4 }}>
              <Txt size={12} color={C.gold}>{t('booking_note')}</Txt>
              <Btn label={t('add_visit')} icon="add" onPress={() => startRecord()} />
              {vault.appointments.some((a) => a.sample) ? <Txt size={12} color={C.violet}>{t('sample_banner')}</Txt> : null}
            </View>
          }
          renderItem={({ item }) => (
            <Pressable onPress={() => setEditing(item)}>
              <Card style={{ gap: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Pill label={item.type === 'physical' ? t('physical') : item.type === 'tele' ? t('tele') : t('lab')} color={C.cyan} />
                  <Pill label={t(item.status === 'upcoming' ? 'upcoming' : item.status === 'completed' ? 'completed' : 'cancelled')} color={item.status === 'upcoming' ? C.mint : C.muted} />
                  {item.sample ? <Pill label={t('sample')} color={C.violet} /> : null}
                </View>
                <Txt weight="800">{item.centerName}</Txt>
                <Txt size={13} color={C.muted}>{formatWhen(item.at)}{item.doctor ? ` · ${item.doctor}` : ''}</Txt>
                {item.fee ? <Txt size={12} color={C.faint}>{t('fee_shown')}: LKR {item.fee.toLocaleString()} ({t('reference_fee')})</Txt> : null}
              </Card>
            </Pressable>
          )}
          ListEmptyComponent={<Txt color={C.muted}>{t('empty_apts')}</Txt>}
        />
      )}
      {toast ? (
        <View style={{ position: 'absolute', bottom: 24, alignSelf: 'center', backgroundColor: C.card3, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 99 }}>
          <Txt size={12}>{toast}</Txt>
        </View>
      ) : null}

      <Sheet visible={filters} onClose={() => setFilters(false)} title={t('filters')}>
        <ScrollView contentContainerStyle={{ gap: 10 }} style={{ maxHeight: 460 }}>
          <ChipRow label={t('kind')} value={kind} options={KINDS} onPick={setKind} />
          <ChipRow label={t('province')} value={province} options={PROVINCES} onPick={(v) => { setProvince(v); setDistrict('Any'); setCity('Any'); }} />
          <ChipRow label={t('district')} value={district} options={districts} onPick={(v) => { setDistrict(v); setCity('Any'); }} />
          <ChipRow label={t('city')} value={city} options={cities} onPick={setCity} />
          <ChipRow label={t('specialty')} value={specialty} options={specialties} onPick={setSpecialty} />
          <ChipRow label={t('services')} value={svc} options={['any', 'physical', 'tele', 'lab']} onPick={(v) => setSvc(v as typeof svc)} />
          <Pressable onPress={() => setVerifiedOnly((v) => !v)} style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <Ionicons name={verifiedOnly ? 'checkbox' : 'square-outline'} size={20} color={C.mint} />
            <Txt>{t('verified_only')}</Txt>
          </Pressable>
          <Btn label={t('apply')} onPress={() => setFilters(false)} />
          <Btn label={t('reset')} kind="ghost" onPress={() => { setKind('Any'); setProvince('Any'); setDistrict('Any'); setCity('Any'); setSpecialty('Any'); setVerifiedOnly(false); setSvc('any'); setQ(''); }} />
        </ScrollView>
      </Sheet>

      <Sheet visible={!!picked} onClose={() => setPicked(null)} title={picked?.name || ''}>
        {picked ? (
          <ScrollView contentContainerStyle={{ gap: 8 }} style={{ maxHeight: 520 }}>
            <Pill label={picked.verification === 'verified' ? t('card_verified') : picked.verification === 'listing' ? t('card_listing') : t('card_unverified')} color={picked.verification === 'verified' ? C.good : C.gold} />
            <Txt size={13} color={C.muted}>{picked.kind} · {picked.province} / {picked.district} / {picked.city}</Txt>
            <Txt>{picked.address}</Txt>
            <Txt size={13} color={C.muted}>{t('hours')}: {picked.hours}</Txt>
            {picked.phones.map((p) => (
              <View key={p.number + p.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <Txt weight="700">{p.number}</Txt>
                  <Txt size={12} color={C.faint}>{p.label}</Txt>
                </View>
                <Pressable onPress={() => Linking.openURL(`tel:${p.number}`)}><Ionicons name="call-outline" size={18} color={C.mint} /></Pressable>
                <Pressable onPress={() => copy(p.number)}><Ionicons name="copy-outline" size={18} color={C.violet} /></Pressable>
              </View>
            ))}
            {picked.website ? (
              <Pressable onPress={() => Linking.openURL(picked.website!)}>
                <Txt color={C.cyan}>{picked.website}</Txt>
              </Pressable>
            ) : null}
            <Txt size={12} color={C.muted}>{t('specs')}: {picked.specialties.join(', ')}</Txt>
            {picked.note ? <Txt size={12} color={C.gold}>{picked.note}</Txt> : null}
            <Txt size={11} color={C.faint}>{t('source')}: {picked.source || '—'} · {t('compiled')} {picked.verifiedOn || DIRECTORY_AS_OF}</Txt>
            <Txt size={12} color={C.faint}>{picked.verification === 'verified' ? t('verified_note') : picked.verification === 'listing' ? t('listing_note') : t('unverified_note')}</Txt>
            <Btn label={t('book_this')} onPress={() => startRecord(picked, picked.services.includes('physical') ? 'physical' : picked.services[0])} />
          </ScrollView>
        ) : null}
      </Sheet>

      <VisitEditor
        editing={editing}
        onClose={() => setEditing(null)}
        onSave={(a) => { saveAppointment(a); setEditing(null); }}
        onDelete={(id) => { removeAppointment(id); setEditing(null); }}
      />
    </View>
  );
}

function ChipRow({ label, value, options, onPick }: { label: string; value: string; options: string[]; onPick: (v: string) => void }) {
  return (
    <View style={{ gap: 6 }}>
      <Txt size={12} color={C.muted} weight="700">{label}</Txt>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
        {options.map((o) => (
          <Pressable key={o} onPress={() => onPick(o)} style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 99, backgroundColor: value === o ? C.violetDeep : C.card }}>
            <Txt size={12}>{o === 'Any' ? 'Any' : o === 'any' ? 'Any' : o}</Txt>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

function VisitEditor({
  editing,
  onClose,
  onSave,
  onDelete,
}: {
  editing: Appointment | null;
  onClose: () => void;
  onSave: (a: Appointment) => void;
  onDelete: (id: string) => void;
}) {
  const { t, vault } = useStore();
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [err, setErr] = useState('');
  const [local, setLocal] = useState<Appointment | null>(null);

  React.useEffect(() => {
    if (editing) {
      setLocal(editing);
      setDate(toDateInput(editing.at));
      setTime(toTimeInput(editing.at));
      setErr('');
    } else setLocal(null);
  }, [editing]);

  if (!local) return null;
  const exists = vault.appointments.some((a) => a.id === local.id);
  const set = (patch: Partial<Appointment>) => setLocal({ ...local, ...patch });

  return (
    <Sheet visible={!!editing} onClose={onClose} title={exists ? t('edit_visit') : t('new_record')}>
      <ScrollView contentContainerStyle={{ gap: 10 }} keyboardShouldPersistTaps="handled" style={{ maxHeight: 520 }}>
        <Txt size={12} color={C.gold}>{t('booking_note')}</Txt>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {(['physical', 'tele', 'lab'] as VisitType[]).map((tp) => (
            <Pressable key={tp} onPress={() => set({ type: tp })} style={{ flex: 1 }}>
              <Pill label={t(tp)} color={local.type === tp ? C.white : C.muted} bg={local.type === tp ? C.violetDeep : C.card} />
            </Pressable>
          ))}
        </View>
        <Field label={t('center_name')} value={local.centerName} onChangeText={(centerName) => set({ centerName, centerId: undefined })} autoCapitalize="words" />
        <Field label={t('doctor')} value={local.doctor || ''} onChangeText={(doctor) => set({ doctor })} placeholder={t('doctor_ph')} autoCapitalize="words" />
        <Field label={t('specialty')} value={local.specialty || ''} onChangeText={(specialty) => set({ specialty })} autoCapitalize="words" />
        <Field label={t('date_label2')} value={date} onChangeText={setDate} placeholder="2026-11-02" />
        <Field label={t('time_label2')} value={time} onChangeText={setTime} placeholder="09:30" />
        <Field label={t('fee')} value={local.fee ? String(local.fee) : ''} onChangeText={(v) => set({ fee: v ? Number(v) : undefined })} keyboardType="number-pad" placeholder={t('fee_ph')} />
        <Txt size={11} color={C.faint}>{t('fee_note')}</Txt>
        <Field label={t('ref_no')} value={local.refNo || ''} onChangeText={(refNo) => set({ refNo })} placeholder={t('ref_ph')} />
        <Field label={t('notes')} value={local.notes || ''} onChangeText={(notes) => set({ notes })} autoCapitalize="sentences" />
        <Pressable onPress={() => set({ reminder: !local.reminder })} style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <Ionicons name={local.reminder ? 'checkbox' : 'square-outline'} size={20} color={C.mint} />
          <Txt>{t('reminder_label')}</Txt>
        </Pressable>
        <Txt size={11} color={C.faint}>{t('reminder_hint')}</Txt>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {(['upcoming', 'completed', 'cancelled'] as VisitStatus[]).map((s) => (
            <Pressable key={s} onPress={() => set({ status: s })}>
              <Pill label={t(s)} color={local.status === s ? C.white : C.muted} bg={local.status === s ? C.violetDeep : C.card} />
            </Pressable>
          ))}
        </View>
        {err ? <Txt color={C.bad}>{err}</Txt> : null}
        <Btn
          label={t('save_visit')}
          onPress={() => {
            const at = parseDateTime(date, time);
            if (!at) return setErr(t('invalid_date'));
            if (local.centerName.trim().length < 2) return setErr(t('center_name'));
            onSave({ ...local, at, centerName: local.centerName.trim(), sample: false });
          }}
        />
        {exists ? <Btn label={t('delete')} kind="danger" onPress={() => onDelete(local.id)} /> : null}
      </ScrollView>
    </Sheet>
  );
}
