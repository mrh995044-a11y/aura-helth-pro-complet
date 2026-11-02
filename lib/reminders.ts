import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import type { Med } from './types';

const CHANNEL = 'medication-alarm-v2';
const SOUND = 'medication_alarm.wav';
const PREFIX = 'aura-medication:';
const VERSIONED_PREFIX = `${PREFIX}v2:`;
let pending: Promise<void> = Promise.resolve();

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
  });
}

async function channel() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL, {
      name: 'Medication reminders',
      importance: Notifications.AndroidImportance.HIGH,
      sound: SOUND,
      audioAttributes: { usage: Notifications.AndroidAudioUsage.ALARM, contentType: Notifications.AndroidAudioContentType.SONIFICATION },
      enableVibrate: true,
      vibrationPattern: [0, 300, 200, 300],
    });
  }
}

async function ensureAudibleChannel() {
  if (Platform.OS !== 'android') return;
  const current = await Notifications.getNotificationChannelAsync(CHANNEL);
  if (current && (current.importance === Notifications.AndroidImportance.NONE || current.sound === null)) {
    throw new Error('The medication alarm channel is muted or blocked. Open device app settings and enable sound for Medication reminders.');
  }
}

// Serialize reconciliation so a rapid edit or sign-out cannot leave stale alarms.
export function syncMedicationReminders(meds: Med[]): Promise<void> {
  const snapshot = meds.filter((med) => !med.sample).map((med) => ({ ...med, times: [...med.times] }));
  const job = pending.catch(() => {}).then(async () => {
    if (Platform.OS === 'web') return;
    await channel();
    const granted = (await Notifications.getPermissionsAsync()).granted;
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const existing = scheduled.filter((item) => item.identifier.startsWith(PREFIX));
    const desired = new Map<string, { hour: number; minute: number }>();
    if (granted) for (const med of snapshot) for (const time of med.times) {
      if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time)) continue;
      const [hour, minute] = time.split(':').map(Number);
      desired.set(`${VERSIONED_PREFIX}${med.id}:${time}`, { hour, minute });
    }
    for (const item of existing) if (!desired.has(item.identifier)) {
      await Notifications.cancelScheduledNotificationAsync(item.identifier);
    }
    const existingIds = new Set(existing.map((item) => item.identifier));
    for (const [identifier, time] of desired) if (!existingIds.has(identifier)) {
      await Notifications.scheduleNotificationAsync({
        identifier,
        content: { title: 'Medication reminder', body: 'It is time to check your medication schedule in AuraHealth Pro.', sound: SOUND },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, channelId: CHANNEL, ...time },
      });
    }
  });
  pending = job;
  return job;
}

export async function enableMedicationReminders(meds: Med[]): Promise<void> {
  if (Platform.OS === 'web') throw new Error('Medication reminders are available in the installed mobile app.');
  await channel();
  const permission = await Notifications.requestPermissionsAsync();
  if (!permission.granted) throw new Error('Notifications are blocked. Allow them in your device settings and try again.');
  await syncMedicationReminders(meds);
  await ensureAudibleChannel();
}

// An audible one-off test; this is not evidence that future daily alarms will
// survive every device's battery, alarm, or notification settings.
export async function testMedicationAlarm(): Promise<void> {
  if (Platform.OS === 'web') throw new Error('Medication alarms are available in the installed mobile app.');
  await channel();
  const permission = await Notifications.requestPermissionsAsync();
  if (!permission.granted) throw new Error('Notifications are blocked. Allow them in device settings.');
  await ensureAudibleChannel();
  await Notifications.scheduleNotificationAsync({
    identifier: 'aura-medication-test',
    content: { title: 'Medication alarm test', body: 'This is a test of your AuraHealth Pro medication alarm.', sound: SOUND },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 10, channelId: CHANNEL },
  });
}

const BEDTIME_PREFIX = 'aura-bedtime:';
let bedtimePending: Promise<void> = Promise.resolve();

export function syncBedtimeReminder(time: string): Promise<void> {
  const job = bedtimePending.catch(() => {}).then(async () => {
    if (Platform.OS === 'web') return;
    await channel();
    const granted = (await Notifications.getPermissionsAsync()).granted;
    const valid = /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time);
    const identifier = granted && valid ? `${BEDTIME_PREFIX}${time}` : '';
    const existing = (await Notifications.getAllScheduledNotificationsAsync()).filter(item => item.identifier.startsWith(BEDTIME_PREFIX));
    for (const item of existing) if (item.identifier !== identifier) await Notifications.cancelScheduledNotificationAsync(item.identifier);
    if (identifier && !existing.some(item => item.identifier === identifier)) {
      const [hour, minute] = time.split(':').map(Number);
      await Notifications.scheduleNotificationAsync({
        identifier,
        content: { title: 'Bedtime reminder', body: 'It is time to start your bedtime routine.', sound: SOUND },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, channelId: CHANNEL, hour, minute },
      });
    }
  });
  bedtimePending = job;
  return job;
}

export async function enableBedtimeReminder(time: string): Promise<void> {
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new Error('Enter a valid time in 24-hour format, such as 22:00.');
  if (Platform.OS === 'web') throw new Error('Bedtime reminders are available in the installed mobile app.');
  await channel();
  const permission = await Notifications.requestPermissionsAsync();
  if (!permission.granted) throw new Error('Notifications are blocked. Allow them in device settings.');
  await ensureAudibleChannel();
  await syncBedtimeReminder(time);
}
