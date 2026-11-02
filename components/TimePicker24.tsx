import React, { useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { Txt } from './ui';
import { C } from '../lib/theme';

export function TimePicker24({ value, onChange, label }: { value: string; onChange: (value: string) => void; label: string }) {
  const [open, setOpen] = useState(false);
  const safe = /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value) ? value : '08:00';
  const [hour, minute] = safe.split(':').map(Number);
  const date = new Date(); date.setHours(hour, minute, 0, 0);
  const select = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') setOpen(false);
    if (event.type !== 'set' || !selected) return;
    onChange(`${String(selected.getHours()).padStart(2, '0')}:${String(selected.getMinutes()).padStart(2, '0')}`);
  };
  return <View style={{ gap: 6 }}>
    <Txt size={12} color={C.muted}>{label}</Txt>
    <Pressable accessibilityRole="button" accessibilityLabel={`${label}: ${safe}. Select time`} onPress={() => setOpen(!open)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.card3, padding: 12, borderRadius: 12 }}>
      <Ionicons name="time-outline" size={20} color={C.mint} /><Txt weight="700">{safe}</Txt>
      <Txt size={12} color={C.muted}>24-hour clock</Txt>
    </Pressable>
    {open ? <DateTimePicker value={date} mode="time" is24Hour display={Platform.OS === 'ios' ? 'spinner' : 'default'} onChange={select} /> : null}
    {open && Platform.OS === 'ios' ? <Pressable onPress={() => setOpen(false)}><Txt color={C.mint}>Done</Txt></Pressable> : null}
  </View>;
}
