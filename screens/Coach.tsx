import React, { useState } from 'react';
import { FlatList, Image, Pressable, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { Btn, Card, Pill, Sheet, Txt } from '../components/ui';
import { useStore } from '../lib/store';
import { C } from '../lib/theme';
import { buildHealthContext, countLiveToday, FREE_LIVE_LIMIT, localAnalysis, runGemini } from '../lib/ai';
import { isPro, uid } from '../lib/health';
import type { PhotoKind } from '../lib/types';

export function CoachScreen() {
  const store = useStore();
  const { t, vault, settings, updateSettings, addChat, clearChat, getApiKey } = store;
  const [text, setText] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [busy, setBusy] = useState(false);
  const [consentOpen, setConsentOpen] = useState(false);
  const [pending, setPending] = useState<null | (() => void)>(null);
  const [photo, setPhoto] = useState<{ uri: string; base64: string; mime: string; kind: PhotoKind } | null>(null);
  const [err, setErr] = useState('');
  const liveLeft = Math.max(0, FREE_LIVE_LIMIT - countLiveToday(vault.chat));
  const pro = isPro(settings);

  const needsLive = settings.aiMode !== 'local';

  const askConsent = (fn: () => void) => {
    if (settings.aiConsent || settings.aiMode === 'local') {
      fn();
      return;
    }
    setPending(() => fn);
    setConsentOpen(true);
  };

  const reply = async (question: string, photoKind?: PhotoKind, image?: { base64: string; mime: string }) => {
    setBusy(true);
    setErr('');
    const prompt = buildHealthContext({
      vitals: vault.vitals,
      meds: vault.meds,
      profile: vault.profile,
      settings,
      symptoms,
      question,
      photoKind,
    });
    const local = () => {
      const note = localAnalysis({ vitals: vault.vitals, meds: vault.meds, profile: vault.profile, settings, symptoms, question, photoKind });
      addChat({ id: uid(), role: 'assistant', text: note.text, at: Date.now(), source: 'local', photoKind });
    };
    try {
      if (settings.aiMode === 'local') {
        local();
        return;
      }
      if (!pro && liveLeft <= 0) {
        setErr(t('pro_required'));
        local();
        return;
      }
      const key = settings.aiMode === 'direct' ? await getApiKey() : undefined;
      if (settings.aiMode === 'proxy' && !settings.proxyUrl.trim()) {
        setErr(t('enter_proxy_or_key'));
        local();
        return;
      }
      if (settings.aiMode === 'direct' && !key) {
        setErr(t('enter_proxy_or_key'));
        local();
        return;
      }
      const res = await runGemini({
        settings,
        apiKey: key,
        prompt,
        imageBase64: image?.base64,
        mimeType: image?.mime,
      });
      if (res.error || !res.text) {
        setErr(res.error || t('error_ai'));
        const note = localAnalysis({ vitals: vault.vitals, meds: vault.meds, profile: vault.profile, settings, symptoms, question, photoKind });
        addChat({
          id: uid(),
          role: 'assistant',
          text: `${t('fell_back')}\n\n${note.text}`,
          at: Date.now(),
          source: 'local',
          photoKind,
        });
        return;
      }
      addChat({ id: uid(), role: 'assistant', text: res.text, at: Date.now(), source: 'gemini', photoKind });
    } finally {
      setBusy(false);
    }
  };

  const send = () => {
    const q = text.trim();
    if (!q && !photo) return;
    const kind = photo?.kind;
    const image = photo ? { base64: photo.base64, mime: photo.mime } : undefined;
    addChat({ id: uid(), role: 'user', text: q || t('photo'), at: Date.now(), source: 'user', photoKind: kind });
    setText('');
    setPhoto(null);
    askConsent(() => reply(q || 'Please review the attached photo in a wellness context.', kind, image));
  };

  const analyse = () => {
    const q = symptoms.trim() ? `Analyse the last 14 days. Notes: ${symptoms}` : 'Analyse the last 14 days of shared logs.';
    addChat({ id: uid(), role: 'user', text: t('analyze_14'), at: Date.now(), source: 'user' });
    askConsent(() => reply(q));
  };

  const pick = async (camera: boolean) => {
    const perm = camera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const res = camera
      ? await ImagePicker.launchCameraAsync({ base64: true, quality: 0.4 })
      : await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.4, mediaTypes: ['images'] });
    if (res.canceled || !res.assets[0]?.base64) return;
    const asset = res.assets[0];
    setPhoto({ uri: asset.uri, base64: asset.base64!, mime: asset.mimeType || 'image/jpeg', kind: photo?.kind || 'meal' });
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <FlatList
        data={vault.chat}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 140, gap: 10 }}
        ListHeaderComponent={
          <View style={{ gap: 10, marginBottom: 8 }}>
            <Txt size={22} weight="800">
              {t('coach_title')}
            </Txt>
            <Txt size={13} color={C.muted}>
              {t('coach_sub')}
            </Txt>
            <Card style={{ backgroundColor: '#1A1228', gap: 6 }}>
              <Pill label={t('not_a_dx')} color={C.gold} />
              <Txt size={12} color={C.muted} style={{ lineHeight: 18 }}>
                {t('disclaimer')}
              </Txt>
            </Card>
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              <Pill label={needsLive ? (settings.aiMode === 'proxy' ? t('mode_proxy') : t('mode_direct')) : t('on_device')} color={needsLive ? C.mint : C.violet} />
              <Pill label={pro ? t('unlimited') : `${liveLeft} ${t('messages_left')}`} color={C.cyan} />
              <Pill label={settings.aiConsent ? t('consent_on') : t('consent_off')} color={settings.aiConsent ? C.good : C.gold} />
            </View>
            <ScrollChips
              items={[t('prompt_1'), t('prompt_2'), t('prompt_3'), t('prompt_4')]}
              onPick={(q) => {
                addChat({ id: uid(), role: 'user', text: q, at: Date.now(), source: 'user' });
                askConsent(() => reply(q));
              }}
            />
            {err ? <Txt size={12} color={C.gold}>{err}</Txt> : null}
          </View>
        }
        renderItem={({ item }) => (
          <View style={{ alignSelf: item.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '92%' }}>
            <Card style={{ backgroundColor: item.role === 'user' ? '#2A2150' : C.card, gap: 6 }}>
              <Txt size={11} color={C.faint} weight="700">
                {item.role === 'user' ? t('you') : t('coach')}
                {item.source === 'gemini' ? ` · ${t('gemini')}` : item.source === 'local' ? ` · ${t('on_device')}` : ''}
              </Txt>
              <Txt size={14} style={{ lineHeight: 21 }}>
                {item.text}
              </Txt>
              {item.role === 'assistant' ? <Pill label={t('wellness_tag')} color={C.gold} /> : null}
            </Card>
          </View>
        )}
        ListEmptyComponent={<Txt color={C.muted}>{t('empty_coach')}</Txt>}
      />
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: 12, backgroundColor: '#0C0A14EE', borderTopWidth: 1, borderColor: C.line, gap: 8 }}>
        {photo ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Image source={{ uri: photo.uri }} style={{ width: 42, height: 42, borderRadius: 8 }} />
            {(['meal', 'pack', 'document'] as PhotoKind[]).map((k) => (
              <Pressable key={k} onPress={() => setPhoto({ ...photo, kind: k })}>
                <Pill label={t(k === 'pack' ? 'photo_pack' : k === 'document' ? 'photo_doc' : 'photo_meal')} color={photo.kind === k ? C.white : C.muted} bg={photo.kind === k ? C.violetDeep : C.card} />
              </Pressable>
            ))}
            <Pressable onPress={() => setPhoto(null)}>
              <Ionicons name="close" size={18} color={C.muted} />
            </Pressable>
          </View>
        ) : null}
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end' }}>
          <Pressable onPress={() => pick(false)} style={iconBtn}>
            <Ionicons name="image-outline" size={18} color={C.violet} />
          </Pressable>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder={t('ask_ph')}
            placeholderTextColor={C.faint}
            style={{ flex: 1, color: C.text, backgroundColor: C.card, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, minHeight: 44 }}
            multiline
          />
          <Pressable onPress={send} disabled={busy} style={[iconBtn, { backgroundColor: C.violetDeep }]}>
            <Ionicons name="arrow-up" size={18} color={C.white} />
          </Pressable>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Btn label={busy ? t('thinking') : t('analyze_14')} kind="soft" onPress={analyse} disabled={busy} />
          </View>
          <Pressable onPress={() => clearChat()} style={iconBtn}>
            <Ionicons name="trash-outline" size={16} color={C.muted} />
          </Pressable>
        </View>
      </View>
      <Sheet visible={consentOpen} onClose={() => setConsentOpen(false)} title={t('consent_title')}>
        <View style={{ gap: 10 }}>
          <Txt size={13} color={C.muted} style={{ lineHeight: 20 }}>
            {t('consent_body')}
          </Txt>
          <Txt size={12} color={C.gold}>
            {t('user_privacy')}
          </Txt>
          <Toggle label={t('share_vitals')} on={settings.shareVitals} set={(v) => updateSettings({ shareVitals: v })} />
          <Toggle label={t('share_meds')} on={settings.shareMeds} set={(v) => updateSettings({ shareMeds: v })} />
          <Toggle label={t('share_profile')} on={settings.shareProfile} set={(v) => updateSettings({ shareProfile: v })} />
          <Btn
            label={t('allow_share')}
            onPress={() => {
              updateSettings({ aiConsent: true });
              setConsentOpen(false);
              const fn = pending;
              setPending(null);
              fn?.();
            }}
          />
          <Btn
            label={t('use_local')}
            kind="ghost"
            onPress={() => {
              updateSettings({ aiMode: 'local' });
              setConsentOpen(false);
              const fn = pending;
              setPending(null);
              fn?.();
            }}
          />
        </View>
      </Sheet>
    </View>
  );
}

function Toggle({ label, on, set }: { label: string; on: boolean; set: (v: boolean) => void }) {
  return (
    <Pressable onPress={() => set(!on)} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 }}>
      <Txt>{label}</Txt>
      <Ionicons name={on ? 'toggle' : 'toggle-outline'} size={28} color={on ? C.mint : C.faint} />
    </Pressable>
  );
}

function ScrollChips({ items, onPick }: { items: string[]; onPick: (s: string) => void }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {items.map((item) => (
        <Pressable key={item} onPress={() => onPick(item)} style={{ backgroundColor: C.card, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1, borderColor: C.line }}>
          <Txt size={12}>{item}</Txt>
        </Pressable>
      ))}
    </View>
  );
}

const iconBtn = { width: 44, height: 44, borderRadius: 14, backgroundColor: C.card, alignItems: 'center' as const, justifyContent: 'center' as const };
