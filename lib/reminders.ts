import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import type { Med } from './types';

const CHANNEL = 'medication-reminders';
const PREFIX = 'aura-medication:';
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
      sound: 'default',
    });
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
      desired.set(`${PREFIX}${med.id}:${time}`, { hour, minute });
    }
    for (const item of existing) if (!desired.has(item.identifier)) {
      await Notifications.cancelScheduledNotificationAsync(item.identifier);
    }
    const existingIds = new Set(existing.map((item) => item.identifier));
    for (const [identifier, time] of desired) if (!existingIds.has(identifier)) {
      await Notifications.scheduleNotificationAsync({
        identifier,
        content: { title: 'Medication reminder', body: 'It is time to check your medication schedule in AuraHealth Pro.', sound: 'default' },
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
}
