import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, TextInput } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { Btn, Card, Sheet, Txt } from './ui';
import { createVisitBrief } from '../lib/visitBrief';
import { useStore } from '../lib/store';
import { C } from '../lib/theme';

export function VisitBrief({ open, onClose, generatedAt }: { open: boolean; onClose: () => void; generatedAt: number }) {
  const { t, vault } = useStore();
  const [includeVitals, setVitals] = useState(true);
  const [includeMeds, setMeds] = useState(true);
  const [notes, setNotes] = useState('');
  const brief = createVisitBrief(vault, t, { includeVitals, includeMeds, notes, generatedAt });
  const choice = (label: string, value: boolean, set: (v: boolean) => void) => (
    <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: value }} onPress={() => set(!value)} style={{ flexDirection: 'row', gap: 10, alignItems: 'center', paddingVertical: 6 }}>
      <Ionicons name={value ? 'checkbox' : 'square-outline'} size={22} color={value ? C.mint : C.muted} />
      <Txt>{label}</Txt>
    </Pressable>
  );
  return (
    <Sheet visible={open} onClose={onClose} title={t('brief_title')}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 10 }}>
        <Txt size={13} color={C.muted}>{t('brief_intro')}</Txt>
        {choice(t('brief_vitals'), includeVitals, setVitals)}
        {choice(t('brief_medicines'), includeMeds, setMeds)}
        <Txt size={12} color={C.muted}>{t('brief_questions')}</Txt>
        <TextInput multiline maxLength={2000} value={notes} onChangeText={setNotes} placeholder={t('brief_notes_placeholder')} placeholderTextColor={C.faint} style={{ color: C.text, backgroundColor: C.card, borderRadius: 12, minHeight: 82, padding: 12, textAlignVertical: 'top' }} />
        <Txt weight="700">{t('brief_preview')}</Txt>
        <Card><Txt size={13} style={{ lineHeight: 20 }}>{brief}</Txt></Card>
        <Txt size={12} color={C.gold}>{t('brief_clipboard_warning')}</Txt>
        <Btn label={t('brief_copy')} icon="copy-outline" onPress={async () => {
          try { await Clipboard.setStringAsync(brief); Alert.alert(t('brief_copied'), t('brief_clipboard_warning')); }
          catch { Alert.alert(t('failed')); }
        }} />
      </ScrollView>
    </Sheet>
  );
}
